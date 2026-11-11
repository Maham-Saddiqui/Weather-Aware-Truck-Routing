from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal

from domain.checkpoints import Checkpoint
from domain.constants import METRES_PER_MILE
from domain.levels import Level, LoadRule
from domain.rating import NO_DATA, CheckpointRating
from domain.summary import RatedCheckpoint, RouteSummary, summarize
from domain.types import GeoPoint

DEPARTURE = datetime(2026, 11, 12, 8, 0, tzinfo=UTC)
HERE = GeoPoint(35.0, -100.0)


def rated(level: Level | None) -> CheckpointRating:
    return NO_DATA if level is None else CheckpointRating(level, (), LoadRule.NONE)


def summary_of(
    covered_miles: Sequence[str], levels: Sequence[Level | None], travel_time_s: int = 3600
) -> RouteSummary:
    """A route summary built from hand-made checkpoints that cover the given miles."""
    checkpoints = [
        RatedCheckpoint(
            Checkpoint(index, Decimal(0), Decimal(covered) * METRES_PER_MILE, HERE, DEPARTURE),
            rated(level),
        )
        for index, (covered, level) in enumerate(zip(covered_miles, levels, strict=True))
    ]
    return summarize(checkpoints, travel_time_s, DEPARTURE)
