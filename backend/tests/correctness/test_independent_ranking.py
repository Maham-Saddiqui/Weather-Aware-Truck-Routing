"""Independent check of ranking, least-bad pick and recommendation sentence (RR-22 to RR-26)."""

from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal

import pytest

from domain.ranking import Candidate, RecommendationStatus, rank_routes
from domain.summary import IneligibleReason, MetresByLevel, RouteSummary
from tests.correctness.expected_ranking import (
    LEAST_BAD_CASES,
    NO_DATA_SENTENCE_FACTS,
    NONE_ELIGIBLE_WORDS,
    ONLY_ELIGIBLE_CASE,
    RANKING_CASES,
    SENTENCE_CASES,
    LeastBadFact,
    RouteFact,
)

ONE_MILE_M = Decimal("1609.344")
DEPARTURE = datetime(2026, 11, 12, 12, tzinfo=UTC)
ZERO = Decimal(0)


def metres(miles: str) -> Decimal:
    return Decimal(miles) * ONE_MILE_M


def eligible_candidate(fact: RouteFact) -> Candidate:
    """The summary step has already rounded the average once to 0.01 (RR-25), so do the same."""
    route_id, severe, high, average, seconds, distance = fact
    rounded = str(Decimal(average).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    return Candidate(route_id, summary_of((route_id, severe, high, rounded, seconds, distance)))


def summary_of(
    fact: RouteFact,
    gaps: tuple[str, str] = ("0", "0"),
    reason: IneligibleReason | None = None,
) -> RouteSummary:
    """gaps are the No Travel and No data miles; the rest of the road is Low."""
    _, severe, high, average, seconds, distance = fact
    no_travel, no_data = gaps
    others = metres(high) + metres(severe) + metres(no_travel)
    low = max(metres(distance) - others - metres(no_data), ZERO)
    by_level = MetresByLevel(
        low, ZERO, metres(high), metres(severe), metres(no_travel), metres(no_data)
    )
    return RouteSummary(
        distance_m=metres(distance),
        travel_time_s=seconds,
        arrival_utc=DEPARTURE,
        metres_by_level=by_level,
        average_risk=Decimal(average),
        worst_level=None,
        ineligible_reason=reason,
    )


@pytest.mark.parametrize(
    ("why", "routes", "order", "criterion"), RANKING_CASES, ids=[c[0] for c in RANKING_CASES]
)
def test_eligible_routes_rank_by_severe_high_average_time_distance_then_provider_rr24_rr25(
    why: str, routes: list[RouteFact], order: list[str], criterion: str
) -> None:
    """RR-24 RR-25: the brief's order with comparison rounding (0.1 mile, 0.01, whole minutes)."""
    ranking = rank_routes([eligible_candidate(route) for route in routes])
    assert [ranked.route_id for ranked in ranking.display_order] == order, why
    assert [ranked.rank for ranked in ranking.display_order] == list(range(1, len(order) + 1)), why
    recommendation = ranking.recommendation
    assert recommendation.status is RecommendationStatus.RECOMMENDED
    assert recommendation.route_id == order[0], why
    assert recommendation.deciding_criterion is not None
    assert recommendation.deciding_criterion.value == criterion, why


def test_an_ineligible_route_is_never_ranked_or_recommended_rr22_rr24() -> None:
    """RR-22 RR-24: the only eligible route wins and is named as the only one."""
    why, eligible, ineligible = ONLY_ELIGIBLE_CASE
    bad = Candidate(ineligible[0], summary_of(ineligible, ("1", "0"), IneligibleReason.NO_TRAVEL))
    ranking = rank_routes([bad, eligible_candidate(eligible[0])])
    assert [(r.route_id, r.rank) for r in ranking.display_order] == [("B", 1), ("A", None)], why
    assert ranking.recommendation.route_id == "B"
    assert ranking.recommendation.deciding_criterion is not None
    assert ranking.recommendation.deciding_criterion.value == "only_eligible"


def ineligible_candidate(unsafe_fact: LeastBadFact) -> Candidate:
    route_id, no_travel, no_data, severe, high, average, seconds, distance = unsafe_fact
    reason = (
        IneligibleReason.NO_TRAVEL
        if Decimal(no_travel) > 0
        else IneligibleReason.NOT_ENOUGH_WEATHER_DATA
    )
    if reason is IneligibleReason.NOT_ENOUGH_WEATHER_DATA:
        assert Decimal(no_data) * 10 > Decimal(distance), "test data must break the 10 percent cap"
    shape = (route_id, severe, high, average, seconds, distance)
    return Candidate(route_id, summary_of(shape, (no_travel, no_data), reason))


@pytest.mark.parametrize(
    ("why", "routes", "order", "least_bad"), LEAST_BAD_CASES, ids=[c[0] for c in LEAST_BAD_CASES]
)
def test_with_no_eligible_route_the_least_bad_is_shown_first_and_unknown_miles_count_rr23(
    why: str, routes: list[LeastBadFact], order: list[str], least_bad: str
) -> None:
    """RR-23: fewest No Travel plus No data miles, then the RR-24 order; nothing is recommended."""
    ranking = rank_routes([ineligible_candidate(route) for route in routes])
    recommendation = ranking.recommendation
    assert recommendation.status is RecommendationStatus.NONE_ELIGIBLE, why
    assert recommendation.route_id is None, why
    assert recommendation.least_bad_route_id == least_bad, why
    assert [ranked.route_id for ranked in ranking.display_order] == order, why
    assert all(ranked.rank is None for ranked in ranking.display_order), why
    assert any(word in recommendation.sentence.lower() for word in NONE_ELIGIBLE_WORDS), why


@pytest.mark.parametrize("case", SENTENCE_CASES, ids=[c[0] for c in SENTENCE_CASES])
def test_the_sentence_names_the_criterion_that_separated_winner_and_runner_up_rr26(
    case: tuple[str, str, list[str]],
) -> None:
    """RR-26: one sentence about the first criterion that differs."""
    why, criterion, words = case
    if criterion == "only_eligible":
        routes = [("A", "1", "1", "1", 3600, "50")]
    else:
        routes = next(case[1] for case in RANKING_CASES if case[3] == criterion)
    sentence = rank_routes([eligible_candidate(r) for r in routes]).recommendation.sentence
    assert any(word in sentence.lower() for word in words), f"{why}: {sentence}"


def test_the_sentence_says_how_many_miles_the_rating_is_based_on_when_data_is_missing_rr26() -> (
    None
):
    """RR-26: winner rated on 95 of 100 miles; the sentence carries the number."""
    gap = NO_DATA_SENTENCE_FACTS[0]
    winner = Candidate("A", summary_of(("A", "0", "0", "0", 3600, "100"), ("0", gap)))
    runner_up = Candidate("B", summary_of(("B", "5", "0", "1", 3600, "100")))
    sentence = rank_routes([winner, runner_up]).recommendation.sentence
    assert NO_DATA_SENTENCE_FACTS[1] in sentence
