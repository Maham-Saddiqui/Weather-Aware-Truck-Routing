import math
from decimal import ROUND_HALF_UP, Decimal

from domain.constants import (
    COMPARISON_MILES_DECIMALS,
    EMPTY_TRUCK_WEIGHT_LB,
    KILOGRAMS_PER_POUND,
    METRES_PER_MILE,
)

WHOLE_NUMBER = Decimal(1)


def round_half_up(value: Decimal, decimals: Decimal) -> Decimal:
    """RR-02: halves always round up, in exact decimals."""
    return value.quantize(decimals, rounding=ROUND_HALF_UP)


def miles_from_metres(distance_m: Decimal) -> Decimal:
    """Exact conversion rounded once to 0.1 mile, for display and for comparison (RR-25, RR-30)."""
    return round_half_up(distance_m / METRES_PER_MILE, COMPARISON_MILES_DECIMALS)


def vehicle_weight_kg(load_lb: int) -> int:
    """Load plus the assumed empty tractor-trailer, converted exactly and rounded up."""
    total_kg = Decimal(load_lb + EMPTY_TRUCK_WEIGHT_LB) * KILOGRAMS_PER_POUND
    return math.ceil(total_kg)
