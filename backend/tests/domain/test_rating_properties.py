from dataclasses import replace
from decimal import Decimal

from hypothesis import given
from hypothesis import strategies as st

from domain.levels import Level
from domain.rating import Measurements
from tests.domain.rating_builders import level_of

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
