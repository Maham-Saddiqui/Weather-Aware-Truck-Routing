import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

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
from providers.routing.valhalla import READ_TIMEOUT_S, RequestLimiter, ValhallaRouting
from providers.weather.cache import WindowCache
from providers.weather.open_meteo import OpenMeteoWeather
from providers.weather.port import WeatherError
from tests.fakes.logs import assert_nothing_sensitive_was_logged, events

FAKE_API_KEY = "fake-key-for-tests"
ECHOED_TEXT = "echoed-secret-text"
ORIGIN = GeoPoint(41.1234, -87.5678)
DESTINATION = GeoPoint(42.4321, -88.8765)
NOW = datetime(2026, 11, 11, 14, 25, tzinfo=UTC)
QUERY = RouteQuery(ORIGIN, DESTINATION, NOW, 30_000, RoutePreference.FASTEST, 0)
FAILED = "provider_failed"

type Handler = Callable[[httpx.Request], httpx.Response]


def answering(status: int, text: str = "") -> Handler:
    return lambda request: httpx.Response(status, text=text)


def failing_with(error: type[httpx.RequestError]) -> Handler:
    def handler(request: httpx.Request) -> httpx.Response:
        raise error(f"{ECHOED_TEXT} {request.url}", request=request)

    return handler


def tomtom(handler: Handler) -> TomTomRouting:
    return TomTomRouting(FAKE_API_KEY, make_client(1.0, httpx.MockTransport(handler)))


def attribution(handler: Handler) -> TomTomAttribution:
    return TomTomAttribution(FAKE_API_KEY, make_client(1.0, httpx.MockTransport(handler)))


def valhalla(handler: Handler) -> ValhallaRouting:
    client = make_client(READ_TIMEOUT_S, httpx.MockTransport(handler))
    return ValhallaRouting(client, "https://valhalla.example.test", RequestLimiter(0.0))


def weather_call(handler: Handler) -> Callable[[], Any]:
    service = OpenMeteoWeather(
        "https://weather.example.test",
        make_client(1.0, httpx.MockTransport(handler)),
        WindowCache(lambda: NOW),
        lambda: NOW,
    )
    return lambda: service.forecast([ORIGIN])


def routes_of(adapter: Any) -> Callable[[], Any]:
    return lambda: adapter.routes(QUERY)


@pytest.fixture(autouse=True)
def instant_retry(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    monkeypatch.setattr("providers.http.time.sleep", lambda seconds: None)
    caplog.set_level(logging.INFO)


def failures(caplog: pytest.LogCaptureFixture) -> list[dict[str, Any]]:
    return events(caplog, FAILED)


def run(call: Callable[[], Any]) -> None:
    with pytest.raises((RoutingUnavailable, NoRouteFound, WeatherError)):
        call()


STATUS_CASES = [
    (400, "http_status"),
    (401, "key_or_quota_rejected"),
    (403, "key_or_quota_rejected"),
    (429, "rate_limited"),
    (500, "http_status"),
    (503, "http_status"),
]


@pytest.mark.parametrize(("status", "failure"), STATUS_CASES)
@pytest.mark.parametrize("provider", ["tomtom", "valhalla", "open_meteo", "attribution"])
def test_an_error_status_is_one_warning_with_the_class_and_the_number(
    caplog: pytest.LogCaptureFixture, provider: str, status: int, failure: str
) -> None:
    handler = answering(status, ECHOED_TEXT)
    calls = {
        "tomtom": routes_of(tomtom(handler)),
        "valhalla": routes_of(valhalla(handler)),
        "open_meteo": weather_call(handler),
        "attribution": attribution(handler).routing_copyright,
    }

    run(calls[provider])

    (logged,) = failures(caplog)
    assert logged["level"] == "WARNING"
    assert (logged["provider"], logged["failure"], logged["status"]) == (provider, failure, status)
    assert (logged["attempt"], isinstance(logged["duration_ms"], int)) == (1, True)
    assert_nothing_sensitive_was_logged(caplog, FAKE_API_KEY, ECHOED_TEXT, "https://")


@pytest.mark.parametrize("provider", ["tomtom", "valhalla", "open_meteo", "attribution"])
def test_two_timeouts_are_logged_as_attempt_one_and_attempt_two(
    caplog: pytest.LogCaptureFixture, provider: str
) -> None:
    handler = failing_with(httpx.ReadTimeout)
    calls = {
        "tomtom": routes_of(tomtom(handler)),
        "valhalla": routes_of(valhalla(handler)),
        "open_meteo": weather_call(handler),
        "attribution": attribution(handler).routing_copyright,
    }

    run(calls[provider])

    assert [(f["provider"], f["failure"], f["attempt"]) for f in failures(caplog)] == [
        (provider, "timeout", 1),
        (provider, "timeout", 2),
    ]
    assert failures(caplog)[0]["error_type"] == "ReadTimeout"
    assert_nothing_sensitive_was_logged(caplog, FAKE_API_KEY, ECHOED_TEXT, "https://")


def test_a_connection_error_then_an_error_status_shows_both_attempts(
    caplog: pytest.LogCaptureFixture,
) -> None:
    sent: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(1)
        if len(sent) == 1:
            raise httpx.ConnectError(f"{ECHOED_TEXT} {request.url}", request=request)
        return httpx.Response(500)

    run(routes_of(tomtom(handler)))

    assert [(f["failure"], f["attempt"]) for f in failures(caplog)] == [
        ("connection_error", 1),
        ("http_status", 2),
    ]
    assert_nothing_sensitive_was_logged(caplog, FAKE_API_KEY, ECHOED_TEXT, "https://")


@pytest.mark.parametrize("provider", ["tomtom", "valhalla", "open_meteo", "attribution"])
def test_an_answer_that_cannot_be_read_is_logged_without_the_answer(
    caplog: pytest.LogCaptureFixture, provider: str
) -> None:
    handler = answering(200, f"<html>{ECHOED_TEXT}</html>")
    calls = {
        "tomtom": routes_of(tomtom(handler)),
        "valhalla": routes_of(valhalla(handler)),
        "open_meteo": weather_call(handler),
        "attribution": attribution(handler).routing_copyright,
    }

    run(calls[provider])

    (logged,) = failures(caplog)
    assert (logged["provider"], logged["failure"]) == (provider, "unreadable_answer")
    assert_nothing_sensitive_was_logged(caplog, FAKE_API_KEY, ECHOED_TEXT, "https://")


def test_a_tomtom_answer_with_no_route_is_logged_as_no_route_found(
    caplog: pytest.LogCaptureFixture,
) -> None:
    run(routes_of(tomtom(answering(400, "NO_ROUTE_FOUND"))))
    run(routes_of(tomtom(answering(200, '{"routes": []}'))))

    assert [(f["provider"], f["failure"]) for f in failures(caplog)] == [
        ("tomtom", "no_route_found")
    ] * 2


def test_a_valhalla_answer_with_no_route_is_logged_as_no_route_found(
    caplog: pytest.LogCaptureFixture,
) -> None:
    run(routes_of(valhalla(answering(400, '{"error_code": 171}'))))

    (logged,) = failures(caplog)
    assert (logged["provider"], logged["failure"]) == ("valhalla", "no_route_found")


def test_a_missing_tomtom_key_is_not_a_provider_call_and_logs_no_provider_failure(
    caplog: pytest.LogCaptureFixture,
) -> None:
    adapter = TomTomRouting("", make_client(1.0, httpx.MockTransport(answering(200))))

    run(routes_of(adapter))

    assert failures(caplog) == []
