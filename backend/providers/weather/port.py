from collections.abc import Mapping, Sequence
from typing import Protocol

from domain.types import GeoPoint, HourlyWeather


class WeatherError(Exception):
    """Base of every weather failure; adapters raise only its two subclasses."""


class WeatherBusy(WeatherError):
    """The weather service answered "too many requests" (architecture section 7)."""


class WeatherUnavailable(WeatherError):
    """Timeout, server error or unreadable answer."""


class WeatherProvider(Protocol):
    def forecast(self, points: Sequence[GeoPoint]) -> Mapping[GeoPoint, HourlyWeather]:
        """One window per requested point; a point with no data is simply absent."""
        ...
