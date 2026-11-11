"""Independent check that rain plus showers is added exactly before rounding (RR-02), no network."""

from datetime import UTC, datetime

import httpx
import pytest

from domain.levels import Level
from domain.rating import measurements_at, rate_checkpoint
from domain.types import GeoPoint, HourlyWeather
from providers.weather.cache import WindowCache
from providers.weather.open_meteo import OpenMeteoWeather
from tests.correctness.expected import RAIN_PLUS_SHOWERS_CASES

FIRST_HOUR = datetime(2026, 11, 12, 12, tzinfo=UTC)
NOW = datetime(2026, 11, 12, 12, 30, tzinfo=UTC)
POINT = GeoPoint(40.0, -100.0)


def repeated(value: str) -> str:
    return f"[{value}, {value}, {value}]"


def answer_text(rain: str, showers: str) -> str:
    """Raw JSON text so the numbers reach the parser exactly as the service writes them."""
    start = int(FIRST_HOUR.timestamp())
    hours = f"[{start}, {start + 3600}, {start + 7200}]"
    return (
        '{"hourly": {"time": '
        + hours
        + ', "wind_speed_10m": [5, 5, 5], "wind_gusts_10m": [9, 9, 9], '
        f'"rain": {repeated(rain)}, "showers": {repeated(showers)}, "snowfall": [0, 0, 0]}}}}'
    )


def forecast_for(rain: str, showers: str) -> HourlyWeather:
    transport = httpx.MockTransport(lambda _: httpx.Response(200, text=answer_text(rain, showers)))
    cache = WindowCache(lambda: NOW)
    provider = OpenMeteoWeather(
        "http://weather.invalid", httpx.Client(transport=transport), cache, lambda: NOW
    )
    return provider.forecast([POINT])[POINT]


@pytest.mark.parametrize(
    "case", RAIN_PLUS_SHOWERS_CASES, ids=[c[4] for c in RAIN_PLUS_SHOWERS_CASES]
)
def test_rain_and_showers_are_added_in_exact_decimals_before_rounding_rr02(
    case: tuple[str, str, str, str, str],
) -> None:
    """RR-02 RR-04: rain plus showers first, then one half-up rounding."""
    rain, showers, rounded, level, why = case
    measured = measurements_at(forecast_for(rain, showers), FIRST_HOUR)
    assert str(measured.rain_in) == rounded, why
    assert Level[level.upper()] is rate_checkpoint(measured, 10_000).level, why
