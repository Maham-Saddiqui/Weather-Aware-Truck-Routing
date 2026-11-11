from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import cache

from django.conf import settings

from domain.types import GeoPoint
from providers.http import make_client
from providers.routing.port import AttributionSource, RoutingProvider
from providers.routing.tomtom import TOMTOM_READ_TIMEOUT_S, TomTomAttribution, TomTomRouting
from providers.timezone.port import TimeZoneLookup
from providers.weather.cache import WindowCache
from providers.weather.open_meteo import OPEN_METEO_READ_TIMEOUT_S, OpenMeteoWeather
from providers.weather.port import WeatherProvider


@dataclass(frozen=True, slots=True)
class Providers:
    """Everything a request needs from outside. Tests replace the whole bundle with fakes."""

    routing: RoutingProvider
    attribution: AttributionSource
    weather: WeatherProvider
    timezone: TimeZoneLookup
    clock: Callable[[], datetime]


class PendingTimeZone:
    def zone_name(self, point: GeoPoint) -> str:
        raise NotImplementedError("The offline time-zone adapter is wired in after Track A merges")


def utc_now() -> datetime:
    return datetime.now(UTC)


@cache
def providers() -> Providers:
    """The real providers, built once per process so their pools, cache and limits are shared."""
    tomtom_client = make_client(TOMTOM_READ_TIMEOUT_S)
    return Providers(
        routing=TomTomRouting(settings.TOMTOM_API_KEY, tomtom_client),
        attribution=TomTomAttribution(settings.TOMTOM_API_KEY, tomtom_client),
        weather=OpenMeteoWeather(
            settings.OPEN_METEO_BASE_URL,
            make_client(OPEN_METEO_READ_TIMEOUT_S),
            WindowCache(utc_now),
            utc_now,
        ),
        timezone=PendingTimeZone(),
        clock=utc_now,
    )
