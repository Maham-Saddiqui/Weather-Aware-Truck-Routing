"""Independent check of rating rules RR-01 to RR-11 and RR-17 against hand-worked cases."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from domain.rating import CheckpointRating, Measurements, measurements_at, rate_checkpoint
from domain.types import HourlyWeather
from tests.correctness.expected import (
    BAND_CASES,
    COMBINED_CASES,
    HOUR_CASES,
    LOAD_CASES,
    MISSING_CASES,
    ROUNDING_CASES,
)

FIRST_HOUR = datetime(2026, 11, 12, 13, tzinfo=UTC)
TYPICAL_LOAD_LB = 10_000


def decimal_or_none(text: str | None) -> Decimal | None:
    return None if text is None else Decimal(text)


def constant_weather(wind: str | None, rain: str | None, snow: str | None) -> HourlyWeather:
    """Two identical hours: arrival at the first hour reads wind at hour 0, rain at hour 1."""
    series = {
        name: (decimal_or_none(value),) * 2
        for name, value in (("wind", wind), ("rain", rain), ("snow", snow))
    }
    return HourlyWeather(
        first_hour_utc=FIRST_HOUR,
        wind_mph=series["wind"],
        gust_mph=series["wind"],
        rain_in=series["rain"],
        snow_in=series["snow"],
    )


def measure(wind: str | None, rain: str | None, snow: str | None) -> Measurements:
    return measurements_at(constant_weather(wind, rain, snow), FIRST_HOUR)


def rate(wind: str | None, rain: str | None, snow: str | None, load_lb: int) -> CheckpointRating:
    return rate_checkpoint(measure(wind, rain, snow), load_lb)


def level_name(rating: CheckpointRating) -> str:
    return "no_data" if rating.level is None else rating.level.name.lower()


def readings_with(kind: str, value: str) -> tuple[str, str, str]:
    others = {"wind": "0", "rain": "0", "snow": "0"} | {kind: value}
    return others["wind"], others["rain"], others["snow"]


@pytest.mark.parametrize(
    ("kind", "raw", "level", "why"), BAND_CASES, ids=[c[3] for c in BAND_CASES]
)
def test_band_edges_of_wind_rain_and_snow_rate_as_the_tables_say_rr03_rr04_rr05(
    kind: str, raw: str, level: str, why: str
) -> None:
    """RR-03 RR-04 RR-05: every band edge."""
    assert level_name(rate(*readings_with(kind, raw), TYPICAL_LOAD_LB)) == level, why


@pytest.mark.parametrize(
    ("wind", "load", "level", "why"), LOAD_CASES, ids=[c[3] for c in LOAD_CASES]
)
def test_load_rules_trigger_only_above_the_stated_weights_rr06_rr07_rr08(
    wind: str, load: int, level: str, why: str
) -> None:
    """RR-06 RR-07 RR-08: exactly 30,000 and 40,000 lb do not trigger."""
    assert level_name(rate(wind, "0", "0", load)) == level, why


@pytest.mark.parametrize("case", ROUNDING_CASES, ids=[c[4] for c in ROUNDING_CASES])
def test_readings_round_half_up_in_exact_decimals_before_rating_rr02(
    case: tuple[str, str, str, str, str],
) -> None:
    """RR-02: halves round up, values that binary floats get wrong included."""
    kind, raw, rounded, level, why = case
    wind, rain, snow = readings_with(kind, raw)
    measured = measure(wind, rain, snow)
    shown = {"wind": measured.wind_mph, "rain": measured.rain_in, "snow": measured.snow_in}[kind]
    assert str(shown) == rounded, why
    assert level_name(rate_checkpoint(measured, TYPICAL_LOAD_LB)) == level, why


@pytest.mark.parametrize("case", MISSING_CASES, ids=[c[5] for c in MISSING_CASES])
def test_missing_readings_give_no_data_unless_no_travel_is_already_reached_rr11(
    case: tuple[str | None, str | None, str | None, int, str, str],
) -> None:
    """RR-11 RR-01: no data is never Low and never guessed."""
    wind, rain, snow, load, level, why = case
    assert level_name(rate(wind, rain, snow, load)) == level, why


def test_a_checkpoint_with_no_forecast_at_all_is_no_data_rr11() -> None:
    """RR-11: no weather object at all."""
    measured = measurements_at(None, FIRST_HOUR)
    assert level_name(rate_checkpoint(measured, TYPICAL_LOAD_LB)) == "no_data"


def test_an_arrival_outside_the_forecast_window_is_no_data_rr11() -> None:
    """RR-11 RR-29: arrival before or after the series gives missing readings, never an error."""
    weather = constant_weather("10", "0", "0")
    for arrival in (FIRST_HOUR - timedelta(hours=5), FIRST_HOUR + timedelta(hours=5)):
        assert (
            level_name(rate_checkpoint(measurements_at(weather, arrival), TYPICAL_LOAD_LB))
            == "no_data"
        )


@pytest.mark.parametrize("case", COMBINED_CASES, ids=[c[7] for c in COMBINED_CASES])
def test_checkpoint_rating_is_the_worst_of_three_and_names_its_drivers_rr09_rr10(
    case: tuple[str, str, str, int, str, frozenset[str], str, str],
) -> None:
    """RR-09 RR-10: worst of wind, rain, snow, with the factors and load rule that produced it."""
    wind, rain, snow, load, level, factors, load_rule, why = case
    rating = rate(wind, rain, snow, load)
    assert level_name(rating) == level, why
    assert frozenset(factor.value for factor in rating.driving_factors) == factors, why
    assert rating.load_rule.value == load_rule, why


def test_no_data_is_not_a_level_and_levels_order_from_low_to_no_travel_rr01() -> None:
    """RR-01: values 0 to 4 and no data outside the scale."""
    assert rate(None, None, None, TYPICAL_LOAD_LB).level is None
    winds = ("0", "25", "35", "45", "55")
    values = [rate(wind, "0", "0", 0).level for wind in winds]
    assert [None if level is None else level.value for level in values] == [0, 1, 2, 3, 4]


def hours_since(first: datetime, iso: str) -> int:
    return int((datetime.fromisoformat(iso) - first).total_seconds() // 3600)


@pytest.mark.parametrize(
    ("arrival", "wind_hour", "rain_hour", "why"), HOUR_CASES, ids=[c[3] for c in HOUR_CASES]
)
def test_wind_uses_the_nearest_hour_and_rain_the_hour_after_arrival_rr17(
    arrival: str, wind_hour: str, rain_hour: str, why: str
) -> None:
    """RR-17: wind at the nearest hour (halves up); rain and snow at the next timestamp."""
    first = datetime(2026, 11, 12, tzinfo=UTC)
    hours = range(48)
    weather = HourlyWeather(
        first_hour_utc=first,
        wind_mph=tuple(Decimal(hour) for hour in hours),
        gust_mph=tuple(Decimal(hour) for hour in hours),
        rain_in=tuple(Decimal(hour) / 100 for hour in hours),
        snow_in=tuple(Decimal(hour) / 100 for hour in hours),
    )
    measured = measurements_at(weather, datetime.fromisoformat(arrival))
    assert measured.wind_mph == Decimal(hours_since(first, wind_hour)), why
    assert measured.rain_in == Decimal(hours_since(first, rain_hour)) / 100, why
    assert measured.snow_in == Decimal(hours_since(first, rain_hour)) / 100, why
