import threading

import httpx
import pytest

from providers.routing.port import NoRouteFound, RoutingUnavailable
from providers.routing.valhalla import RequestLimiter
from tests.fakes.valhalla import QUERY, FakeClock, adapter, answering, success_body


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
        (200, '{"trip": {"legs": [{"shape": "_"}], "summary": {"length": 1.0, "time": 2}}}'),
    ],
)
def test_be07_failures_and_unreadable_answers_are_routing_unavailable(
    status: int, body: str
) -> None:
    with pytest.raises(RoutingUnavailable):
        adapter(answering(status, body)).routes(QUERY)


def test_be08_one_network_error_is_retried_once(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("providers.http.time.sleep", lambda seconds: None)
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        if len(attempts) == 1:
            raise httpx.ConnectError("refused", request=request)
        return httpx.Response(200, text=success_body())

    assert len(adapter(handler).routes(QUERY)) == 1
    assert len(attempts) == 2


def test_be08_the_retry_also_waits_for_its_turn_at_the_limiter(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("providers.http.time.sleep", lambda seconds: None)
    clock = FakeClock()
    limiter = RequestLimiter(min_gap_s=1.0, clock=clock.read, sleep=clock.sleep)
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        if len(attempts) == 1:
            raise httpx.ConnectError("refused", request=request)
        return httpx.Response(200, text=success_body())

    adapter(handler, limiter).routes(QUERY)

    assert clock.sleeps == [1.0]


def test_be08_two_network_errors_in_a_row_are_routing_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("providers.http.time.sleep", lambda seconds: None)
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        raise httpx.ReadTimeout("too slow", request=request)

    with pytest.raises(RoutingUnavailable):
        adapter(handler).routes(QUERY)
    assert len(attempts) == 2


def test_be08_a_body_that_cannot_be_decoded_is_routing_unavailable() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.DecodingError("synthetic broken gzip", request=request)

    with pytest.raises(RoutingUnavailable):
        adapter(handler).routes(QUERY)


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
