from collections.abc import Collection, Mapping, Sequence
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
    """Gives every requested point the same window, except the ones listed as missing."""

    def __init__(
        self,
        window: HourlyWeather,
        failure: WeatherError | None = None,
        missing: Collection[GeoPoint] = (),
    ) -> None:
        self.window = window
        self.failure = failure
        self.missing = set(missing)
        self.calls: list[Sequence[GeoPoint]] = []

    def forecast(self, points: Sequence[GeoPoint]) -> Mapping[GeoPoint, HourlyWeather]:
        self.calls.append(tuple(points))
        if self.failure is not None:
            raise self.failure
        return {point: self.window for point in points if point not in self.missing}
