from dataclasses import replace
from datetime import timedelta
from typing import Any

from domain.types import CheckpointSpacing, GeoPoint, HourlyWeather, ProviderRoute
from providers.routing.port import RoutePreference, RoutingProviderName
from services.environment import TripEnvironment
from services.trip_request import TripRequest
from tests.fakes.bundle import CHICAGO, DENVER, FIRST_WEATHER_HOUR, NOW, default_fakes
from tests.fakes.routing import FakeRouting, straight_route
from tests.fakes.weather import calm_weather

ORIGIN = GeoPoint(40.0, -100.0)
DESTINATION = GeoPoint(40.0, -90.0)
STORM_LATITUDE = 40.5


def trip_request(
    spacing_miles: CheckpointSpacing = CheckpointSpacing.TWENTY_FIVE_MILES, load_lb: int = 30_000
) -> TripRequest:
    return TripRequest(ORIGIN, DESTINATION, NOW + timedelta(hours=3), load_lb, spacing_miles)


def route_bent(bend_lat: float, distance_miles: int = 100) -> ProviderRoute:
    """Routes with different bends follow different roads; bend 0 is the straight line."""
    return straight_route(ORIGIN, DESTINATION, distance_miles, bend_lat)


def storm_north_of_the_straight_route(point: GeoPoint) -> HourlyWeather:
    """Wind of 60 mph (No Travel) wherever the latitude is above the straight route's."""
    wind = "60" if point.lat > STORM_LATITUDE else "5"
    return calm_weather(FIRST_WEATHER_HOUR, wind=wind)


def tomtom_answering(
    fastest: tuple[ProviderRoute, ...], eco: tuple[ProviderRoute, ...] = ()
) -> FakeRouting:
    return FakeRouting({RoutePreference.FASTEST: fastest, RoutePreference.ECO: eco})


def trip_environment(**changes: Any) -> TripEnvironment:
    """Fakes whose providers each answer with one route; pass replacements by field name."""
    defaults: dict[str, Any] = {
        "routing": tomtom_answering((route_bent(0.0),)),
        "backup_routing": FakeRouting(
            {RoutePreference.FASTEST: (route_bent(0.2),)}, RoutingProviderName.VALHALLA
        ),
    }
    return replace(default_fakes().trips, **{**defaults, **changes})


def trip_body(**overrides: Any) -> dict[str, Any]:
    """A valid request body as the browser would send it."""
    body: dict[str, Any] = {
        "origin": {"lat": CHICAGO.lat, "lon": CHICAGO.lon, "label": "Chicago, IL"},
        "destination": {"lat": DENVER.lat, "lon": DENVER.lon, "label": "Denver, CO"},
        "departure_utc": (NOW + timedelta(hours=3)).isoformat(),
        "load_lb": 30_000,
    }
    return {**body, **overrides}
