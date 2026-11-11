"""Run the real server with synthetic routing and weather, for a local end-to-end rehearsal.

Usage, from the repository root:  cd backend && uv run python ../scripts/run_fake_server.py
Never calls the network: routes are invented lines between the two places and a storm drifts across
the middle of the country, so ratings, ranking and the heatmap slider all have something to show.
"""
import math
import os
import sys
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_SECRET_KEY", "local-rehearsal-only")
os.environ.setdefault("DJANGO_DEBUG", "true")
os.environ.setdefault("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
ALLOWED_DEV_PORTS = range(5173, 5180)
os.environ.setdefault(
    "ALLOWED_ORIGINS",
    ",".join(f"http://{host}:{port}" for port in ALLOWED_DEV_PORTS for host in ("localhost", "127.0.0.1")),
)

from concurrent.futures import ThreadPoolExecutor

from django.core.management import execute_from_command_line

from config import container
from domain.types import GeoPoint, HourlyWeather, ProviderRoute
from providers.routing.port import RoutePreference, RouteQuery, RoutingProviderName
from services.environment import TripEnvironment
from tests.fakes.bundle import FakeAttribution, FakeCallGuard, FakeTimeZone
from tests.fakes.routing import straight_route
from tests.fakes.weather import WINDOW_HOURS, FakeWeather

ROAD_FACTOR = 1.2
BENDS_DEG = (0.0, 2.5, -2.5)
STORM_LON = -98.0
STORM_LAT = 40.5
STORM_WIDTH_DEG = 7.0
STORM_HEIGHT_DEG = 5.0
STORM_PEAK_HOUR = 24
STORM_HOURS = 10


def utc_now() -> datetime:
    return datetime.now(UTC)


def miles_between(start: GeoPoint, end: GeoPoint) -> int:
    dlat, dlon = math.radians(end.lat - start.lat), math.radians(end.lon - start.lon)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(start.lat)) * math.cos(math.radians(end.lat)) * math.sin(dlon / 2) ** 2
    return round(2 * 3958.8 * math.asin(math.sqrt(a)) * ROAD_FACTOR)


class ScenarioRouting:
    name = RoutingProviderName.TOMTOM

    def routes(self, query: RouteQuery) -> tuple[ProviderRoute, ...]:
        miles = miles_between(query.origin, query.destination)
        if query.preference is RoutePreference.ECO:
            return (straight_route(query.origin, query.destination, miles + 15, BENDS_DEG[2]),)
        return tuple(
            straight_route(query.origin, query.destination, miles + extra, bend)
            for extra, bend in zip((0, 10), BENDS_DEG, strict=False)
        )


def storm_window(point: GeoPoint, first_hour: datetime) -> HourlyWeather:
    nearness = max(0.0, 1 - abs(point.lon - STORM_LON) / STORM_WIDTH_DEG) * max(
        0.0, 1 - abs(point.lat - STORM_LAT) / STORM_HEIGHT_DEG
    )
    winds = tuple(
        Decimal(round(8 + 52 * nearness * max(0.0, 1 - abs(hour - STORM_PEAK_HOUR) / STORM_HOURS)))
        for hour in range(WINDOW_HOURS)
    )
    rain = tuple(Decimal("0.3") if wind > 40 else Decimal(0) for wind in winds)
    return HourlyWeather(first_hour, winds, winds, rain, (Decimal(0),) * WINDOW_HOURS)


def scenario() -> container.Providers:
    first_hour = utc_now().replace(minute=0, second=0, microsecond=0)
    return container.Providers(
        trips=TripEnvironment(
            routing=ScenarioRouting(),
            backup_routing=ScenarioRouting(),
            call_guard=FakeCallGuard(),
            weather=FakeWeather(lambda point: storm_window(point, first_hour)),
            timezone=FakeTimeZone("America/Chicago"),
            executor=ThreadPoolExecutor(4),
            clock=utc_now,
        ),
        attribution=FakeAttribution("Synthetic routing credit"),
        clock=utc_now,
    )


if __name__ == "__main__":
    bundle = scenario()
    setattr(container, "providers", lambda: bundle)
    port = os.environ.get("FAKE_SERVER_PORT", "8000")
    execute_from_command_line(["manage.py", "runserver", f"127.0.0.1:{port}", "--noreload"])
