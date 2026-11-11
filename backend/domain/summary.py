from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from enum import StrEnum

from domain.checkpoints import Checkpoint
from domain.constants import COMPARISON_RISK_DECIMALS, NO_DATA_SHARE_LIMIT_DENOMINATOR
from domain.levels import Level, worst_of
from domain.rating import CheckpointRating
from domain.units import round_half_up


class IneligibleReason(StrEnum):
    NO_TRAVEL = "no_travel"
    NOT_ENOUGH_WEATHER_DATA = "not_enough_weather_data"


@dataclass(frozen=True, slots=True)
class RatedCheckpoint:
    checkpoint: Checkpoint
    rating: CheckpointRating


@dataclass(frozen=True, slots=True)
class MetresByLevel:
    """RR-20: road covered by checkpoints of each level; no data is counted apart."""

    low: Decimal
    moderate: Decimal
    high: Decimal
    severe: Decimal
    no_travel: Decimal
    no_data: Decimal

    def of(self, level: Level) -> Decimal:
        return (self.low, self.moderate, self.high, self.severe, self.no_travel)[level]

    @property
    def with_data(self) -> Decimal:
        return sum((self.of(level) for level in Level), Decimal(0))


@dataclass(frozen=True, slots=True)
class RouteSummary:
    """RR-21. Exact metres; average risk is rounded once to 0.01 (RR-25) for display and ranking."""

    distance_m: Decimal
    travel_time_s: int
    arrival_utc: datetime
    metres_by_level: MetresByLevel
    average_risk: Decimal | None
    worst_level: Level | None
    ineligible_reason: IneligibleReason | None

    @property
    def is_eligible(self) -> bool:
        return self.ineligible_reason is None


def summarize(
    rated_checkpoints: Sequence[RatedCheckpoint], travel_time_s: int, departure_utc: datetime
) -> RouteSummary:
    """RR-19 to RR-22: miles per level, mile-weighted average risk, worst level, eligibility."""
    metres = _metres_by_level(rated_checkpoints)
    distance_m = metres.with_data + metres.no_data
    worst = worst_of(c.rating.level for c in rated_checkpoints if c.rating.level is not None)
    return RouteSummary(
        distance_m=distance_m,
        travel_time_s=travel_time_s,
        arrival_utc=departure_utc + timedelta(seconds=travel_time_s),
        metres_by_level=metres,
        average_risk=_average_risk(metres),
        worst_level=worst,
        ineligible_reason=_ineligible_reason(worst, metres.no_data, distance_m),
    )


def _metres_by_level(rated_checkpoints: Sequence[RatedCheckpoint]) -> MetresByLevel:
    totals = {level: Decimal(0) for level in Level}
    no_data = Decimal(0)
    for rated_checkpoint in rated_checkpoints:
        if rated_checkpoint.rating.level is None:
            no_data += rated_checkpoint.checkpoint.covered_m
        else:
            totals[rated_checkpoint.rating.level] += rated_checkpoint.checkpoint.covered_m
    return MetresByLevel(
        low=totals[Level.LOW],
        moderate=totals[Level.MODERATE],
        high=totals[Level.HIGH],
        severe=totals[Level.SEVERE],
        no_travel=totals[Level.NO_TRAVEL],
        no_data=no_data,
    )


def _average_risk(metres: MetresByLevel) -> Decimal | None:
    """RR-21: sum of level value x covered road, over the road that has data; None without any."""
    if metres.with_data == 0:
        return None
    weighted = sum((level.value * metres.of(level) for level in Level), Decimal(0))
    return round_half_up(weighted / metres.with_data, COMPARISON_RISK_DECIMALS)


def _ineligible_reason(
    worst: Level | None, no_data_m: Decimal, distance_m: Decimal
) -> IneligibleReason | None:
    """RR-22: exact metres, so exactly 10% without data is still eligible (RR-30)."""
    if worst is Level.NO_TRAVEL:
        return IneligibleReason.NO_TRAVEL
    if no_data_m * NO_DATA_SHARE_LIMIT_DENOMINATOR > distance_m:
        return IneligibleReason.NOT_ENOUGH_WEATHER_DATA
    return None
