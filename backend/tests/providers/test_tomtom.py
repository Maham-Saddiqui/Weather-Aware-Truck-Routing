import json
from dataclasses import replace
from datetime import UTC, datetime, timedelta, timezone

import httpx
import pytest

from domain.types import GeoPoint
from providers.http import make_client
from providers.routing.port import (
    NoRouteFound,
    RoutePreference,
    RouteQuery,
    RoutingUnavailable,
)
from providers.routing.tomtom import TomTomAttribution, TomTomRouting
from tests.fakes.polyline import encode_polyline

FAKE_API_KEY = "fake-key-for-tests"
PATH = (GeoPoint(41.0, -87.0), GeoPoint(41.5, -87.5), GeoPoint(42.0, -88.0))
QUERY = RouteQuery(
    origin=PATH[0],
    destination=PATH[-1],
    depart_at=datetime(2026, 11, 12, 8, 0, tzinfo=UTC),
    vehicle_weight_kg=30_000,
    preference=RoutePreference.ECO,
    max_alternatives=2,
)


def route_payload(length_m: int = 100_000) -> dict[str, object]:
    return {
        "summary": {"lengthInMeters": length_m, "travelTimeInSeconds": 4_000},
        "legs": [{"encodedPolyline": encode_polyline(PATH, 5), "encodedPolylinePrecision": 5}],
        "progress": [
            {"pointIndex": 0, "travelTimeInSeconds": 0, "distanceInMeters": 0},
            {"pointIndex": 2, "travelTimeInSeconds": 4_000, "distanceInMeters": length_m},
        ],
    }


def routing_with(handler: httpx.MockTransport, key: str = FAKE_API_KEY) -> TomTomRouting:
    return TomTomRouting(key, make_client(1.0, handler))


def answering(status: int, body: object) -> httpx.MockTransport:
    return httpx.MockTransport(lambda request: httpx.Response(status, text=json.dumps(body)))


def test_a_route_answer_becomes_a_provider_route_with_its_progress_table() -> None:
    """RR-14, RR-15: distances and travel times are the provider's own"""
    transport = answering(200, {"routes": [route_payload()]})

    (route,) = routing_with(transport).routes(QUERY)

    assert route.distance_m == 100_000
    assert route.travel_time_s == 4_000
    assert route.geometry.precision == 5
    assert route.path == PATH
    assert [(p.point_index, p.distance_m, p.elapsed_s) for p in route.progress] == [
        (0, 0, 0),
        (2, 100_000, 4_000),
    ]


def test_alternatives_come_back_in_the_order_the_provider_sent_them() -> None:
    transport = answering(200, {"routes": [route_payload(100_000), route_payload(120_000)]})

    routes = routing_with(transport).routes(QUERY)

    assert [route.distance_m for route in routes] == [100_000, 120_000]


def test_the_request_asks_for_a_truck_route_with_weight_departure_and_progress_table() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"routes": [route_payload()]})

    routing_with(httpx.MockTransport(handler)).routes(QUERY)

    request = seen[0]
    assert request.url.path == "/routing/1/calculateRoute/41.0,-87.0:42.0,-88.0/json"
    assert request.url.params["travelMode"] == "truck"
    assert request.url.params["vehicleCommercial"] == "true"
    assert request.url.params["vehicleWeight"] == "30000"
    assert request.url.params["departAt"] == "2026-11-12T08:00:00+00:00"
    assert request.url.params["routeType"] == "eco"
    assert request.url.params["maxAlternatives"] == "2"
    assert request.url.params["routeRepresentation"] == "encodedPolyline"
    assert request.url.params.get_list("extendedRouteRepresentation") == ["distance", "travelTime"]
    assert request.headers["User-Agent"] == "weather-aware-truck-routing/1.0"


def test_the_departure_is_sent_as_a_whole_second_utc_instant() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"routes": [route_payload()]})

    just_now = datetime(2026, 11, 11, 15, 40, 12, 345_678, tzinfo=timezone(timedelta(hours=5)))
    routing_with(httpx.MockTransport(handler)).routes(replace(QUERY, depart_at=just_now))

    assert seen[0].url.params["departAt"] == "2026-11-11T10:40:12+00:00"


def test_an_empty_route_list_means_no_route_found() -> None:
    with pytest.raises(NoRouteFound):
        routing_with(answering(200, {"routes": []})).routes(QUERY)


@pytest.mark.parametrize("marker", ["NO_ROUTE_FOUND", "MAP_MATCHING_FAILURE"])
def test_a_bad_request_naming_no_route_means_no_route_found_and_never_the_backup(
    marker: str,
) -> None:
    body = {"detailedError": {"code": marker, "message": "synthetic"}}

    with pytest.raises(NoRouteFound):
        routing_with(answering(400, body)).routes(QUERY)


@pytest.mark.parametrize("status", [400, 403, 404, 429, 500, 503])
def test_provider_failures_and_quota_or_key_errors_trigger_the_backup(status: int) -> None:
    with pytest.raises(RoutingUnavailable):
        routing_with(answering(status, {"error": "synthetic"})).routes(QUERY)


@pytest.mark.parametrize(
    "body",
    [
        {"routes": [{"summary": {}}]},
        {"unexpected": True},
        {"routes": [{**route_payload(), "legs": []}]},
    ],
)
def test_an_answer_we_cannot_read_triggers_the_backup(body: object) -> None:
    with pytest.raises(RoutingUnavailable):
        routing_with(answering(200, body)).routes(QUERY)


def test_text_that_is_not_json_triggers_the_backup() -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(200, text="<html>"))

    with pytest.raises(RoutingUnavailable):
        routing_with(transport).routes(QUERY)


def test_a_missing_key_triggers_the_backup_without_calling_the_provider() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("must not be called")

    with pytest.raises(RoutingUnavailable):
        routing_with(httpx.MockTransport(handler), key="").routes(QUERY)


def test_a_network_error_is_retried_once_then_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("providers.http.time.sleep", lambda seconds: None)
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        if len(calls) == 1:
            raise httpx.ConnectError("synthetic", request=request)
        return httpx.Response(200, json={"routes": [route_payload()]})

    routes = routing_with(httpx.MockTransport(handler)).routes(QUERY)

    assert len(routes) == 1
    assert len(calls) == 2


def test_two_network_errors_trigger_the_backup_and_leak_nothing_about_the_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("providers.http.time.sleep", lambda seconds: None)

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout(f"synthetic {request.url}", request=request)

    with pytest.raises(RoutingUnavailable) as raised:
        routing_with(httpx.MockTransport(handler)).routes(QUERY)

    assert FAKE_API_KEY not in str(raised.value)
    assert raised.value.__cause__ is None
    assert raised.value.__suppress_context__


def test_a_body_that_cannot_be_decoded_is_unavailable_and_never_a_crash() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.DecodingError("synthetic broken gzip", request=request)

    with pytest.raises(RoutingUnavailable):
        routing_with(httpx.MockTransport(handler)).routes(QUERY)


def test_an_error_status_is_not_retried() -> None:
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(500)

    with pytest.raises(RoutingUnavailable):
        routing_with(httpx.MockTransport(handler)).routes(QUERY)

    assert len(calls) == 1


def test_the_copyright_text_is_fetched_fresh_on_every_call() -> None:
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(200, json={"copyrightsCaption": "Synthetic credit"})

    attribution = TomTomAttribution(FAKE_API_KEY, make_client(1.0, httpx.MockTransport(handler)))

    assert attribution.routing_copyright() == "Synthetic credit"
    assert attribution.routing_copyright() == "Synthetic credit"
    assert len(calls) == 2


@pytest.mark.parametrize(
    "body", [{"other": 1}, {"copyrightsCaption": None}, {"copyrightsCaption": ""}, [], "text", 7]
)
def test_an_unreadable_copyright_answer_is_a_routing_failure_never_the_text_none(
    body: object,
) -> None:
    """BE-07"""
    attribution = TomTomAttribution(FAKE_API_KEY, make_client(1.0, answering(200, body)))

    with pytest.raises(RoutingUnavailable):
        attribution.routing_copyright()


@pytest.mark.parametrize("body", [[], "text", 7, None])
def test_a_route_answer_that_is_not_a_json_object_is_a_routing_failure(body: object) -> None:
    """BE-07"""
    with pytest.raises(RoutingUnavailable):
        routing_with(answering(200, body)).routes(QUERY)
