from dataclasses import replace
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from hypothesis import given, settings
from hypothesis import strategies as st

from domain.constants import HEATMAP_HOURS
from domain.heatmap import NO_DATA_DIGIT, risk_digits
from domain.rating import is_low_for_hours, measurements_at, rate_checkpoint
from domain.types import HourlyWeather

FIRST_HOUR = datetime(2026, 11, 12, 8, 0, tzinfo=UTC)
CALM_WIND = ("0", "5", "24.4", "24.499")
EDGE_WIND = ("24.5", "25", "35", "44.5", "55", "70")
CALM_RAIN = ("0", "0.001", "0.094", "0.0949")
EDGE_RAIN = ("0.095", "0.10", "0.25", "0.50", "1.00", "1.01")
CALM_SNOW = ("0", "0.2", "0.494", "0.4949")
EDGE_SNOW = ("0.495", "0.5", "1.0", "2.0", "3.0", "3.1")


def readings(calm: tuple[str, ...], edge: tuple[str, ...]) -> st.SearchStrategy[Decimal | None]:
    """Mostly calm values, a few at the band edges, now and then a missing one."""
    return st.one_of(
        st.sampled_from(calm).map(Decimal),
        st.sampled_from(calm).map(Decimal),
        st.sampled_from(calm).map(Decimal),
        st.sampled_from(edge).map(Decimal),
        st.none(),
    )


def series(
    calm: tuple[str, ...], edge: tuple[str, ...], length: int
) -> st.SearchStrategy[tuple[Decimal | None, ...]]:
    return st.lists(readings(calm, edge), min_size=length, max_size=length).map(tuple)


@st.composite
def forecasts(draw: st.DrawFn) -> HourlyWeather:
    length = draw(st.integers(min_value=0, max_value=75))
    return HourlyWeather(
        first_hour_utc=FIRST_HOUR,
        wind_mph=draw(series(CALM_WIND, EDGE_WIND, length)),
        gust_mph=draw(series(CALM_WIND, EDGE_WIND, length)),
        rain_in=draw(series(CALM_RAIN, EDGE_RAIN, length)),
        snow_in=draw(series(CALM_SNOW, EDGE_SNOW, length)),
    )


def uniform(wind: str, rain: str, snow: str, hours: int = 75) -> HourlyWeather:
    return HourlyWeather(
        FIRST_HOUR,
        (Decimal(wind),) * hours,
        (Decimal(wind) + 9,) * hours,
        (Decimal(rain),) * hours,
        (Decimal(snow),) * hours,
    )


def digit_by_digit(weather: HourlyWeather | None, departure_utc: datetime, load_lb: int) -> str:
    """The full computation that the fast path must always agree with (RR-28)."""
    digits = []
    for hour in range(HEATMAP_HOURS):
        measurements = measurements_at(weather, departure_utc + timedelta(hours=hour))
        level = rate_checkpoint(measurements, load_lb).level
        digits.append(NO_DATA_DIGIT if level is None else str(level.value))
    return "".join(digits)


departures = st.builds(
    lambda hours, minutes: FIRST_HOUR + timedelta(hours=hours, minutes=minutes),
    st.integers(min_value=-3, max_value=8),
    st.sampled_from((0, 14, 29, 30, 31, 59)),
)
loads = st.sampled_from((0, 10_000, 30_000, 30_001, 40_001, 80_000))


@settings(max_examples=400)
@given(forecasts(), departures, loads)
def test_rr28_the_calm_fast_path_gives_exactly_the_digits_of_the_full_computation(
    weather: HourlyWeather, departure_utc: datetime, load_lb: int
) -> None:
    """RR-28."""
    assert risk_digits(weather, departure_utc, load_lb) == digit_by_digit(
        weather, departure_utc, load_lb
    )


@settings(max_examples=200)
@given(
    st.tuples(st.sampled_from(CALM_WIND), st.sampled_from(CALM_RAIN), st.sampled_from(CALM_SNOW)),
    departures,
    loads,
)
def test_rr28_a_calm_window_gives_the_same_digits_with_or_without_the_fast_path(
    calm: tuple[str, str, str], departure_utc: datetime, load_lb: int
) -> None:
    """RR-28."""
    weather = uniform(*calm, hours=90)
    expected = digit_by_digit(weather, departure_utc, load_lb)

    assert is_low_for_hours(weather, departure_utc, HEATMAP_HOURS) == (expected == "0" * 49)
    assert risk_digits(weather, departure_utc, load_lb) == expected


spikes = st.tuples(
    st.integers(min_value=0, max_value=89),
    st.sampled_from((("wind_mph", EDGE_WIND), ("rain_in", EDGE_RAIN), ("snow_in", EDGE_SNOW))),
    st.integers(min_value=0, max_value=6),
)


@settings(max_examples=300)
@given(spikes, departures, loads)
def test_rr28_one_edge_or_missing_reading_in_a_calm_window_never_fools_the_fast_path(
    spike: tuple[int, tuple[str, tuple[str, ...]], int], departure_utc: datetime, load_lb: int
) -> None:
    """RR-28."""
    hour, (field, edge_values), choice = spike
    weather = uniform("5", "0", "0", hours=90)
    column = list(getattr(weather, field))
    column[hour] = None if choice == len(edge_values) else Decimal(edge_values[choice])
    changes: dict[str, Any] = {field: tuple(column)}
    weather = replace(weather, **changes)

    assert risk_digits(weather, departure_utc, load_lb) == digit_by_digit(
        weather, departure_utc, load_lb
    )


def test_rr28_a_reading_that_rounds_up_to_a_band_edge_is_not_calm() -> None:
    """RR-02 and RR-28: 24.5 mph is shown as 25 and rated Moderate."""
    assert is_low_for_hours(uniform("24.499", "0", "0"), FIRST_HOUR, HEATMAP_HOURS)
    assert not is_low_for_hours(uniform("24.5", "0", "0"), FIRST_HOUR, HEATMAP_HOURS)
    assert not is_low_for_hours(uniform("5", "0.095", "0"), FIRST_HOUR, HEATMAP_HOURS)
    assert not is_low_for_hours(uniform("5", "0", "0.495"), FIRST_HOUR, HEATMAP_HOURS)


def test_rr28_a_forecast_too_short_for_all_hours_is_never_taken_as_calm() -> None:
    """RR-28: the hours beyond the forecast are x for no data."""
    assert not is_low_for_hours(uniform("5", "0", "0", hours=40), FIRST_HOUR, HEATMAP_HOURS)
    assert not is_low_for_hours(None, FIRST_HOUR, HEATMAP_HOURS)
