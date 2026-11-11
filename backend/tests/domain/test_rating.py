import pytest

from domain.levels import DrivingFactor, Level, LoadRule, worst_of
from domain.rating import rate_checkpoint
from tests.domain.rating_builders import level_of, readings


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
