from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from domain.checkpoints import Stop
from domain.constants import METRES_PER_MILE
from domain.levels import Level, LoadRule
from domain.rating import NO_DATA, CheckpointRating
from domain.summary import IneligibleReason, RatedStop, RouteSummary, summarize
from domain.types import GeoPoint
from domain.units import miles_from_metres

DEPARTURE = datetime(2026, 11, 12, 8, 0, tzinfo=UTC)
HERE = GeoPoint(35.0, -100.0)


def rated(level: Level | None) -> CheckpointRating:
    return NO_DATA if level is None else CheckpointRating(level, (), LoadRule.NONE)


def summary_of(
    covered_miles: Sequence[str], levels: Sequence[Level | None], travel_time_s: int = 3600
) -> RouteSummary:
    stops = [
        RatedStop(
            Stop(index, Decimal(0), Decimal(covered) * METRES_PER_MILE, HERE, DEPARTURE),
            rated(level),
        )
        for index, (covered, level) in enumerate(zip(covered_miles, levels, strict=True))
    ]
    return summarize(stops, travel_time_s, DEPARTURE)


def test_rr20_miles_at_each_level_add_the_stretches_of_checkpoints_with_that_level() -> None:
    summary = summary_of(
        ["12.5", "25", "17.5", "5"], [Level.LOW, Level.HIGH, Level.LOW, Level.SEVERE]
    )

    metres = summary.metres_by_level
    assert miles_from_metres(metres.low) == Decimal("30.0")
    assert miles_from_metres(metres.high) == Decimal("25.0")
    assert miles_from_metres(metres.severe) == Decimal("5.0")
    assert metres.moderate == metres.no_travel == metres.no_data == 0
    assert miles_from_metres(summary.distance_m) == Decimal("60.0")


def test_rr20_miles_without_data_are_counted_apart_and_never_as_low() -> None:
    summary = summary_of(["30", "30"], [Level.MODERATE, None])

    assert miles_from_metres(summary.metres_by_level.no_data) == Decimal("30.0")
    assert summary.metres_by_level.low == 0


def test_rr21_average_risk_weights_each_level_by_its_miles_over_miles_with_data() -> None:
    summary = summary_of(["10", "20", "10"], [Level.LOW, Level.HIGH, Level.SEVERE])

    assert summary.average_risk == Decimal("1.75")


def test_rr21_average_risk_ignores_miles_without_data() -> None:
    summary = summary_of(["10", "10", "10"], [Level.LOW, None, Level.SEVERE])

    assert summary.average_risk == Decimal("1.50")


def test_rr21_average_risk_is_rounded_half_up_to_two_decimals() -> None:
    summary = summary_of(["7", "1"], [Level.LOW, Level.MODERATE])

    assert summary.average_risk == Decimal("0.13")


def test_rr21_average_risk_is_none_when_no_mile_has_data() -> None:
    summary = summary_of(["10", "10"], [None, None])

    assert summary.average_risk is None
    assert summary.worst_level is None


def test_rr21_worst_level_is_the_worst_checkpoint_level() -> None:
    summary = summary_of(["5", "5", "5"], [Level.MODERATE, Level.SEVERE, Level.LOW])

    assert summary.worst_level is Level.SEVERE


def test_rr21_arrival_is_departure_plus_travel_time() -> None:
    summary = summary_of(["5"], [Level.LOW], travel_time_s=5400)

    assert summary.arrival_utc == DEPARTURE + timedelta(minutes=90)
    assert summary.travel_time_s == 5400


def test_rr22_a_route_with_a_no_travel_checkpoint_is_not_eligible() -> None:
    summary = summary_of(["5", "5"], [Level.LOW, Level.NO_TRAVEL])

    assert not summary.is_eligible
    assert summary.ineligible_reason is IneligibleReason.NO_TRAVEL


def test_rr22_a_route_with_complete_data_and_no_no_travel_is_eligible() -> None:
    summary = summary_of(["5", "5"], [Level.LOW, Level.SEVERE])

    assert summary.is_eligible
    assert summary.ineligible_reason is None


def test_rr22_a_route_with_mostly_missing_data_is_not_enough_weather_data() -> None:
    summary = summary_of(["5", "5"], [Level.LOW, None])

    assert summary.ineligible_reason is IneligibleReason.NOT_ENOUGH_WEATHER_DATA


def test_rr22_no_travel_is_reported_before_missing_data() -> None:
    summary = summary_of(["5", "5"], [Level.NO_TRAVEL, None])

    assert summary.ineligible_reason is IneligibleReason.NO_TRAVEL


def test_rr22_cap_boundary_100_mile_route_with_exactly_10_percent_missing_stays_eligible() -> None:
    covered = ["5", *["10"] * 9, "5"]
    levels: list[Level | None] = [Level.LOW] * 11
    levels[5] = None

    summary = summary_of(covered, levels)

    assert miles_from_metres(summary.metres_by_level.no_data) == Decimal("10.0")
    assert summary.is_eligible


def test_rr22_cap_boundary_99_mile_route_with_one_checkpoint_missing_is_not_eligible() -> None:
    covered = ["5", *["10"] * 8, "9.5", "4.5"]
    levels: list[Level | None] = [Level.LOW] * 11
    levels[5] = None

    summary = summary_of(covered, levels)

    assert miles_from_metres(summary.distance_m) == Decimal("99.0")
    assert summary.ineligible_reason is IneligibleReason.NOT_ENOUGH_WEATHER_DATA
