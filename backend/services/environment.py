from concurrent.futures import Executor
from dataclasses import dataclass
from typing import Protocol

from providers.routing.port import RoutingProvider
from providers.timezone.port import TimeZoneLookup
from providers.weather.port import WeatherProvider


class CallGuard(Protocol):
    def try_acquire(self) -> bool:
        """Counts one TomTom call; False means the daily budget is spent and the backup is used."""
        ...


@dataclass(frozen=True, slots=True)
class TripEnvironment:
    """Everything a trip service needs from outside. Tests replace all of it with fakes."""

    routing: RoutingProvider
    backup_routing: RoutingProvider
    call_guard: CallGuard
    weather: WeatherProvider
    timezone: TimeZoneLookup
    executor: Executor
