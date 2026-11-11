import json
import threading
from collections.abc import Callable, Sequence
from datetime import UTC, datetime

import httpx
import pytest

from domain.types import GeoPoint
from providers.routing.port import (
    NoRouteFound,
    RoutePreference,
    RouteQuery,
    RoutingProviderName,
    RoutingUnavailable,
)
from providers.routing.valhalla import RequestLimiter, ValhallaRouting, decode_polyline

BASE_URL = "https://valhalla.example.test"
QUERY = RouteQuery(
    origin=GeoPoint(35.0, -100.0),
    destination=GeoPoint(35.0, -99.0),
    depart_at=datetime(2026, 11, 12, 8, 0, tzinfo=UTC),
    vehicle_weight_kg=34_020,
    preference=RoutePreference.FASTEST,
    max_alternatives=1,
)


def encode_polyline(points: Sequence[GeoPoint], precision: int) -> str:
    """Test-side encoder for building synthetic shapes."""
    factor = 10**precision
    encoded, last_lat, last_lon = "", 0, 0
    for point in points:
        lat, lon = round(point.lat * factor), round(point.lon * factor)
        encoded += _encode_number(lat - last_lat) + _encode_number(lon - last_lon)
        last_lat, last_lon = lat, lon
    return encoded


def _encode_number(change: int) -> str:
    value = ~(change << 1) if change < 0 else change << 1
    text = ""
    while value >= 0x20:
        text += chr((0x20 | (value & 0x1F)) + 63)
        value >>= 5
    return text + chr(value + 63)


def line_of(point_count: int) -> list[GeoPoint]:
    return [GeoPoint(35.0, -100.0 + step * 0.01) for step in range(point_count)]


def trip_json(point_count: int = 25, length_km: str = "12.345", time_s: str = "900.4") -> str:
    shape = encode_polyline(line_of(point_count), 6)
    summary = f'{{"length": {length_km}, "time": {time_s}}}'
    return f'{{"legs": [{{"shape": "{shape}"}}], "summary": {summary}}}'


def success_body(alternates: int = 0) -> str:
    extra = ", ".join(f'{{"trip": {trip_json(30, "15.5", "1000.0")}}}' for _ in range(alternates))
    return f'{{"trip": {trip_json()}, "alternates": [{extra}]}}'


def adapter(
    handler: Callable[[httpx.Request], httpx.Response], limiter: RequestLimiter | None = None
) -> ValhallaRouting:
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return ValhallaRouting(client, BASE_URL, limiter or instant_limiter())


def instant_limiter() -> RequestLimiter:
    return RequestLimiter(min_gap_s=0.0, sleep=lambda _seconds: None)


def answering(status: int, body: str) -> Callable[[httpx.Request], httpx.Response]:
    return lambda _request: httpx.Response(status, text=body)


class FakeClock:
    def __init__(self) -> None:
        self.now = 100.0
        self.sleeps: list[float] = []

    def read(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds


def test_the_adapter_names_itself_as_the_backup_provider() -> None:
    assert adapter(answering(200, success_body())).name is RoutingProviderName.VALHALLA


def test_the_polyline_decoder_reads_the_documented_example() -> None:
    points = decode_polyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 5)

    assert points == (
        GeoPoint(38.5, -120.2),
        GeoPoint(40.7, -120.95),
        GeoPoint(43.252, -126.453),
    )


def test_the_polyline_decoder_reverses_the_test_encoder_at_precision_6() -> None:
    points = tuple(
        GeoPoint((30_123_456 + step * 1000) / 10**6, (-97_654_321 - step * 2000) / 10**6)
        for step in range(5)
    )

    assert decode_polyline(encode_polyline(points, 6), 6) == points


def test_the_request_asks_for_a_truck_route_with_the_weight_in_tonnes() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, text=success_body())

    adapter(handler).routes(QUERY)

    request = seen[0]
    body = json.loads(request.content)
    assert str(request.url) == f"{BASE_URL}/route"
    assert request.headers["user-agent"] == "weather-aware-truck-routing"
    assert body["costing"] == "truck"
    assert body["costing_options"] == {"truck": {"weight": 34.02}}
    assert body["alternates"] == 1
    assert body["locations"] == [{"lat": 35.0, "lon": -100.0}, {"lat": 35.0, "lon": -99.0}]


def test_a_trailing_slash_in_the_base_url_is_harmless() -> None:
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(str(request.url))
        return httpx.Response(200, text=success_body())

    client = httpx.Client(transport=httpx.MockTransport(handler))
    ValhallaRouting(client, BASE_URL + "/", instant_limiter()).routes(QUERY)

    assert seen == [f"{BASE_URL}/route"]


def test_a_trip_becomes_a_route_with_whole_metres_and_seconds() -> None:
    (route,) = adapter(answering(200, success_body())).routes(QUERY)

    assert route.distance_m == 12_345
    assert route.travel_time_s == 900
    assert route.geometry.precision == 6
    assert route.geometry.encoded == encode_polyline(line_of(25), 6)
    assert route.path == decode_polyline(route.geometry.encoded, 6)


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


def test_a_route_of_a_single_point_has_a_one_entry_progress_table() -> None:
    body = f'{{"trip": {trip_json(point_count=1)}}}'

    (route,) = adapter(answering(200, body)).routes(QUERY)

    assert [(entry.distance_m, entry.elapsed_s) for entry in route.progress] == [(0, 0)]


@pytest.mark.parametrize("error_code", [171, 442])
def test_be07_valhalla_saying_no_path_exists_is_no_route_found(error_code: int) -> None:
    body = f'{{"error_code": {error_code}, "error": "No path could be found", "status_code": 400}}'

    with pytest.raises(NoRouteFound):
        adapter(answering(400, body)).routes(QUERY)


@pytest.mark.parametrize(
    ("status", "body"),
    [
        (429, "Too many requests"),
        (500, "<html>Bad gateway</html>"),
        (503, '{"error_code": 100}'),
        (400, '{"error_code": 130, "error": "Failed to parse json request"}'),
        (200, "not json at all"),
        (200, "[1, 2]"),
        (200, '{"unexpected": true}'),
        (200, '{"trip": {"legs": [], "summary": {"length": 1.0, "time": 2}}}'),
        (200, '{"trip": {"legs": [{"shape": "??"}], "summary": {"length": "x", "time": 2}}}'),
    ],
)
def test_be07_failures_and_unreadable_answers_are_routing_unavailable(
    status: int, body: str
) -> None:
    with pytest.raises(RoutingUnavailable):
        adapter(answering(status, body)).routes(QUERY)


def test_be08_one_network_error_is_retried_once() -> None:
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        if len(attempts) == 1:
            raise httpx.ConnectError("refused", request=request)
        return httpx.Response(200, text=success_body())

    assert len(adapter(handler).routes(QUERY)) == 1
    assert len(attempts) == 2


def test_be08_two_network_errors_in_a_row_are_routing_unavailable() -> None:
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        raise httpx.ReadTimeout("too slow", request=request)

    with pytest.raises(RoutingUnavailable):
        adapter(handler).routes(QUERY)
    assert len(attempts) == 2


def test_be08_a_client_error_answer_is_never_retried() -> None:
    attempts: list[int] = []

    def handler(_request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        return httpx.Response(400, text='{"error_code": 130}')

    with pytest.raises(RoutingUnavailable):
        adapter(handler).routes(QUERY)
    assert len(attempts) == 1


def test_be08_requests_start_at_least_one_second_apart() -> None:
    clock = FakeClock()
    limiter = RequestLimiter(min_gap_s=1.0, clock=clock.read, sleep=clock.sleep)
    valhalla = adapter(answering(200, success_body()), limiter)

    valhalla.routes(QUERY)
    valhalla.routes(QUERY)
    clock.now += 5.0
    valhalla.routes(QUERY)

    assert clock.sleeps == [1.0]


def test_be08_the_limiter_waits_only_for_what_is_left_of_the_gap() -> None:
    clock = FakeClock()
    limiter = RequestLimiter(min_gap_s=1.0, clock=clock.read, sleep=clock.sleep)

    limiter.wait_for_turn()
    clock.now += 0.25
    limiter.wait_for_turn()

    assert clock.sleeps == [0.75]


def test_be09_threads_asking_together_are_still_spaced_one_after_another() -> None:
    clock = FakeClock()
    limiter = RequestLimiter(min_gap_s=1.0, clock=clock.read, sleep=clock.sleep)
    threads = [threading.Thread(target=limiter.wait_for_turn) for _ in range(4)]

    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert clock.sleeps == [1.0, 1.0, 1.0]
