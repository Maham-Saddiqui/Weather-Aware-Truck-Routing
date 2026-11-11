import json
from decimal import Decimal

import httpx
import pytest

from providers.http import CONNECT_TIMEOUT_S, USER_AGENT, make_client
from providers.routing.polyline import decode_polyline
from providers.routing.port import RoutingProviderName
from providers.routing.valhalla import READ_TIMEOUT_S, ValhallaRouting
from tests.fakes.polyline import encode_polyline
from tests.fakes.valhalla import (
    BASE_URL,
    QUERY,
    adapter,
    answering,
    instant_limiter,
    line_of,
    success_body,
    trip_json,
)


def test_the_adapter_names_itself_as_the_backup_provider() -> None:
    assert adapter(answering(200, success_body())).name is RoutingProviderName.VALHALLA


def test_the_request_asks_for_a_truck_route_with_the_weight_in_tonnes() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, text=success_body())

    adapter(handler).routes(QUERY)

    request = seen[0]
    body = json.loads(request.content)
    assert str(request.url) == f"{BASE_URL}/route"
    assert request.headers["user-agent"] == USER_AGENT
    assert request.extensions["timeout"]["connect"] == CONNECT_TIMEOUT_S
    assert request.extensions["timeout"]["read"] == READ_TIMEOUT_S
    assert body["costing"] == "truck"
    assert body["costing_options"] == {"truck": {"weight": 34.02}}
    assert body["alternates"] == 1
    assert body["locations"] == [{"lat": 35.0, "lon": -100.0}, {"lat": 35.0, "lon": -99.0}]


def test_a_trailing_slash_in_the_base_url_is_harmless() -> None:
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(str(request.url))
        return httpx.Response(200, text=success_body())

    client = make_client(READ_TIMEOUT_S, httpx.MockTransport(handler))
    ValhallaRouting(client, BASE_URL + "/", instant_limiter()).routes(QUERY)

    assert seen == [f"{BASE_URL}/route"]


def test_a_trip_becomes_a_route_with_whole_metres_and_seconds() -> None:
    (route,) = adapter(answering(200, success_body())).routes(QUERY)

    assert route.distance_m == 12_345
    assert route.travel_time_s == 900
    assert route.geometry.precision == 6
    assert route.geometry.encoded == encode_polyline(line_of(25), 6)
    assert route.path == decode_polyline(route.geometry.encoded, 6)
    assert [point.lon for point in route.path] == pytest.approx(
        [point.lon for point in line_of(25)], abs=1e-6
    )


def test_alternates_follow_the_main_route_in_the_provider_order() -> None:
    routes = adapter(answering(200, success_body(alternates=2))).routes(QUERY)

    assert [route.distance_m for route in routes] == [12_345, 15_500, 15_500]


def test_a_response_without_alternates_gives_just_the_main_route() -> None:
    body = f'{{"trip": {trip_json()}}}'

    assert len(adapter(answering(200, body)).routes(QUERY)) == 1


def test_rr14_rr15_the_progress_table_spreads_distance_and_time_in_proportion() -> None:
    (route,) = adapter(answering(200, success_body())).routes(QUERY)

    assert [entry.point_index for entry in route.progress] == [0, 10, 20, 24]
    first, middle, _, last = route.progress
    assert (first.distance_m, first.elapsed_s) == (0, 0)
    assert middle.distance_m == pytest.approx(12_345 * 10 / 24, abs=2)
    assert middle.elapsed_s == pytest.approx(900 * 10 / 24, abs=1)
    assert (last.distance_m, last.elapsed_s) == (12_345, 900)


def test_rr02_rr30_progress_rounds_halves_up_in_exact_decimals(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """RR-02, RR-30: the midpoint of 12,345 m and 901 s is 6,172.5 m and 450.5 s."""
    equal_steps = [Decimal(step) for step in range(21)]
    monkeypatch.setattr("providers.routing.valhalla._cumulative_metres", lambda path: equal_steps)
    body = f'{{"trip": {trip_json(point_count=21, time_s="901.0")}}}'

    (route,) = adapter(answering(200, body)).routes(QUERY)

    middle = route.progress[1]
    assert (middle.point_index, middle.distance_m, middle.elapsed_s) == (10, 6_173, 451)


def test_a_route_of_a_single_point_has_a_one_entry_progress_table() -> None:
    body = f'{{"trip": {trip_json(point_count=1)}}}'

    (route,) = adapter(answering(200, body)).routes(QUERY)

    assert [(entry.distance_m, entry.elapsed_s) for entry in route.progress] == [(0, 0)]
