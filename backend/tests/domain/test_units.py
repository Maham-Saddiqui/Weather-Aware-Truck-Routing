from decimal import Decimal

import pytest

from domain.units import (
    miles_from_metres,
    round_half_up,
    travel_time_difference_text,
    travel_time_text,
    vehicle_weight_kg,
)


def test_rr02_halves_round_up_in_exact_decimals() -> None:
    """RR-02."""
    assert round_half_up(Decimal("34.5"), Decimal("1")) == Decimal("35")
    assert round_half_up(Decimal("0.245"), Decimal("0.01")) == Decimal("0.25")


def test_rr30_metres_convert_to_miles_exactly_and_round_once_to_a_tenth() -> None:
    """RR-30."""
    assert miles_from_metres(Decimal("160934.4")) == Decimal("100.0")
    assert miles_from_metres(Decimal("20116.8")) == Decimal("12.5")


def test_vehicle_weight_is_load_plus_35000_lb_converted_and_rounded_up_to_whole_kg() -> None:
    assert vehicle_weight_kg(0) == 15_876
    assert vehicle_weight_kg(40_000) == 34_020


@pytest.mark.parametrize(
    ("seconds", "text"),
    [
        (0, "0 min"),
        (29, "0 min"),
        (30, "1 min"),
        (59, "1 min"),
        (60, "1 min"),
        (89, "1 min"),
        (90, "2 min"),
        (3_599, "1 h 0 min"),
        (3_600, "1 h 0 min"),
        (3_120, "52 min"),
        (50_669, "14 h 4 min"),
        (50_670, "14 h 5 min"),
    ],
)
def test_rr25_travel_time_text_rounds_to_whole_minutes_half_up(seconds: int, text: str) -> None:
    """RR-25."""
    assert travel_time_text(seconds) == text


@pytest.mark.parametrize(
    ("seconds", "first_route_seconds", "text"),
    [
        (3_600, 3_600, "Same travel time as Route 1"),
        (3_660, 3_600, "1 min slower than Route 1"),
        (3_540, 3_600, "1 min quicker than Route 1"),
        (7_140, 3_600, "59 min slower than Route 1"),
        (7_200, 3_600, "1 h 0 min slower than Route 1"),
        (7_260, 3_600, "1 h 1 min slower than Route 1"),
        (0, 3_600, "1 h 0 min quicker than Route 1"),
        (3_600 + 3_660, 3_600, "1 h 1 min slower than Route 1"),
        (3_600 + 90_000, 3_600, "25 h 0 min slower than Route 1"),
        (3_600, 3_600 + 90_060, "25 h 1 min quicker than Route 1"),
        (50_669, 50_670, "1 min quicker than Route 1"),
        (50_670, 50_669, "1 min slower than Route 1"),
        (50_641, 50_669, "Same travel time as Route 1"),
        (16 * 3_600 + 32 * 60, 14 * 3_600 + 4 * 60, "2 h 28 min slower than Route 1"),
    ],
)
def test_rr25_travel_time_difference_is_made_from_the_two_whole_minute_times(
    seconds: int, first_route_seconds: int, text: str
) -> None:
    """RR-25"""
    assert travel_time_difference_text(seconds, first_route_seconds) == text
