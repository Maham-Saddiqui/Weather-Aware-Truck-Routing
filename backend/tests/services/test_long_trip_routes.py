from providers.routing.port import RoutePreference, RoutingProviderName, RoutingUnavailable
from services.compare_trip import plan_compare_trip
from tests.fakes.bundle import FakeCallGuard
from tests.fakes.routing import ScriptedRouting
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
