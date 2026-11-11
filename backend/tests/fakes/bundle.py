from datetime import UTC, datetime

import pytest
from django.core.cache import cache

from config import container
from config.container import Providers
from domain.types import GeoPoint
from tests.fakes.routing import FakeRouting
from tests.fakes.weather import FakeWeather, calm_weather

NOW = datetime(2026, 11, 11, 14, 25, tzinfo=UTC)
FIRST_WEATHER_HOUR = NOW.replace(minute=0)
CHICAGO = GeoPoint(41.8781, -87.6298)
DENVER = GeoPoint(39.7392, -104.9903)


class FakeTimeZone:
    def __init__(self, zone: str = "America/Chicago") -> None:
        self.zone = zone

    def zone_name(self, point: GeoPoint) -> str:
        return self.zone


class FakeAttribution:
    def __init__(self, text: str = "Synthetic credit", failure: Exception | None = None) -> None:
        self.text = text
        self.failure = failure

    def routing_copyright(self) -> str:
        if self.failure is not None:
            raise self.failure
        return self.text


def fixed_clock() -> datetime:
    return NOW


def default_fakes() -> Providers:
    return Providers(
        routing=FakeRouting({}),
        attribution=FakeAttribution(),
        weather=FakeWeather(calm_weather(FIRST_WEATHER_HOUR)),
        timezone=FakeTimeZone(),
        clock=fixed_clock,
    )


def install_fakes(monkeypatch: pytest.MonkeyPatch, bundle: Providers) -> Providers:
    """Makes the views use the fakes and gives the test fresh throttle counters."""
    monkeypatch.setattr(container, "providers", lambda: bundle)
    cache.clear()
    return bundle
