from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any

import pytest
from django.core.cache import cache

from config import container
from config.container import Providers
from domain.types import GeoPoint
from providers.routing.port import RoutingProviderName
from services.environment import TripEnvironment
from tests.fakes.routing import FakeRouting
from tests.fakes.weather import FakeWeather, calm_weather

NOW = datetime(2026, 11, 11, 14, 25, tzinfo=UTC)
FIRST_WEATHER_HOUR = NOW.replace(minute=0)
CHICAGO = GeoPoint(41.8781, -87.6298)
DENVER = GeoPoint(39.7392, -104.9903)
EXECUTOR = ThreadPoolExecutor(4)


class FakeTimeZone:
    def __init__(self, zone: str = "America/Chicago") -> None:
        self.zone = zone

    def zone_name(self, point: GeoPoint) -> str:
        return self.zone


class FakeAttribution:
    def __init__(self, text: str = "Synthetic credit", failure: Exception | None = None) -> None:
        self.text = text
        self.failure = failure
        self.calls = 0

    def routing_copyright(self) -> str:
        self.calls += 1
        if self.failure is not None:
            raise self.failure
        return self.text


def fixed_clock() -> datetime:
    return NOW


class FakeCallGuard:
    def __init__(self, *, allowed: bool = True) -> None:
        self.allowed = allowed
        self.acquired = 0

    def try_acquire(self) -> bool:
        self.acquired += 1
        return self.allowed


def default_fakes() -> Providers:
    return Providers(
        trips=TripEnvironment(
            routing=FakeRouting({}),
            backup_routing=FakeRouting({}, RoutingProviderName.VALHALLA),
            call_guard=FakeCallGuard(),
            weather=FakeWeather.uniform(calm_weather(FIRST_WEATHER_HOUR)),
            timezone=FakeTimeZone(),
            executor=EXECUTOR,
            clock=fixed_clock,
        ),
        attribution=FakeAttribution(),
        clock=fixed_clock,
    )


def with_trips(bundle: Providers, **changes: Any) -> Providers:
    return replace(bundle, trips=replace(bundle.trips, **changes))


def install_fakes(monkeypatch: pytest.MonkeyPatch, bundle: Providers) -> Providers:
    """Makes the views use the fakes and gives the test fresh throttle counters."""
    monkeypatch.setattr(container, "providers", lambda: bundle)
    cache.clear()
    return bundle
