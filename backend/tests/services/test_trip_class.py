from dataclasses import replace
from decimal import Decimal
from math import degrees

import httpx
import pytest

from domain.constants import METRES_PER_MILE
from domain.distance import EARTH_RADIUS_M
from domain.types import GeoPoint
from providers.http import make_client
from providers.routing.tomtom import TomTomRouting
from services import trip_class
from services.compare_trip import plan_compare_trip
from services.trip_class import (
    LONG_TRIP,
    MAX_ROUTES_SHOWN,
    NORMAL_TRIP,
    ONE_ALTERNATIVE_READ_TIMEOUT_S,
    TIER_NONE,
    TIER_ONE,
    WEATHER_AND_RATING_RESERVE_S,
    classify,
)
from services.trip_request import TripRequest
from tests.fakes.trips import trip_environment, trip_request
from tests.providers.test_tomtom import route_payload

START = GeoPoint(30.0, -100.0)
EXPECTED_CLIENT_READ_TIMEOUT_S = 8.0


def trip_of_miles(miles: float) -> TripRequest:
    """A due-north trip whose straight line is `miles` long."""
    degrees_north = degrees(miles * float(METRES_PER_MILE) / EARTH_RADIUS_M)
    return replace(trip_request(), origin=START, destination=GeoPoint(30.0 + degrees_north, -100.0))


def test_a_trip_of_999_straight_line_miles_is_a_normal_trip() -> None:
    """REQ-03"""
    trip = classify(trip_of_miles(999))

    assert not trip.long_trip
    assert replace(trip, straight_line_miles=0) == NORMAL_TRIP


def test_a_trip_of_1000_straight_line_miles_is_a_long_trip(monkeypatch: pytest.MonkeyPatch) -> None:
    """REQ-03: the boundary itself counts as long"""
    monkeypatch.setattr(trip_class, "straight_line_miles", lambda start, end: Decimal(1000))

    trip = classify(trip_of_miles(5))

    assert replace(trip, straight_line_miles=0) == LONG_TRIP


def test_a_trip_just_over_1000_straight_line_miles_is_a_long_trip() -> None:
    """REQ-03"""
    assert classify(trip_of_miles(1001)).long_trip


def test_a_long_trip_asks_for_the_same_alternatives_waits_longer_and_asks_eco_for_none() -> None:
    """REQ-03"""
    assert LONG_TRIP.alternatives == NORMAL_TRIP.alternatives == MAX_ROUTES_SHOWN - 1
    assert (LONG_TRIP.eco_alternatives, NORMAL_TRIP.eco_alternatives) == (0, 2)
    assert LONG_TRIP.alternatives_read_timeout_s > NORMAL_TRIP.alternatives_read_timeout_s
    assert (LONG_TRIP.deadline_s, NORMAL_TRIP.deadline_s) == (40.0, None)


def test_the_logged_straight_line_miles_are_rounded_to_the_nearest_ten() -> None:
    assert classify(trip_of_miles(1374)).straight_line_miles == 1370
    assert classify(trip_of_miles(1376)).straight_line_miles == 1380


def tomtom_over_a_recording_transport() -> tuple[TomTomRouting, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"routes": [route_payload()]})

    return TomTomRouting(
        "fake-key-for-tests",
        make_client(EXPECTED_CLIENT_READ_TIMEOUT_S, httpx.MockTransport(handler)),
    ), seen


def test_a_long_trip_sends_fastest_with_two_alternatives_and_eco_alone_each_with_its_wait() -> None:
    """REQ-03, BE-08"""
    tomtom, seen = tomtom_over_a_recording_transport()

    plan_compare_trip(trip_environment(routing=tomtom), trip_of_miles(1500))

    by_type = {request.url.params["routeType"]: request for request in seen}
    assert by_type["fastest"].url.params["maxAlternatives"] == "2"
    assert by_type["fastest"].extensions["timeout"]["read"] == LONG_TRIP.alternatives_read_timeout_s
    assert by_type["eco"].url.params["maxAlternatives"] == "0"
    assert by_type["eco"].extensions["timeout"]["read"] == EXPECTED_CLIENT_READ_TIMEOUT_S


def test_a_normal_trip_sends_fastest_and_eco_calls_with_two_alternatives_and_the_normal_wait() -> (
    None
):
    """REQ-03, BE-08"""
    tomtom, seen = tomtom_over_a_recording_transport()

    plan_compare_trip(trip_environment(routing=tomtom), trip_of_miles(500))

    assert {request.url.params["maxAlternatives"] for request in seen} == {"2"}
    assert {request.url.params["routeType"] for request in seen} == {"fastest", "eco"}
    waits = {request.extensions["timeout"]["read"] for request in seen}
    assert waits == {NORMAL_TRIP.alternatives_read_timeout_s}


def test_the_waits_of_every_long_trip_tier_plus_the_weather_reserve_fit_in_the_long_deadline() -> (
    None
):
    """REQ-03, BE-08: the worst case is every TomTom call using its whole read timeout"""
    tier_waits = [tier.read_timeout_s for tier in LONG_TRIP.fallback_tiers]

    assert None not in tier_waits
    assert LONG_TRIP.deadline_s is not None
    routing_worst_case_s = LONG_TRIP.alternatives_read_timeout_s + sum(filter(None, tier_waits))
    assert routing_worst_case_s + WEATHER_AND_RATING_RESERVE_S <= LONG_TRIP.deadline_s


def test_a_long_trip_steps_down_from_two_alternatives_to_one_then_to_a_single_route() -> None:
    """REQ-03"""
    steps = [(tier.name, tier.alternatives) for tier in LONG_TRIP.fallback_tiers]

    assert steps == [(TIER_ONE, 1), (TIER_NONE, 0)]
    assert [tier.name for tier in NORMAL_TRIP.fallback_tiers] == [TIER_NONE]


def tomtom_timing_out_on_two_alternatives() -> tuple[TomTomRouting, list[httpx.Request]]:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.params["maxAlternatives"] == "2":
            raise httpx.ReadTimeout("timed out", request=request)
        return httpx.Response(200, json={"routes": [route_payload()]})

    client = make_client(EXPECTED_CLIENT_READ_TIMEOUT_S, httpx.MockTransport(handler))
    return TomTomRouting("fake-key-for-tests", client), seen


def test_a_timed_out_two_alternatives_call_is_not_repeated_and_the_next_tier_waits_its_own() -> (
    None
):
    """REQ-03, BE-08"""
    tomtom, seen = tomtom_timing_out_on_two_alternatives()

    plan_compare_trip(trip_environment(routing=tomtom), trip_of_miles(1500))

    two = [r for r in seen if r.url.params["maxAlternatives"] == "2"]
    (one,) = [r for r in seen if r.url.params["maxAlternatives"] == "1"]
    assert len(two) == 1
    assert one.url.params["routeType"] == "fastest"
    assert one.extensions["timeout"]["read"] == ONE_ALTERNATIVE_READ_TIMEOUT_S
