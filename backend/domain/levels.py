from collections.abc import Iterable
from enum import IntEnum, StrEnum


class Level(IntEnum):
    """RR-01: a larger value is always a worse level; the value is used for averaging."""

    LOW = 0
    MODERATE = 1
    HIGH = 2
    SEVERE = 3
    NO_TRAVEL = 4


class DrivingFactor(StrEnum):
    WIND = "wind"
    RAIN = "rain"
    SNOW = "snow"


class LoadRule(StrEnum):
    NONE = "none"
    RAISED_TO_SEVERE = "raised_to_severe"
    RAISED_TO_NO_TRAVEL = "raised_to_no_travel"


def worst_of(levels: Iterable[Level]) -> Level | None:
    """RR-01: the maximum; None when there is nothing to compare."""
    return max(levels, default=None)
