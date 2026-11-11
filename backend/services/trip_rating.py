from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

from domain.checkpoints import Stop, plan_stops
from domain.dedupe import route_id
from domain.heatmap import cell_of, risk_digits
from domain.rating import measurements_at, rate_checkpoint
from domain.summary import RatedStop, summarize
from domain.types import GeoPoint, HourlyWeather, ProviderRoute
from providers.timezone.port import TimeZoneLookup
from providers.weather.port import WeatherBusy, WeatherError
from services.environment import TripEnvironment
from services.results import (
    Heatmap,
    HeatmapPoint,
    RatedCheckpoint,
    RatedRoute,
    WeatherStatus,
)
from services.trip_request import TripRequest

# Heatmap points every 25 miles along each route (architecture section 7).
HEATMAP_GRID_MILES = 25

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
    planned = [(route, _stops(route, request.spacing_miles, request)) for route in routes]
    grid_cells = _unique_cells(
        stop.position for route in routes for stop in _stops(route, HEATMAP_GRID_MILES, request)
    )
    checkpoint_cells = _unique_cells(stop.position for _, stops in planned for stop in stops)
    windows, failure = _fetch_weather(env, [*checkpoint_cells, *grid_cells])
    rater = _Rater(windows, env.timezone, request)
    rated = tuple(rater.rate_route(route, stops) for route, stops in planned)
    return RatedTrip(
        routes=rated,
        heatmap=Heatmap(request.departure_utc, rater.heatmap_points(grid_cells)),
        weather_status=failure or _status_from_ratings(rated),
    )


def _stops(route: ProviderRoute, spacing_miles: int, request: TripRequest) -> tuple[Stop, ...]:
    return plan_stops(route, spacing_miles, request.departure_utc)


def _unique_cells(positions: Iterable[GeoPoint]) -> tuple[GeoPoint, ...]:
    return tuple(dict.fromkeys(cell_of(position) for position in positions))


def _fetch_weather(
    env: TripEnvironment, cells: Sequence[GeoPoint]
) -> tuple[Windows, WeatherStatus | None]:
    try:
        return env.weather.forecast(tuple(dict.fromkeys(cells))), None
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

    def rate_route(self, route: ProviderRoute, stops: Sequence[Stop]) -> RatedRoute:
        checkpoints = tuple(self._rate_stop(stop) for stop in stops)
        rated_stops = [RatedStop(c.stop, c.rating) for c in checkpoints]
        summary = summarize(rated_stops, route.travel_time_s, self.request.departure_utc)
        return RatedRoute(route_id(route.geometry), route, checkpoints, summary)

    def heatmap_points(self, cells: Sequence[GeoPoint]) -> tuple[HeatmapPoint, ...]:
        request = self.request
        return tuple(
            HeatmapPoint(
                cell, risk_digits(self.windows.get(cell), request.departure_utc, request.load_lb)
            )
            for cell in cells
        )

    def _rate_stop(self, stop: Stop) -> RatedCheckpoint:
        window = self.windows.get(cell_of(stop.position))
        measurements = measurements_at(window, stop.eta_utc)
        rating = rate_checkpoint(measurements, self.request.load_lb)
        return RatedCheckpoint(stop, measurements, rating, self.timezone.zone_name(stop.position))
