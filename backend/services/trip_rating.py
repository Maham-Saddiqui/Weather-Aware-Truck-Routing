from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

from domain.checkpoints import Checkpoint, plan_checkpoints
from domain.dedupe import route_id
from domain.heatmap import cell_of, risk_digits
from domain.rating import measurements_at, rate_checkpoint
from domain.summary import RatedCheckpoint, summarize
from domain.types import CheckpointSpacing, GeoPoint, HourlyWeather, ProviderRoute
from providers.timezone.port import TimeZoneLookup
from providers.trip_notes import current_notes, stage
from providers.weather.port import WeatherBusy, WeatherError
from services.environment import TripEnvironment
from services.results import (
    Heatmap,
    HeatmapPoint,
    RatedRoute,
    RouteCheckpoint,
    WeatherStatus,
)
from services.trip_request import TripRequest

# Heatmap points every 25 miles along each route (architecture section 7).
HEATMAP_GRID_SPACING = CheckpointSpacing.TWENTY_FIVE_MILES

type Windows = Mapping[GeoPoint, HourlyWeather]


@dataclass(frozen=True, slots=True)
class RatedTrip:
    routes: tuple[RatedRoute, ...]
    heatmap: Heatmap
    weather_status: WeatherStatus


def rate_routes(
    env: TripEnvironment, request: TripRequest, routes: Sequence[ProviderRoute]
) -> RatedTrip:
    """One batched weather call for every checkpoint and heatmap cell of every route (PERF-01)."""
    with stage("rating"):
        planned = _plans(routes, request.spacing_miles, request)
        grid_cells = _unique_cells(_positions(_grid_plans(planned, request)))
        cells = tuple(dict.fromkeys([*_unique_cells(_positions(planned)), *grid_cells]))
    with stage("weather"):
        windows, failure = _fetch_weather(env, cells)
    with stage("rating"):
        rater = _Rater(windows, env.timezone, request)
        rated = tuple(rater.rate_route(route, checkpoints) for route, checkpoints in planned)
        heatmap = Heatmap(request.departure_utc, rater.heatmap_points(grid_cells))
    status = failure or _status_from_ratings(rated)
    _note_rating(rated, status, cells, windows)
    return RatedTrip(rated, heatmap, status)


type Plans = list[tuple[ProviderRoute, tuple[Checkpoint, ...]]]


def _positions(plans: Plans) -> Iterable[GeoPoint]:
    return (checkpoint.position for _, checkpoints in plans for checkpoint in checkpoints)


def _note_rating(
    routes: Sequence[RatedRoute], status: WeatherStatus, cells: Sequence[GeoPoint], windows: Windows
) -> None:
    levels = [c.rating.level for route in routes for c in route.checkpoints]
    notes = current_notes()
    notes.routes = len(routes)
    notes.weather_status = status.value
    notes.checkpoints = len(levels)
    notes.checkpoints_rated = sum(level is not None for level in levels)
    notes.cells_requested = len(cells)
    notes.cells_missing = sum(cell not in windows for cell in cells)


def _plans(
    routes: Sequence[ProviderRoute], spacing_miles: CheckpointSpacing, request: TripRequest
) -> Plans:
    return [
        (route, plan_checkpoints(route, spacing_miles, request.departure_utc)) for route in routes
    ]


def _grid_plans(planned: Plans, request: TripRequest) -> Plans:
    """Planned once more only when the driver's spacing differs from the heatmap's."""
    if request.spacing_miles == HEATMAP_GRID_SPACING:
        return planned
    return _plans([route for route, _ in planned], HEATMAP_GRID_SPACING, request)


def _unique_cells(positions: Iterable[GeoPoint]) -> tuple[GeoPoint, ...]:
    return tuple(dict.fromkeys(cell_of(position) for position in positions))


def _fetch_weather(
    env: TripEnvironment, cells: Sequence[GeoPoint]
) -> tuple[Windows, WeatherStatus | None]:
    try:
        return env.weather.forecast(tuple(cells)), None
    except WeatherError as error:
        busy = isinstance(error, WeatherBusy)
        return {}, WeatherStatus.BUSY if busy else WeatherStatus.UNAVAILABLE


def _status_from_ratings(routes: Sequence[RatedRoute]) -> WeatherStatus:
    """ok = every checkpoint has data, unavailable = none has (RR-11, RR-23)."""
    levels = [c.rating.level for route in routes for c in route.checkpoints]
    if all(level is None for level in levels):
        return WeatherStatus.UNAVAILABLE
    if any(level is None for level in levels):
        return WeatherStatus.PARTIAL
    return WeatherStatus.OK


@dataclass(frozen=True, slots=True)
class _Rater:
    windows: Windows
    timezone: TimeZoneLookup
    request: TripRequest

    def rate_route(self, route: ProviderRoute, checkpoints: Sequence[Checkpoint]) -> RatedRoute:
        route_checkpoints = tuple(self._rate_checkpoint(checkpoint) for checkpoint in checkpoints)
        rated_checkpoints = [RatedCheckpoint(c.checkpoint, c.rating) for c in route_checkpoints]
        summary = summarize(rated_checkpoints, route.travel_time_s, self.request.departure_utc)
        return RatedRoute(route_id(route.geometry), route, route_checkpoints, summary)

    def heatmap_points(self, cells: Sequence[GeoPoint]) -> tuple[HeatmapPoint, ...]:
        request = self.request
        return tuple(
            HeatmapPoint(
                cell, risk_digits(self.windows.get(cell), request.departure_utc, request.load_lb)
            )
            for cell in cells
        )

    def _rate_checkpoint(self, checkpoint: Checkpoint) -> RouteCheckpoint:
        window = self.windows.get(cell_of(checkpoint.position))
        measurements = measurements_at(window, checkpoint.eta_utc)
        rating = rate_checkpoint(measurements, self.request.load_lb)
        zone_name = self.timezone.zone_name(checkpoint.position)
        return RouteCheckpoint(checkpoint, measurements, rating, zone_name)
