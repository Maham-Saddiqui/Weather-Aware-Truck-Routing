from decimal import Decimal

import pytest

from domain.levels import Level
from domain.ranking import (
    Candidate,
    DecidingCriterion,
    RankedRoute,
    RecommendationStatus,
    rank_routes,
)
from domain.units import miles_from_metres
from tests.domain.builders import summary_of

LOW, MODERATE, HIGH, SEVERE, NO_TRAVEL = (
    Level.LOW,
    Level.MODERATE,
    Level.HIGH,
    Level.SEVERE,
    Level.NO_TRAVEL,
)


def candidate(
    route_id: str, miles: list[str], levels: list[Level | None], travel_time_s: int = 3600
) -> Candidate:
    return Candidate(route_id, summary_of(miles, levels, travel_time_s))


def recommended_by(*candidates: Candidate) -> DecidingCriterion | None:
    return rank_routes(candidates).recommendation.deciding_criterion


def test_rr24_fewest_severe_miles_wins_first() -> None:
    """RR-24."""
    fast_but_severe = candidate("a", ["90", "10"], [LOW, SEVERE], travel_time_s=3000)
    slower_but_calm = candidate("b", ["100"], [LOW], travel_time_s=4000)

    ranking = rank_routes([fast_but_severe, slower_but_calm])

    assert ranking.recommendation.route_id == "b"
    assert ranking.recommendation.deciding_criterion is DecidingCriterion.SEVERE_MILES
    assert ranking.display_order == (RankedRoute("b", 1), RankedRoute("a", 2))


def test_rr26_the_sentence_names_the_criterion_and_both_numbers() -> None:
    """RR-26."""
    ranking = rank_routes(
        [candidate("a", ["90", "10"], [LOW, SEVERE]), candidate("b", ["100"], [LOW])]
    )

    assert ranking.recommendation.sentence == (
        "Route 1 has fewer Severe-weather miles than Route 2 (0.0 against 10.0 miles)."
    )


def test_rr24_fewest_high_miles_decides_when_severe_miles_are_equal() -> None:
    """RR-24, RR-26."""
    with_high = candidate("a", ["80", "20"], [LOW, HIGH])
    without_high = candidate("b", ["100"], [LOW])

    ranking = rank_routes([with_high, without_high])

    assert ranking.recommendation.deciding_criterion is DecidingCriterion.HIGH_MILES
    assert ranking.recommendation.sentence == (
        "Route 1 has fewer High-risk-weather miles than Route 2 (0.0 against 20.0 miles)."
    )


def test_rr24_lowest_average_risk_decides_when_severe_and_high_miles_are_equal() -> None:
    """RR-24."""
    some_moderate = candidate("a", ["80", "20"], [LOW, MODERATE])
    all_low = candidate("b", ["100"], [LOW])

    ranking = rank_routes([some_moderate, all_low])

    assert ranking.recommendation.route_id == "b"
    assert ranking.recommendation.deciding_criterion is DecidingCriterion.AVERAGE_RISK
    assert ranking.recommendation.sentence == (
        "Route 1 has a lower average risk than Route 2 (0.00 against 0.20 on a scale of 0 to 4)."
    )


def test_rr24_shortest_travel_time_decides_when_the_risks_are_equal() -> None:
    """RR-24."""
    slow = candidate("a", ["100"], [LOW], travel_time_s=4200)
    quick = candidate("b", ["100"], [LOW], travel_time_s=3600)

    ranking = rank_routes([slow, quick])

    assert ranking.recommendation.route_id == "b"
    assert ranking.recommendation.deciding_criterion is DecidingCriterion.TRAVEL_TIME
    assert (
        ranking.recommendation.sentence
        == "Route 1 is quicker: 1 h 0 min against 1 h 10 min for Route 2."
    )


def test_rr25_shorter_distance_wins_when_the_travel_time_is_equal_to_the_minute() -> None:
    """RR-25."""
    longer = candidate("a", ["101"], [LOW], travel_time_s=3629)
    shorter = candidate("b", ["100"], [LOW], travel_time_s=3600)

    ranking = rank_routes([longer, shorter])

    assert ranking.recommendation.route_id == "b"
    assert ranking.recommendation.deciding_criterion is DecidingCriterion.DISTANCE
    assert ranking.recommendation.sentence == (
        "Route 1 is shorter than Route 2 (100.0 against 101.0 miles)."
    )


def test_rr25_the_providers_order_decides_when_everything_else_is_equal() -> None:
    """RR-25."""
    first = candidate("a", ["100"], [LOW])
    second = candidate("b", ["100"], [LOW])

    ranking = rank_routes([first, second])

    assert ranking.recommendation.route_id == "a"
    assert ranking.recommendation.deciding_criterion is DecidingCriterion.PROVIDER_ORDER
    assert ranking.display_order == (RankedRoute("a", 1), RankedRoute("b", 2))
    assert ranking.recommendation.sentence == (
        "Route 1 ties with Route 2 on every measure, so the provider's first is used."
    )


def test_rr25_miles_that_differ_by_less_than_a_tenth_of_a_mile_count_as_equal() -> None:
    """RR-25."""
    noise = candidate("a", ["90", "10.04"], [LOW, SEVERE], travel_time_s=3600)
    exact = candidate("b", ["90", "10"], [LOW, SEVERE], travel_time_s=3500)

    assert recommended_by(noise, exact) is DecidingCriterion.TRAVEL_TIME


def test_rr25_travel_times_that_round_to_the_same_minute_count_as_equal() -> None:
    """RR-25."""
    first = candidate("a", ["100"], [LOW], travel_time_s=3629)
    second = candidate("b", ["100"], [LOW], travel_time_s=3571)

    assert recommended_by(first, second) is DecidingCriterion.PROVIDER_ORDER


def test_rr26_a_single_eligible_route_is_recommended_because_it_is_the_only_one() -> None:
    """RR-26."""
    blocked = candidate("a", ["50", "50"], [LOW, NO_TRAVEL])
    open_road = candidate("b", ["100"], [MODERATE])

    ranking = rank_routes([blocked, open_road])

    assert ranking.recommendation.status is RecommendationStatus.RECOMMENDED
    assert ranking.recommendation.route_id == "b"
    assert ranking.recommendation.deciding_criterion is DecidingCriterion.ONLY_ELIGIBLE
    assert ranking.recommendation.least_bad_route_id is None


def test_rr26_a_trip_with_one_route_is_not_told_it_beat_other_routes() -> None:
    """RR-26."""
    ranking = rank_routes([candidate("a", ["100"], [LOW])])

    sentence = ranking.recommendation.sentence
    assert ranking.recommendation.deciding_criterion is DecidingCriterion.ONLY_ELIGIBLE
    assert sentence == (
        "Route 1 is the only route found, and it has no No Travel conditions "
        "and enough weather data."
    )


def test_rr26_an_only_eligible_route_next_to_blocked_ones_keeps_its_sentence() -> None:
    """RR-26."""
    blocked = candidate("a", ["50", "50"], [LOW, NO_TRAVEL])
    open_road = candidate("b", ["100"], [MODERATE])

    sentence = rank_routes([blocked, open_road]).recommendation.sentence

    assert sentence == (
        "Route 1 is the only route without No Travel conditions and with enough weather data."
    )


def test_rr23_ranked_routes_come_first_then_ineligible_routes_least_bad_first() -> None:
    """RR-23."""
    worse_blocked = candidate("a", ["50", "50"], [LOW, NO_TRAVEL])
    calm = candidate("b", ["100"], [LOW])
    less_blocked = candidate("c", ["90", "10"], [LOW, NO_TRAVEL])

    ranking = rank_routes([worse_blocked, calm, less_blocked])

    assert ranking.display_order == (
        RankedRoute("b", 1),
        RankedRoute("c", None),
        RankedRoute("a", None),
    )


def test_rr23_least_bad_route_example_counts_no_travel_plus_no_data_miles() -> None:
    """RR-23."""
    mostly_unknown = candidate("a", ["40", "60"], [LOW, None])
    two_no_travel_miles = candidate("b", ["98", "2"], [LOW, NO_TRAVEL])

    ranking = rank_routes([mostly_unknown, two_no_travel_miles])

    recommendation = ranking.recommendation
    assert recommendation.status is RecommendationStatus.NONE_ELIGIBLE
    assert recommendation.route_id is None
    assert recommendation.least_bad_route_id == "b"
    assert recommendation.deciding_criterion is None
    assert ranking.display_order == (RankedRoute("b", None), RankedRoute("a", None))


def test_rr23_the_none_eligible_sentence_says_why_and_suggests_leaving_later() -> None:
    """RR-23."""
    ranking = rank_routes([candidate("a", ["98", "2"], [LOW, NO_TRAVEL])])

    assert ranking.recommendation.sentence == (
        "No route is recommended: every route has at least one No Travel checkpoint. "
        "Consider leaving later. The least-bad route is shown greyed out, for information only."
    )


def test_rr23_when_the_reason_is_missing_weather_data_the_sentence_says_so() -> None:
    """RR-23."""
    ranking = rank_routes([candidate("a", ["30", "70"], [LOW, None])])

    assert "not enough weather data" in ranking.recommendation.sentence
    assert "No Travel" not in ranking.recommendation.sentence


def test_rr23_mixed_reasons_are_both_named() -> None:
    """RR-23."""
    blocked = candidate("a", ["50", "50"], [LOW, NO_TRAVEL])
    unknown = candidate("b", ["30", "70"], [LOW, None])

    sentence = rank_routes([blocked, unknown]).recommendation.sentence

    assert "No Travel checkpoint or not enough weather data" in sentence


def test_rr23_no_weather_data_anywhere_shows_routes_without_a_least_bad_pick() -> None:
    """RR-23."""
    ranking = rank_routes([candidate("a", ["50", "50"], [None, None])])

    assert ranking.recommendation.least_bad_route_id is None
    assert ranking.recommendation.status is RecommendationStatus.NONE_ELIGIBLE
    assert "greyed out" not in ranking.recommendation.sentence
    assert ranking.display_order == (RankedRoute("a", None),)


def test_rr26_the_sentence_says_how_many_miles_have_data_when_a_route_has_no_data_miles() -> None:
    """RR-26."""
    gaps = candidate("a", ["5", "90", "5"], [None, LOW, LOW])
    complete = candidate("b", ["100"], [MODERATE])

    ranking = rank_routes([gaps, complete])

    assert ranking.recommendation.route_id == "a"
    assert ranking.recommendation.sentence.endswith(
        "This route's rating is based on 95.0 of its 100.0 miles; the rest has no data."
    )
    assert miles_from_metres(gaps.summary.metres_by_level.no_data) == Decimal("5.0")


def test_rr26_the_sentence_has_no_data_note_when_every_route_is_fully_rated() -> None:
    """RR-26."""
    ranking = rank_routes([candidate("a", ["100"], [LOW]), candidate("b", ["100"], [MODERATE])])

    assert "no data" not in ranking.recommendation.sentence


def test_rr22_ranking_no_routes_at_all_is_refused_with_a_clear_message() -> None:
    """RR-22."""
    with pytest.raises(ValueError, match="At least one route is needed"):
        rank_routes([])


def test_rr26_a_fully_rated_winner_is_not_said_to_lack_data_because_another_route_does() -> None:
    """RR-26."""
    complete = candidate("a", ["100"], [LOW])
    gaps = candidate("b", ["5", "95"], [None, MODERATE])

    ranking = rank_routes([complete, gaps])

    assert ranking.recommendation.route_id == "a"
    assert ranking.recommendation.sentence.endswith(
        "This route's rating is based on all 100.0 of its miles."
    )
