from datetime import UTC, datetime
from decimal import Decimal

from domain.levels import Level
from domain.rating import Measurements, rate_checkpoint
from domain.types import HourlyWeather

FIRST_HOUR = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)


def dec(text: str | None) -> Decimal | None:
    return None if text is None else Decimal(text)


def readings(
    wind: str | None = "0", rain: str | None = "0", snow: str | None = "0"
) -> Measurements:
    return Measurements(dec(wind), dec(rain), dec(snow), None)


def level_of(measurements: Measurements, load_lb: int = 10_000) -> Level | None:
    return rate_checkpoint(measurements, load_lb).level


def forecast(**series: tuple[str, ...]) -> HourlyWeather:
    def column(name: str) -> tuple[Decimal | None, ...]:
        return tuple(dec(value) for value in series.get(name, ("0",) * 5))

    return HourlyWeather(
        first_hour_utc=FIRST_HOUR,
        wind_mph=column("wind"),
        gust_mph=column("gust"),
        rain_in=column("rain"),
        snow_in=column("snow"),
    )


def at(hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 11, 12, hour, minute, tzinfo=UTC)
