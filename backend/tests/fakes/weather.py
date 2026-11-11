from collections.abc import Callable, Mapping, Sequence
from datetime import datetime
from decimal import Decimal

from domain.types import GeoPoint, HourlyWeather
from providers.weather.port import WeatherError

WINDOW_HOURS = 240


def calm_weather(first_hour_utc: datetime, wind: str = "5", rain: str = "0") -> HourlyWeather:
    """A window with the same synthetic reading every hour."""
    return HourlyWeather(
        first_hour_utc=first_hour_utc,
        wind_mph=(Decimal(wind),) * WINDOW_HOURS,
        gust_mph=(Decimal(wind) + 5,) * WINDOW_HOURS,
        rain_in=(Decimal(rain),) * WINDOW_HOURS,
        snow_in=(Decimal(0),) * WINDOW_HOURS,
    )


class FakeWeather:
    """Answers each requested point with `window_at(point)`; None leaves the point absent."""

    def __init__(
        self,
        window_at: Callable[[GeoPoint], HourlyWeather | None],
        failure: WeatherError | None = None,
    ) -> None:
        self.window_at = window_at
        self.failure = failure
        self.calls: list[Sequence[GeoPoint]] = []

    @classmethod
    def uniform(cls, window: HourlyWeather) -> "FakeWeather":
        return cls(lambda point: window)

    def forecast(self, points: Sequence[GeoPoint]) -> Mapping[GeoPoint, HourlyWeather]:
        self.calls.append(tuple(points))
        if self.failure is not None:
            raise self.failure
        windows = {point: self.window_at(point) for point in points}
        return {point: window for point, window in windows.items() if window is not None}
