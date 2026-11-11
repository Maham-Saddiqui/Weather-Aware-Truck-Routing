from dataclasses import replace
from decimal import Decimal
from math import degrees

import httpx
import pytest

from domain.constants import METRES_PER_MILE
from domain.distance import EARTH_RADIUS_M
from domain.types import GeoPoint
from providers.http import make_client
from providers.routing.port import RoutePreference
from providers.routing.tomtom import TomTomRouting
from services import trip_class
from services.compare_trip import plan_compare_trip
from services.trip_class import LONG_TRIP, NORMAL_TRIP, classify
from services.trip_request import TripRequest
from tests.fakes.trips import route_bent, tomtom_answering, trip_environment, trip_request
from tests.providers.test_tomtom import route_payload

START = GeoPoint(30.0, -100.0)


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


def test_a_long_trip_asks_for_one_alternative_waits_longer_and_skips_eco() -> None:
    """REQ-03"""
    assert (LONG_TRIP.alternatives, LONG_TRIP.asks_for_eco_routes) == (1, False)
    assert (NORMAL_TRIP.alternatives, NORMAL_TRIP.asks_for_eco_routes) == (2, True)
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

    return TomTomRouting("fake-key-for-tests", make_client(8.0, httpx.MockTransport(handler))), seen


def test_a_long_trip_sends_one_alternatives_call_with_one_alternative_and_the_long_wait() -> None:
    """REQ-03, BE-08"""
    tomtom, seen = tomtom_over_a_recording_transport()

    plan_compare_trip(trip_environment(routing=tomtom), trip_of_miles(1500))

    (request,) = seen
    assert request.url.params["maxAlternatives"] == "1"
    assert request.url.params["routeType"] == "fastest"
    assert request.extensions["timeout"]["read"] == LONG_TRIP.alternatives_read_timeout_s


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


def test_a_long_trip_never_calls_tomtom_for_eco_routes() -> None:
    """REQ-03"""
    tomtom = tomtom_answering((route_bent(0.0),), (route_bent(0.6),))

    plan_compare_trip(trip_environment(routing=tomtom), trip_of_miles(1500))

    assert {query.preference for query in tomtom.calls} == {RoutePreference.FASTEST}
    assert {query.max_alternatives for query in tomtom.calls} == {1}
