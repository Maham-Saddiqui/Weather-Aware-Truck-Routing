from collections.abc import Sequence
from dataclasses import dataclass, fields
from decimal import Decimal
from enum import StrEnum

from domain.constants import FIRST_ROUTE_NAME
from domain.levels import Level
from domain.summary import IneligibleReason, RouteSummary
from domain.units import miles_from_metres, travel_time_text, whole_minutes

UNRATED_AVERAGE_RISK = Decimal(Level.NO_TRAVEL + 1)


class DecidingCriterion(StrEnum):
    SEVERE_MILES = "severe_miles"
    HIGH_MILES = "high_miles"
    AVERAGE_RISK = "average_risk"
    TRAVEL_TIME = "travel_time"
    DISTANCE = "distance"
    PROVIDER_ORDER = "provider_order"
    ONLY_ELIGIBLE = "only_eligible"


class RecommendationStatus(StrEnum):
    RECOMMENDED = "recommended"
    NONE_ELIGIBLE = "none_eligible"


@dataclass(frozen=True, slots=True)
class Candidate:
    """A summarised route; its position in the sequence is the order the provider returned."""

    route_id: str
    summary: RouteSummary


@dataclass(frozen=True, slots=True)
class RankedRoute:
    route_id: str
    rank: int | None


@dataclass(frozen=True, slots=True)
class Recommendation:
    status: RecommendationStatus
    route_id: str | None
    least_bad_route_id: str | None
    deciding_criterion: DecidingCriterion | None
    sentence: str


@dataclass(frozen=True, slots=True)
class Ranking:
    """display_order lists ranked routes first, then ineligible routes, least-bad first (RR-23)."""

    display_order: tuple[RankedRoute, ...]
    recommendation: Recommendation


@dataclass(frozen=True, slots=True, order=True)
class ComparisonValues:
    """RR-24: the field order is the ranking order, and a field's name is its deciding criterion.

    Ties beyond the last field fall to the provider's order (RR-25).
    """

    severe_miles: Decimal
    high_miles: Decimal
    average_risk: Decimal
    travel_time: Decimal
    distance: Decimal


# Plain wording of each ranking criterion; {ahead} and {behind} are the compared numbers.
SENTENCE_BY_CRITERION = {
    DecidingCriterion.SEVERE_MILES: (
        "{winner} has fewer Severe-weather miles than {runner_up} ({ahead} against {behind} miles)"
    ),
    DecidingCriterion.HIGH_MILES: (
        "{winner} has fewer High-risk-weather miles than {runner_up} "
        "({ahead} against {behind} miles)"
    ),
    DecidingCriterion.AVERAGE_RISK: (
        "{winner} has a lower average risk than {runner_up} "
        "({ahead} against {behind} on a scale of 0 to 4)"
    ),
    DecidingCriterion.TRAVEL_TIME: "{winner} is quicker: {ahead} against {behind} for {runner_up}",
    DecidingCriterion.DISTANCE: (
        "{winner} is shorter than {runner_up} ({ahead} against {behind} miles)"
    ),
}
TIED_REASON = "{winner} ties with {runner_up} on every measure, so the provider's first is used"
ONLY_ELIGIBLE_REASON = (
    "{winner} is the only route without No Travel conditions and with enough weather data"
)
ONLY_ROUTE_REASON = (
    "{winner} is the only route found, and it has no No Travel conditions and enough weather data"
)

NO_ROUTE_SENTENCES = {
    frozenset({IneligibleReason.NO_TRAVEL}): (
        "No route is recommended: every route has at least one No Travel checkpoint."
    ),
    frozenset({IneligibleReason.NOT_ENOUGH_WEATHER_DATA}): (
        "No route is recommended: there is not enough weather data to rate any route."
    ),
    frozenset({IneligibleReason.NO_TRAVEL, IneligibleReason.NOT_ENOUGH_WEATHER_DATA}): (
        "No route is recommended: each route has a No Travel checkpoint or not enough weather data."
    ),
}
LEAVE_LATER_ADVICE = " Consider leaving later."
LEAST_BAD_NOTE = " The least-bad route is shown greyed out, for information only."


def rank_routes(candidates: Sequence[Candidate]) -> Ranking:
    """RR-22 to RR-26: rank the eligible routes, order the rest least-bad first, explain."""
    if not candidates:
        raise ValueError("At least one route is needed to rank")
    eligible = sorted((c for c in candidates if c.summary.is_eligible), key=_comparison_key)
    ineligible = sorted((c for c in candidates if not c.summary.is_eligible), key=_least_bad_key)
    ranked = tuple(RankedRoute(c.route_id, rank) for rank, c in enumerate(eligible, start=1))
    unranked = tuple(RankedRoute(c.route_id, None) for c in ineligible)
    recommendation = _recommend(eligible, candidates) if eligible else _recommend_none(ineligible)
    return Ranking(ranked + unranked, recommendation)


def _comparison_values(summary: RouteSummary) -> ComparisonValues:
    """RR-25: miles to 0.1, average risk to 0.01, travel time to whole minutes."""
    metres = summary.metres_by_level
    average_risk = UNRATED_AVERAGE_RISK if summary.average_risk is None else summary.average_risk
    return ComparisonValues(
        severe_miles=miles_from_metres(metres.severe),
        high_miles=miles_from_metres(metres.high),
        average_risk=average_risk,
        travel_time=Decimal(whole_minutes(summary.travel_time_s)),
        distance=miles_from_metres(summary.distance_m),
    )


def _comparison_key(candidate: Candidate) -> ComparisonValues:
    return _comparison_values(candidate.summary)


def _least_bad_key(candidate: Candidate) -> tuple[Decimal, ComparisonValues]:
    """RR-23: No Travel plus No data miles first, then the ranking order."""
    metres = candidate.summary.metres_by_level
    unsafe_or_unknown = miles_from_metres(metres.no_travel + metres.no_data)
    return (unsafe_or_unknown, _comparison_values(candidate.summary))


def _recommend(eligible: list[Candidate], candidates: Sequence[Candidate]) -> Recommendation:
    winner = eligible[0]
    criterion, sentence = _why_it_won(eligible, len(candidates))
    full_sentence = f"{sentence}.{_data_coverage_note(winner, candidates)}"
    return Recommendation(
        RecommendationStatus.RECOMMENDED, winner.route_id, None, criterion, full_sentence
    )


NAMES = {"winner": FIRST_ROUTE_NAME, "runner_up": "Route 2"}


def _why_it_won(eligible: list[Candidate], route_count: int) -> tuple[DecidingCriterion, str]:
    """RR-26: the first criterion on which the winner differs from the runner-up.

    Ranked routes come first in the display order: the winner is Route 1, the runner-up Route 2.
    """
    if route_count == 1:
        return DecidingCriterion.ONLY_ELIGIBLE, ONLY_ROUTE_REASON.format(**NAMES)
    if len(eligible) == 1:
        return DecidingCriterion.ONLY_ELIGIBLE, ONLY_ELIGIBLE_REASON.format(**NAMES)
    return _first_difference(eligible[0].summary, eligible[1].summary)


def _first_difference(ahead: RouteSummary, behind: RouteSummary) -> tuple[DecidingCriterion, str]:
    ahead_values, behind_values = _comparison_values(ahead), _comparison_values(behind)
    for field in fields(ComparisonValues):
        winning, losing = getattr(ahead_values, field.name), getattr(behind_values, field.name)
        if winning != losing:
            criterion = DecidingCriterion(field.name)
            if criterion is DecidingCriterion.TRAVEL_TIME:
                winning, losing = _times_as_text(ahead, behind)
            sentence = SENTENCE_BY_CRITERION[criterion]
            return criterion, sentence.format(**NAMES, ahead=winning, behind=losing)
    return DecidingCriterion.PROVIDER_ORDER, TIED_REASON.format(**NAMES)


def _times_as_text(ahead: RouteSummary, behind: RouteSummary) -> tuple[str, str]:
    return travel_time_text(ahead.travel_time_s), travel_time_text(behind.travel_time_s)


def _data_coverage_note(winner: Candidate, candidates: Sequence[Candidate]) -> str:
    """RR-26: say how many miles the rating rests on when any route has No data miles."""
    if all(c.summary.metres_by_level.no_data == 0 for c in candidates):
        return ""
    total = miles_from_metres(winner.summary.distance_m)
    if winner.summary.metres_by_level.no_data == 0:
        return f" This route's rating is based on all {total} of its miles."
    with_data = miles_from_metres(winner.summary.metres_by_level.with_data)
    return (
        f" This route's rating is based on {with_data} of its {total} miles; the rest has no data."
    )


def _recommend_none(ineligible: list[Candidate]) -> Recommendation:
    reasons = _reasons_of(ineligible)
    has_data = any(c.summary.metres_by_level.with_data > 0 for c in ineligible)
    least_bad = ineligible[0].route_id if has_data else None
    sentence = NO_ROUTE_SENTENCES[reasons] + LEAVE_LATER_ADVICE
    if least_bad is not None:
        sentence += LEAST_BAD_NOTE
    return Recommendation(RecommendationStatus.NONE_ELIGIBLE, None, least_bad, None, sentence)


def _reasons_of(ineligible: list[Candidate]) -> frozenset[IneligibleReason]:
    reasons = (c.summary.ineligible_reason for c in ineligible)
    return frozenset(reason for reason in reasons if reason is not None)
