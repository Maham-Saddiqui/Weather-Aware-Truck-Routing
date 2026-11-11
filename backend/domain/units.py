import math
from decimal import ROUND_HALF_UP, Decimal

from domain.constants import (
    COMPARISON_MILES_DECIMALS,
    EMPTY_TRUCK_WEIGHT_LB,
    FIRST_ROUTE_NAME,
    KILOGRAMS_PER_POUND,
    METRES_PER_MILE,
)

WHOLE_NUMBER = Decimal(1)
SECONDS_PER_MINUTE = 60
MINUTES_PER_HOUR = 60


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


def whole_minutes(seconds: int) -> int:
    """RR-25: travel time in whole minutes, halves up (30 seconds rounds to the next minute)."""
    return (seconds + SECONDS_PER_MINUTE // 2) // SECONDS_PER_MINUTE


def travel_time_text(seconds: int) -> str:
    """RR-25: the travel time the screen shows, such as "14 h 4 min" or "52 min"."""
    return _minutes_text(whole_minutes(seconds))


def travel_time_difference_text(seconds: int, first_route_seconds: int) -> str:
    """RR-25: the difference of the two whole-minute times the cards show, against Route 1."""
    difference = whole_minutes(seconds) - whole_minutes(first_route_seconds)
    if difference == 0:
        return f"Same travel time as {FIRST_ROUTE_NAME}"
    direction = "slower" if difference > 0 else "quicker"
    return f"{_minutes_text(abs(difference))} {direction} than {FIRST_ROUTE_NAME}"


def _minutes_text(minutes: int) -> str:
    hours, minutes = divmod(minutes, MINUTES_PER_HOUR)
    return f"{minutes} min" if hours == 0 else f"{hours} h {minutes} min"
