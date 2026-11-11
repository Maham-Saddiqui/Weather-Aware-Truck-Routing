"""How one weather cell is kept as text in the cache, written and read back in one place.

The text is the first hour as a timestamp, then one line each for wind, gusts, rain plus showers
and snow, with hourly readings separated by commas.
"""

from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from domain.types import HourlyWeather
from providers.weather.series import FIELD_SEPARATOR, CompactSeries

LINE_SEPARATOR = "\n"

type JsonObject = dict[str, Any]


def compact_window(hourly: JsonObject) -> str:
    """Rain plus showers in exact decimals (RR-02); a missing part stays missing.

    Anything that is not a plain number, or a first hour that is not a whole timestamp, is
    refused here, so only text that can be read back is ever cached.
    """
    wind, gust, rain, showers, snow = (
        _readings(hourly[name])
        for name in ("wind_speed_10m", "wind_gusts_10m", "rain", "showers", "snowfall")
    )
    rows: list[Sequence[Decimal | int | None]] = [
        wind,
        gust,
        [_add(r, s) for r, s in zip(rain, showers, strict=True)],
        snow,
    ]
    if any(len(row) != len(hourly["time"]) for row in rows):
        raise ValueError("Every series must cover every hour")
    lines = [
        FIELD_SEPARATOR.join("" if value is None else str(value) for value in row) for row in rows
    ]
    return LINE_SEPARATOR.join([str(_first_hour(hourly["time"])), *lines])


def _first_hour(times: list[Any]) -> int:
    first = times[0]
    if isinstance(first, bool) or not isinstance(first, int):
        raise ValueError("Hours must be whole timestamps")
    datetime.fromtimestamp(first, UTC)
    return first


def _readings(row: list[Any]) -> list[Decimal | int | None]:
    if not isinstance(row, list):
        raise TypeError("A series must be a list")
    for value in row:
        if value is not None and not _is_finite_number(value):
            raise ValueError("Readings must be finite numbers")
    return row


def _is_finite_number(value: object) -> bool:
    return (
        isinstance(value, int | Decimal)
        and not isinstance(value, bool)
        and Decimal(value).is_finite()
    )


def _add(first: Decimal | int | None, second: Decimal | int | None) -> Decimal | None:
    if first is None or second is None:
        return None
    return Decimal(first) + Decimal(second)


def expand_window(window: str) -> HourlyWeather:
    first_hour, *rows = window.split(LINE_SEPARATOR)
    wind, gust, rain, snow = (CompactSeries(row) for row in rows)
    return HourlyWeather(
        first_hour_utc=datetime.fromtimestamp(int(first_hour), UTC),
        wind_mph=wind,
        gust_mph=gust,
        rain_in=rain,
        snow_in=snow,
    )
