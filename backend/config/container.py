from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import UTC, datetime
from functools import cache

from django.conf import settings

from providers.http import make_client
from providers.routing.port import AttributionSource
from providers.routing.tomtom import TOMTOM_READ_TIMEOUT_S, TomTomAttribution, TomTomRouting
from providers.routing.valhalla import READ_TIMEOUT_S as VALHALLA_READ_TIMEOUT_S
from providers.routing.valhalla import RequestLimiter, ValhallaRouting
from providers.timezone.offline import OfflineTimeZoneLookup
from providers.weather.cache import WindowCache
from providers.weather.open_meteo import OPEN_METEO_READ_TIMEOUT_S, OpenMeteoWeather
from services.daily_guard import DailyCallGuard
from services.environment import TripEnvironment
from services.trip_runner import TripRunner

PARALLEL_CALL_THREADS = 8


@dataclass(frozen=True, slots=True)
class Providers:
    """Everything a request needs from outside. Tests replace the whole bundle with fakes."""

    trips: TripEnvironment
    attribution: AttributionSource
    clock: Callable[[], datetime]
    trip_runner: TripRunner = field(default_factory=TripRunner)


def utc_now() -> datetime:
    return datetime.now(UTC)


@cache
def providers() -> Providers:
    """The real providers, built once per process so their pools, cache and limits are shared."""
    tomtom_client = make_client(TOMTOM_READ_TIMEOUT_S)
    return Providers(
        trips=TripEnvironment(
            routing=TomTomRouting(settings.TOMTOM_API_KEY, tomtom_client),
            backup_routing=ValhallaRouting(
                make_client(VALHALLA_READ_TIMEOUT_S), settings.VALHALLA_BASE_URL, RequestLimiter()
            ),
            call_guard=DailyCallGuard(settings.TOMTOM_DAILY_CALL_LIMIT, utc_now),
            weather=OpenMeteoWeather(
                settings.OPEN_METEO_BASE_URL,
                make_client(OPEN_METEO_READ_TIMEOUT_S),
                WindowCache(utc_now),
                utc_now,
            ),
            timezone=OfflineTimeZoneLookup(),
            executor=ThreadPoolExecutor(PARALLEL_CALL_THREADS, thread_name_prefix="provider-call"),
            clock=utc_now,
        ),
        attribution=TomTomAttribution(settings.TOMTOM_API_KEY, tomtom_client),
        clock=utc_now,
    )
