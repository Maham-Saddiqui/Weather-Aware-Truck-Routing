from decimal import Decimal

from domain.units import miles_from_metres, round_half_up, vehicle_weight_kg


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
