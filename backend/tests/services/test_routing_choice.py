from dataclasses import replace
from datetime import timedelta

import pytest

from providers.routing.port import (
    NoRouteFound,
    RoutePreference,
    RouteQuery,
    RoutingProviderName,
    RoutingUnavailable,
)
from services.compare_trip import plan_compare_trip
from services.primary_trip import plan_primary_trip
from tests.fakes.bundle import NOW, FakeCallGuard
from tests.fakes.routing import FakeRouting, Outcome
from tests.fakes.trips import route_bent, tomtom_answering, trip_environment, trip_request

FASTEST = RoutePreference.FASTEST
VALHALLA = RoutingProviderName.VALHALLA


def valhalla_with(*bends: float) -> FakeRouting:
    return FakeRouting({FASTEST: tuple(route_bent(bend) for bend in bends)}, VALHALLA)


def test_when_tomtom_is_unavailable_the_backup_answers_and_says_so() -> None:
    """BE-07, REQ-12"""
    tomtom = FakeRouting({FASTEST: RoutingUnavailable("down")})

    result = plan_primary_trip(trip_environment(routing=tomtom), trip_request())

    assert result.routing_provider is VALHALLA


def test_when_the_daily_budget_is_spent_tomtom_is_not_called_at_all() -> None:
    """SEC-07"""
    tomtom = tomtom_answering((route_bent(0.0),))

    result = plan_primary_trip(
        trip_environment(routing=tomtom, call_guard=FakeCallGuard(allowed=False)), trip_request()
    )

    assert tomtom.calls == []
    assert result.routing_provider is VALHALLA


def test_no_route_is_an_answer_not_a_failure_so_the_backup_is_never_tried() -> None:
    """BE-07"""
    tomtom = FakeRouting({FASTEST: NoRouteFound("none")})
    backup = valhalla_with(0.2)

    with pytest.raises(NoRouteFound):
        plan_primary_trip(trip_environment(routing=tomtom, backup_routing=backup), trip_request())

    assert backup.calls == []


def test_when_the_backup_fails_too_the_failure_is_reported() -> None:
    both_down = FakeRouting({FASTEST: RoutingUnavailable("down")}, VALHALLA)

    with pytest.raises(RoutingUnavailable):
        plan_primary_trip(
            trip_environment(
                routing=FakeRouting({FASTEST: RoutingUnavailable("down")}), backup_routing=both_down
            ),
            trip_request(),
        )


def test_the_compare_backup_never_mixes_in_routes_from_tomtoms_eco_call() -> None:
    """BE-07, architecture section 6"""
    tomtom = FakeRouting(
        {FASTEST: RoutingUnavailable("down"), RoutePreference.ECO: (route_bent(1.5),)}
    )

    result = plan_compare_trip(
        trip_environment(routing=tomtom, backup_routing=valhalla_with(0.0, 0.6)), trip_request()
    )

    assert result.routing_provider is VALHALLA
    assert len(result.routes) == 2


def test_a_spent_budget_sends_compare_to_the_backup_without_calling_tomtom() -> None:
    """SEC-07"""
    tomtom = tomtom_answering((route_bent(0.0),))

    result = plan_compare_trip(
        trip_environment(
            routing=tomtom,
            backup_routing=valhalla_with(0.0),
            call_guard=FakeCallGuard(allowed=False),
        ),
        trip_request(),
    )

    assert tomtom.calls == []
    assert result.routing_provider is VALHALLA


def test_compare_with_no_route_found_does_not_try_the_backup() -> None:
    """BE-07"""
    tomtom = FakeRouting({FASTEST: NoRouteFound("none"), RoutePreference.ECO: ()})
    backup = valhalla_with(0.0)

    with pytest.raises(NoRouteFound):
        plan_compare_trip(trip_environment(routing=tomtom, backup_routing=backup), trip_request())

    assert backup.calls == []


def test_each_tomtom_call_counts_against_the_daily_budget() -> None:
    """SEC-07"""
    guard = FakeCallGuard()
    tomtom = tomtom_answering((route_bent(0.0),), (route_bent(0.6),))

    plan_compare_trip(trip_environment(routing=tomtom, call_guard=guard), trip_request())

    assert guard.acquired == 2


def test_the_current_hour_departure_sent_to_the_provider_is_never_in_the_past() -> None:
    """RR-29"""
    tomtom = tomtom_answering((route_bent(0.0),), (route_bent(0.6),))
    minutes_ago = replace(trip_request(), departure_utc=NOW - timedelta(minutes=25))

    plan_compare_trip(trip_environment(routing=tomtom), minutes_ago)

    assert {query.depart_at for query in tomtom.calls} == {NOW}


def test_a_later_departure_is_sent_to_the_provider_unchanged() -> None:
    """RR-29"""
    tomtom = tomtom_answering((route_bent(0.0),))

    plan_primary_trip(trip_environment(routing=tomtom), trip_request())

    assert [query.depart_at for query in tomtom.calls] == [NOW + timedelta(hours=3)]


def alternatives_calls(tomtom: FakeRouting) -> list[RouteQuery]:
    return [query for query in tomtom.calls if query.max_alternatives > 0]


def single_route_calls(tomtom: FakeRouting) -> list[RouteQuery]:
    return [query for query in tomtom.calls if query.max_alternatives == 0]


def timing_out_on_alternatives(single_route: Outcome) -> FakeRouting:
    return FakeRouting(
        {FASTEST: RoutingUnavailable("timed out"), RoutePreference.ECO: ()},
        without_alternatives=single_route,
    )


def test_compare_asks_tomtom_for_the_routes_it_shows_minus_the_main_one() -> None:
    """REQ-03"""
    tomtom = tomtom_answering((route_bent(0.0),), (route_bent(0.6),))

    plan_compare_trip(trip_environment(routing=tomtom), trip_request())

    assert {query.max_alternatives for query in tomtom.calls} == {2}


def test_when_alternatives_time_out_one_tomtom_route_answers_without_the_backup() -> None:
    """REQ-03, REQ-12, BE-07: a long trip still gets its fastest route, from TomTom"""
    tomtom = timing_out_on_alternatives((route_bent(0.0),))
    backup = valhalla_with(0.0, 0.6)

    result = plan_compare_trip(
        trip_environment(routing=tomtom, backup_routing=backup), trip_request()
    )

    assert result.routing_provider is RoutingProviderName.TOMTOM
    assert len(result.routes) == 1
    assert backup.calls == []
    assert len(alternatives_calls(tomtom)) == 2
    assert [query.preference for query in single_route_calls(tomtom)] == [FASTEST]


def test_the_single_route_fallback_is_the_same_query_the_primary_sends() -> None:
    """REQ-03"""
    tomtom = timing_out_on_alternatives((route_bent(0.0),))

    plan_compare_trip(trip_environment(routing=tomtom), trip_request())

    (single,) = single_route_calls(tomtom)
    (alternatives,) = [q for q in alternatives_calls(tomtom) if q.preference is FASTEST]
    assert single == replace(alternatives, max_alternatives=0)


def test_when_the_single_route_fails_too_the_backup_answers() -> None:
    """BE-07"""
    tomtom = timing_out_on_alternatives(RoutingUnavailable("timed out again"))

    result = plan_compare_trip(
        trip_environment(routing=tomtom, backup_routing=valhalla_with(0.0, 0.6)), trip_request()
    )

    assert result.routing_provider is VALHALLA
    assert len(result.routes) == 2


def test_no_route_found_on_the_single_route_call_is_still_an_answer_not_a_failure() -> None:
    """BE-07"""
    tomtom = timing_out_on_alternatives(NoRouteFound("none"))
    backup = valhalla_with(0.0)

    with pytest.raises(NoRouteFound):
        plan_compare_trip(trip_environment(routing=tomtom, backup_routing=backup), trip_request())

    assert backup.calls == []


def test_a_spent_budget_stops_the_single_route_fallback_and_the_backup_answers() -> None:
    """SEC-07: the guard allows the alternatives call only"""
    tomtom = timing_out_on_alternatives((route_bent(0.0),))

    result = plan_compare_trip(
        trip_environment(
            routing=tomtom,
            backup_routing=valhalla_with(0.0),
            call_guard=FakeCallGuard(allowed_calls=1),
        ),
        trip_request(),
    )

    assert single_route_calls(tomtom) == []
    assert result.routing_provider is VALHALLA


def test_the_single_route_fallback_counts_against_the_daily_budget() -> None:
    """SEC-07"""
    guard = FakeCallGuard()
    tomtom = timing_out_on_alternatives((route_bent(0.0),))

    plan_compare_trip(trip_environment(routing=tomtom, call_guard=guard), trip_request())

    assert len(single_route_calls(tomtom)) == 1
    assert guard.acquired >= 2
