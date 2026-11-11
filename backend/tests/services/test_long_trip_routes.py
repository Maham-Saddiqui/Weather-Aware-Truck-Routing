from dataclasses import replace

import pytest

from providers.routing.port import (
    NoRouteFound,
    RoutePreference,
    RoutingProviderName,
    RoutingUnavailable,
)
from services.compare_trip import plan_compare_trip
from tests.fakes.bundle import FakeCallGuard
from tests.fakes.routing import Outcome, ScriptedRouting
from tests.fakes.trips import route_bent, trip_environment
from tests.services.test_trip_class import trip_of_miles

FASTEST, ECO = RoutePreference.FASTEST, RoutePreference.ECO
STRAIGHT, NORTHERN, FAR_NORTHERN = 0.0, 0.6, 1.2
LONG_TRIP = trip_of_miles(1500)


def test_a_long_trip_shows_three_routes_from_two_alternatives_and_one_eco_route() -> None:
    """REQ-03"""
    tomtom = ScriptedRouting(
        {
            (FASTEST, 2): (route_bent(STRAIGHT), route_bent(NORTHERN)),
            (ECO, 0): (route_bent(FAR_NORTHERN),),
        }
    )

    result = plan_compare_trip(trip_environment(routing=tomtom), LONG_TRIP)

    assert len(result.routes) == 3
    assert result.routing_provider is RoutingProviderName.TOMTOM
    assert len(tomtom.asked(FASTEST, 2)) == len(tomtom.asked(ECO, 0)) == 1


def test_the_long_trip_eco_route_is_dropped_when_it_follows_a_road_fastest_already_has() -> None:
    """REQ-03"""
    tomtom = ScriptedRouting(
        {
            (FASTEST, 2): (route_bent(STRAIGHT), route_bent(NORTHERN)),
            (ECO, 0): (route_bent(STRAIGHT),),
        }
    )

    result = plan_compare_trip(trip_environment(routing=tomtom), LONG_TRIP)

    assert len(result.routes) == 2


def test_a_failing_eco_call_on_a_long_trip_is_ignored() -> None:
    """REQ-03"""
    tomtom = ScriptedRouting(
        {
            (FASTEST, 2): (route_bent(STRAIGHT), route_bent(NORTHERN)),
            (ECO, 0): RoutingUnavailable("timed out"),
        }
    )

    result = plan_compare_trip(trip_environment(routing=tomtom), LONG_TRIP)

    assert len(result.routes) == 2
    assert result.routing_provider is RoutingProviderName.TOMTOM


def test_the_fastest_and_the_eco_call_of_a_long_trip_each_count_against_the_daily_budget() -> None:
    """SEC-07"""
    guard = FakeCallGuard()
    tomtom = ScriptedRouting(
        {(FASTEST, 2): (route_bent(STRAIGHT),), (ECO, 0): (route_bent(NORTHERN),)}
    )

    plan_compare_trip(trip_environment(routing=tomtom, call_guard=guard), LONG_TRIP)

    assert guard.acquired == 2


def test_a_spent_budget_for_the_eco_call_leaves_the_fastest_answer_alone() -> None:
    """SEC-07"""
    tomtom = ScriptedRouting(
        {(FASTEST, 2): (route_bent(STRAIGHT), route_bent(NORTHERN)), (ECO, 0): ()}
    )

    result = plan_compare_trip(
        trip_environment(routing=tomtom, call_guard=FakeCallGuard(allowed_calls=1)), LONG_TRIP
    )

    assert len(result.routes) == 2
    assert tomtom.asked(ECO, 0) == []


def timing_out_on_two_alternatives(**later: Outcome) -> ScriptedRouting:
    """Two alternatives time out; `later` scripts the one-alternative and single-route calls."""
    return ScriptedRouting(
        {
            (FASTEST, 2): RoutingUnavailable("timed out"),
            (ECO, 0): (route_bent(FAR_NORTHERN),),
            (FASTEST, 1): later["one"],
            (FASTEST, 0): later["single"],
        }
    )


def test_when_two_alternatives_time_out_one_alternative_is_asked_before_a_single_route() -> None:
    """REQ-03, REQ-12"""
    tomtom = timing_out_on_two_alternatives(
        one=(route_bent(STRAIGHT), route_bent(NORTHERN)), single=RoutingUnavailable("never asked")
    )
    backup = ScriptedRouting({}, RoutingProviderName.VALHALLA)

    result = plan_compare_trip(trip_environment(routing=tomtom, backup_routing=backup), LONG_TRIP)

    assert result.routing_provider is RoutingProviderName.TOMTOM
    assert len(result.routes) == 2
    assert tomtom.asked(FASTEST, 0) == []
    assert backup.calls == []


def test_the_one_alternative_question_is_the_fastest_query_with_a_smaller_count() -> None:
    """REQ-03"""
    tomtom = timing_out_on_two_alternatives(one=(route_bent(STRAIGHT),), single=())

    plan_compare_trip(trip_environment(routing=tomtom), LONG_TRIP)

    (two,) = tomtom.asked(FASTEST, 2)
    (one,) = tomtom.asked(FASTEST, 1)
    assert one == replace(two, max_alternatives=1)


def test_when_one_alternative_times_out_too_a_single_tomtom_route_answers_without_the_backup() -> (
    None
):
    """REQ-03, REQ-12, BE-07"""
    tomtom = timing_out_on_two_alternatives(
        one=RoutingUnavailable("timed out again"), single=(route_bent(STRAIGHT),)
    )
    backup = ScriptedRouting({}, RoutingProviderName.VALHALLA)

    result = plan_compare_trip(trip_environment(routing=tomtom, backup_routing=backup), LONG_TRIP)

    assert result.routing_provider is RoutingProviderName.TOMTOM
    assert len(result.routes) == 1
    assert backup.calls == []


def test_when_every_tomtom_tier_fails_the_backup_answers_once_after_one_try_per_tier() -> None:
    """BE-07"""
    tomtom = timing_out_on_two_alternatives(
        one=RoutingUnavailable("x"), single=RoutingUnavailable("y")
    )
    backup = ScriptedRouting(
        {(FASTEST, 2): (route_bent(STRAIGHT), route_bent(NORTHERN))}, RoutingProviderName.VALHALLA
    )

    result = plan_compare_trip(trip_environment(routing=tomtom, backup_routing=backup), LONG_TRIP)

    assert result.routing_provider is RoutingProviderName.VALHALLA
    assert len(result.routes) == 2
    assert [len(tomtom.asked(FASTEST, count)) for count in (2, 1, 0)] == [1, 1, 1]


def test_no_route_found_on_the_one_alternative_tier_is_an_answer_so_nothing_else_is_asked() -> None:
    """BE-07"""
    tomtom = timing_out_on_two_alternatives(one=NoRouteFound("none"), single=())
    backup = ScriptedRouting({}, RoutingProviderName.VALHALLA)

    with pytest.raises(NoRouteFound):
        plan_compare_trip(trip_environment(routing=tomtom, backup_routing=backup), LONG_TRIP)

    assert tomtom.asked(FASTEST, 0) == []
    assert backup.calls == []


def test_a_budget_spent_after_the_first_call_sends_the_long_trip_to_the_backup() -> None:
    """SEC-07: the guard allows the two-alternatives call only"""
    tomtom = timing_out_on_two_alternatives(one=(route_bent(STRAIGHT),), single=())
    backup = ScriptedRouting({(FASTEST, 2): (route_bent(STRAIGHT),)}, RoutingProviderName.VALHALLA)

    result = plan_compare_trip(
        trip_environment(
            routing=tomtom, backup_routing=backup, call_guard=FakeCallGuard(allowed_calls=1)
        ),
        LONG_TRIP,
    )

    assert result.routing_provider is RoutingProviderName.VALHALLA
    assert tomtom.asked(FASTEST, 1) == tomtom.asked(FASTEST, 0) == []


def test_each_fallback_tier_counts_against_the_daily_budget() -> None:
    """SEC-07: fastest, one alternative and single route are three calls in the main thread"""
    guard = FakeCallGuard()
    tomtom = timing_out_on_two_alternatives(
        one=RoutingUnavailable("x"), single=(route_bent(STRAIGHT),)
    )

    plan_compare_trip(trip_environment(routing=tomtom, call_guard=guard), LONG_TRIP)

    assert guard.acquired >= 3
