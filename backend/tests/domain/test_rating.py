from dataclasses import replace
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from hypothesis import given
from hypothesis import strategies as st

from domain.levels import DrivingFactor, Level, LoadRule, worst_of
from domain.rating import Measurements, measurements_at, rate_checkpoint
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


@pytest.mark.parametrize(
    ("wind", "expected"),
    [
        ("24", Level.LOW),
        ("25", Level.MODERATE),
        ("34", Level.MODERATE),
        ("35", Level.HIGH),
        ("44", Level.HIGH),
        ("45", Level.SEVERE),
        ("54", Level.SEVERE),
        ("55", Level.NO_TRAVEL),
    ],
)
def test_rr03_wind_bands_with_a_10000_lb_load(wind: str, expected: Level) -> None:
    """RR-03."""
    assert level_of(readings(wind=wind)) is expected


@pytest.mark.parametrize(
    ("wind", "load_lb", "expected"),
    [
        ("44", 40_000, Level.HIGH),
        ("44", 40_001, Level.SEVERE),
        ("35", 45_000, Level.SEVERE),
        ("34", 80_000, Level.MODERATE),
        ("45", 0, Level.SEVERE),
        ("45", 30_000, Level.SEVERE),
        ("45", 30_001, Level.NO_TRAVEL),
        ("54", 80_000, Level.NO_TRAVEL),
        ("55", 0, Level.NO_TRAVEL),
    ],
)
def test_rr06_rr07_rr08_load_rules_raise_wind_only_above_the_limits(
    wind: str, load_lb: int, expected: Level
) -> None:
    """RR-06, RR-07, RR-08."""
    assert level_of(readings(wind=wind), load_lb) is expected


@pytest.mark.parametrize(
    ("rain", "expected"),
    [
        ("0.09", Level.LOW),
        ("0.10", Level.MODERATE),
        ("0.24", Level.MODERATE),
        ("0.25", Level.HIGH),
        ("0.49", Level.HIGH),
        ("0.50", Level.SEVERE),
        ("1.00", Level.SEVERE),
        ("1.01", Level.NO_TRAVEL),
    ],
)
def test_rr04_rain_bands_include_the_lower_edge_and_no_travel_is_strictly_above(
    rain: str, expected: Level
) -> None:
    """RR-04."""
    assert level_of(readings(rain=rain)) is expected


@pytest.mark.parametrize(
    ("snow", "expected"),
    [
        ("0.49", Level.LOW),
        ("0.50", Level.MODERATE),
        ("0.99", Level.MODERATE),
        ("1.00", Level.HIGH),
        ("1.99", Level.HIGH),
        ("2.00", Level.SEVERE),
        ("3.00", Level.SEVERE),
        ("3.01", Level.NO_TRAVEL),
    ],
)
def test_rr05_snow_bands_include_the_lower_edge_and_no_travel_is_strictly_above(
    snow: str, expected: Level
) -> None:
    """RR-05."""
    assert level_of(readings(snow=snow)) is expected


def test_rr04_a_heavy_load_never_changes_the_rain_or_snow_rating() -> None:
    """RR-04."""
    assert level_of(readings(rain="0.30", snow="1.50"), 80_000) is Level.HIGH


def test_rr01_worst_of_is_the_maximum_and_none_for_nothing() -> None:
    """RR-01."""
    assert worst_of([Level.LOW, Level.SEVERE, Level.HIGH]) is Level.SEVERE
    assert worst_of([]) is None


def test_rr09_rr10_wind_moderate_rain_high_snow_low_is_high_driven_by_rain() -> None:
    """RR-09, RR-10."""
    rating = rate_checkpoint(readings(wind="30", rain="0.30", snow="0"), 10_000)

    assert rating.level is Level.HIGH
    assert rating.driving_factors == (DrivingFactor.RAIN,)
    assert rating.load_rule is LoadRule.NONE


def test_rr10_wind_raised_by_load_and_severe_rain_are_both_driving_factors() -> None:
    """RR-10."""
    rating = rate_checkpoint(readings(wind="38", rain="0.60", snow="0"), 41_000)

    assert rating.level is Level.SEVERE
    assert rating.driving_factors == (DrivingFactor.WIND, DrivingFactor.RAIN)
    assert rating.load_rule is LoadRule.RAISED_TO_SEVERE


def test_rr10_a_load_rule_is_not_reported_when_worse_rain_decides_the_rating() -> None:
    """RR-10."""
    rating = rate_checkpoint(readings(wind="38", rain="1.50", snow="0"), 41_000)

    assert rating.level is Level.NO_TRAVEL
    assert rating.driving_factors == (DrivingFactor.RAIN,)
    assert rating.load_rule is LoadRule.NONE


def test_rr10_wind_raised_to_no_travel_by_load_reports_the_rule() -> None:
    """RR-10."""
    rating = rate_checkpoint(readings(wind="50"), 30_001)

    assert rating.level is Level.NO_TRAVEL
    assert rating.driving_factors == (DrivingFactor.WIND,)
    assert rating.load_rule is LoadRule.RAISED_TO_NO_TRAVEL


def test_rr10_a_low_checkpoint_has_no_driving_factor() -> None:
    """RR-10."""
    rating = rate_checkpoint(readings(), 10_000)

    assert rating.level is Level.LOW
    assert rating.driving_factors == ()
    assert rating.load_rule is LoadRule.NONE


def test_rr11_wind_30_with_rain_missing_is_no_data() -> None:
    """RR-11."""
    rating = rate_checkpoint(readings(wind="30", rain=None, snow="0"), 10_000)

    assert rating.level is None
    assert rating.driving_factors == ()


def test_rr11_wind_50_severe_so_far_with_rain_missing_is_no_data() -> None:
    """RR-11."""
    assert level_of(readings(wind="50", rain=None, snow="0"), 10_000) is None


def test_rr11_wind_60_with_rain_missing_is_still_no_travel() -> None:
    """RR-11."""
    rating = rate_checkpoint(readings(wind="60", rain=None, snow="0"), 10_000)

    assert rating.level is Level.NO_TRAVEL
    assert rating.driving_factors == (DrivingFactor.WIND,)


def test_rr11_every_reading_missing_is_no_data_never_low() -> None:
    """RR-11."""
    assert level_of(readings(wind=None, rain=None, snow=None)) is None


def test_rr11_missing_wind_with_severe_rain_is_no_data_not_severe() -> None:
    """RR-11."""
    assert level_of(readings(wind=None, rain="0.60", snow="0")) is None


def test_rr02_wind_34_5_rounds_half_up_to_35_which_is_high() -> None:
    """RR-02."""
    assert level_of(measurements_at(forecast(wind=("34.5",) * 5), at(13))) is Level.HIGH


def test_rr02_wind_34_49_rounds_down_to_34_which_is_moderate() -> None:
    """RR-02."""
    assert level_of(measurements_at(forecast(wind=("34.49",) * 5), at(13))) is Level.MODERATE


def test_rr02_rain_0_245_rounds_half_up_to_0_25_which_is_high() -> None:
    """RR-02."""
    measurements = measurements_at(forecast(rain=("0.245",) * 5), at(13))

    assert measurements.rain_in == Decimal("0.25")
    assert level_of(measurements) is Level.HIGH


def test_rr02_rain_0_244_rounds_to_0_24_which_is_moderate() -> None:
    """RR-02."""
    assert level_of(measurements_at(forecast(rain=("0.244",) * 5), at(13))) is Level.MODERATE


def test_rr02_rain_0_495_rounds_half_up_to_0_50_which_is_severe() -> None:
    """RR-02."""
    assert level_of(measurements_at(forecast(rain=("0.495",) * 5), at(13))) is Level.SEVERE


def test_rr02_snow_and_gusts_are_rounded_once_for_display() -> None:
    """RR-02."""
    measurements = measurements_at(forecast(snow=("0.125",) * 5, gust=("40.5",) * 5), at(13))

    assert measurements.snow_in == Decimal("0.13")
    assert measurements.gust_mph == Decimal("41")


def test_rr17_arrival_13_20_uses_wind_at_13_00_and_rain_snow_at_14_00() -> None:
    """RR-17."""
    weather = forecast(
        wind=("0", "10", "20", "30", "40"),
        rain=("0", "0.11", "0.22", "0.33", "0.44"),
        snow=("0", "1", "2", "3", "4"),
    )

    measurements = measurements_at(weather, at(13, 20))

    assert measurements.wind_mph == Decimal("10")
    assert measurements.rain_in == Decimal("0.22")
    assert measurements.snow_in == Decimal("2.00")


def test_rr17_arrival_13_40_uses_wind_at_14_00_and_rain_snow_at_14_00() -> None:
    """RR-17."""
    weather = forecast(wind=("0", "10", "20", "30", "40"), rain=("0", "0.11", "0.22", "0.33", "0"))

    measurements = measurements_at(weather, at(13, 40))

    assert measurements.wind_mph == Decimal("20")
    assert measurements.rain_in == Decimal("0.22")


def test_rr17_arrival_exactly_13_00_uses_wind_at_13_00_and_rain_snow_at_14_00() -> None:
    """RR-17."""
    weather = forecast(wind=("0", "10", "20", "30", "40"), rain=("0", "0.11", "0.22", "0.33", "0"))

    measurements = measurements_at(weather, at(13))

    assert measurements.wind_mph == Decimal("10")
    assert measurements.rain_in == Decimal("0.22")


def test_rr17_arrival_exactly_13_30_rounds_the_wind_hour_half_up_to_14_00() -> None:
    """RR-17."""
    weather = forecast(wind=("0", "10", "20", "30", "40"))

    assert measurements_at(weather, at(13, 30)).wind_mph == Decimal("20")


def test_rr11_an_hour_outside_the_forecast_window_is_a_missing_reading() -> None:
    """RR-11."""
    weather = forecast()

    assert measurements_at(weather, at(11, 0)).wind_mph is None
    assert measurements_at(weather, at(16, 30)).rain_in is None
    assert measurements_at(weather, at(11, 20)).snow_in == Decimal("0.00")


def test_rr11_a_missing_value_inside_the_window_stays_missing() -> None:
    """RR-11."""
    weather = HourlyWeather(FIRST_HOUR, (None,), (None,), (None,), (None,))

    assert measurements_at(weather, at(12)) == Measurements(None, None, None, None)


def test_rr11_no_forecast_at_all_gives_missing_readings() -> None:
    """RR-11."""
    assert measurements_at(None, at(13)) == Measurements(None, None, None, None)


wind_values = st.integers(min_value=0, max_value=80).map(Decimal)
rain_values = st.integers(min_value=0, max_value=200).map(lambda n: Decimal(n) / 100)
snow_values = st.integers(min_value=0, max_value=500).map(lambda n: Decimal(n) / 100)
any_readings = st.builds(Measurements, wind_values, rain_values, snow_values, st.none())
loads = st.integers(min_value=0, max_value=80_000)


def rated_level(measurements: Measurements, load_lb: int) -> Level:
    level = level_of(measurements, load_lb)
    assert level is not None
    return level


@given(any_readings, wind_values, wind_values, loads)
def test_rr09_a_worse_wind_never_lowers_the_rating(
    base: Measurements, wind_a: Decimal, wind_b: Decimal, load_lb: int
) -> None:
    """RR-09."""
    low, high = sorted((wind_a, wind_b))
    assert rated_level(replace(base, wind_mph=low), load_lb) <= rated_level(
        replace(base, wind_mph=high), load_lb
    )


@given(any_readings, rain_values, rain_values, loads)
def test_rr09_a_worse_rain_never_lowers_the_rating(
    base: Measurements, rain_a: Decimal, rain_b: Decimal, load_lb: int
) -> None:
    """RR-09."""
    low, high = sorted((rain_a, rain_b))
    assert rated_level(replace(base, rain_in=low), load_lb) <= rated_level(
        replace(base, rain_in=high), load_lb
    )


@given(any_readings, snow_values, snow_values, loads)
def test_rr09_a_worse_snow_never_lowers_the_rating(
    base: Measurements, snow_a: Decimal, snow_b: Decimal, load_lb: int
) -> None:
    """RR-09."""
    low, high = sorted((snow_a, snow_b))
    assert rated_level(replace(base, snow_in=low), load_lb) <= rated_level(
        replace(base, snow_in=high), load_lb
    )


@given(any_readings, loads, loads)
def test_rr06_rr07_rr08_a_heavier_load_never_lowers_the_rating(
    readings_: Measurements, load_a: int, load_b: int
) -> None:
    """RR-06, RR-07, RR-08."""
    light, heavy = sorted((load_a, load_b))
    assert rated_level(readings_, light) <= rated_level(readings_, heavy)
