from datetime import UTC, datetime
from decimal import Decimal

from domain.heatmap import cell_of, risk_digits
from domain.types import GeoPoint, HourlyWeather

DEPARTURE = datetime(2026, 11, 12, 8, 0, tzinfo=UTC)


def window(
    hours: int, wind: dict[int, str] | None = None, rain: dict[int, str] | None = None
) -> HourlyWeather:
    """A forecast starting at departure that is calm except for the given hours."""

    def column(special: dict[int, str] | None) -> tuple[Decimal | None, ...]:
        return tuple(Decimal((special or {}).get(hour, "0")) for hour in range(hours))

    return HourlyWeather(DEPARTURE, column(wind), column(None), column(rain), column(None))


def test_rr28_a_calm_forecast_gives_49_low_digits() -> None:
    """RR-28."""
    assert risk_digits(window(60), DEPARTURE, 10_000) == "0" * 49


def test_rr28_each_digit_uses_the_same_wind_hour_rule_as_the_checkpoint_rating() -> None:
    """RR-28."""
    digits = risk_digits(window(60, wind={6: "40"}), DEPARTURE, 10_000)

    assert digits[6] == "2"
    assert digits.count("2") == 1


def test_rr28_each_digit_uses_the_same_rain_hour_rule_as_the_checkpoint_rating() -> None:
    """RR-28."""
    digits = risk_digits(window(60, rain={12: "0.60"}), DEPARTURE, 10_000)

    assert digits[11] == "3"
    assert digits.count("3") == 1


def test_rr28_a_heavier_load_raises_the_digit_by_the_same_load_rule() -> None:
    """RR-28."""
    forecast = window(60, wind={3: "38"})

    assert risk_digits(forecast, DEPARTURE, 10_000)[3] == "2"
    assert risk_digits(forecast, DEPARTURE, 41_000)[3] == "3"


def test_rr28_hours_beyond_the_forecast_are_x_for_no_data() -> None:
    """RR-28."""
    digits = risk_digits(window(10), DEPARTURE, 10_000)

    assert digits == "0" * 9 + "x" * 40


def test_rr28_a_point_with_no_forecast_is_all_x() -> None:
    """RR-28."""
    assert risk_digits(None, DEPARTURE, 10_000) == "x" * 49


def test_rr28_no_travel_wind_is_digit_4() -> None:
    """RR-28."""
    assert risk_digits(window(60, wind={0: "60"}), DEPARTURE, 0)[0] == "4"


def test_cell_of_snaps_nearby_points_to_the_same_005_degree_cell() -> None:
    assert cell_of(GeoPoint(35.026, -100.012)) == cell_of(GeoPoint(35.074, -99.989))
    assert cell_of(GeoPoint(35.026, -100.012)) == GeoPoint(35.05, -100.0)


def test_cell_of_keeps_points_in_different_cells_apart() -> None:
    assert cell_of(GeoPoint(35.0, -100.0)) != cell_of(GeoPoint(35.1, -100.0))
