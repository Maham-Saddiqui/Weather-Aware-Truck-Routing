import logging
from collections.abc import Callable
from dataclasses import replace
from typing import Any

import pytest
from django.test import Client
from rest_framework.throttling import AnonRateThrottle

from config.container import Providers
from providers.routing.port import NoRouteFound, RoutingUnavailable
from tests.fakes.bundle import FakeAttribution, FakeTimeZone, default_fakes, with_trips
from trips.problems import problem_response

type UseFakes = Callable[[Providers], Providers]


def test_the_attribution_endpoint_returns_the_credit_text_and_is_never_cached(
    client: Client, use_fakes: UseFakes
) -> None:
    use_fakes(replace(default_fakes(), attribution=FakeAttribution("Synthetic credit")))

    response = client.get("/api/v1/attribution")

    assert response.json() == {"routing_copyright": "Synthetic credit"}
    assert response["Cache-Control"] == "no-store"


def test_a_routing_failure_while_fetching_the_credit_is_a_plain_503_problem(
    client: Client, use_fakes: UseFakes
) -> None:
    failing = FakeAttribution(failure=RoutingUnavailable("secret provider detail"))
    use_fakes(replace(default_fakes(), attribution=failing))

    response = client.get("/api/v1/attribution")

    assert response.status_code == 503
    assert response["Content-Type"] == "application/problem+json"
    assert response.json()["code"] == "routing_unavailable"
    assert "secret provider detail" not in response.content.decode()


def test_the_timezone_endpoint_names_the_zone_of_a_place(
    client: Client, use_fakes: UseFakes
) -> None:
    """RR-18"""
    use_fakes(with_trips(default_fakes(), timezone=FakeTimeZone("America/Denver")))

    response = client.get("/api/v1/timezone", {"lat": "39.7", "lon": "-104.9"})

    assert response.json() == {"time_zone": "America/Denver"}


@pytest.mark.parametrize(
    "query",
    [
        {},
        {"lat": "91", "lon": "0"},
        {"lat": "0", "lon": "-181"},
        {"lat": "x", "lon": "0"},
        {"lat": "nan", "lon": "0"},
    ],
)
def test_a_timezone_request_with_missing_or_impossible_coordinates_is_a_400_problem(
    client: Client, use_fakes: UseFakes, query: dict[str, str]
) -> None:
    response = client.get("/api/v1/timezone", query)

    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"
    assert response.json()["field_errors"]


def test_a_no_route_answer_becomes_a_422_problem_in_plain_english() -> None:
    response = problem_response(NoRouteFound("synthetic"), {})

    assert response.status_code == 422
    assert response.data["code"] == "no_route_found"
    assert "synthetic" not in response.data["detail"]


def test_an_unexpected_failure_is_a_generic_500_problem_without_details(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    broken = FakeAttribution(failure=RuntimeError("internal detail"))
    use_fakes(replace(default_fakes(), attribution=broken))

    response = client.get("/api/v1/attribution")

    assert response.status_code == 500
    assert response.json()["code"] == "internal_error"
    assert "internal detail" not in response.content.decode()
    assert "Traceback" not in response.content.decode()


def test_a_wrong_method_is_a_problem_response_too(client: Client, use_fakes: UseFakes) -> None:
    response = client.post("/api/v1/health")

    assert response.status_code == 405
    assert response["Content-Type"] == "application/problem+json"


def test_requests_are_throttled_per_forwarded_address_with_retry_after(
    client: Client, use_fakes: UseFakes, monkeypatch: pytest.MonkeyPatch
) -> None:
    """SEC-05"""
    monkeypatch.setitem(AnonRateThrottle.THROTTLE_RATES, "anon", "2/min")

    def call(address: str) -> Any:
        return client.get(
            "/api/v1/timezone", {"lat": "39.7", "lon": "-104.9"}, HTTP_X_FORWARDED_FOR=address
        )

    assert [call("203.0.113.1").status_code for _ in range(2)] == [200, 200]
    blocked = call("203.0.113.1")
    assert blocked.status_code == 429
    assert blocked.json()["code"] == "rate_limited"
    assert int(blocked["Retry-After"]) >= 1
    assert call("203.0.113.2").status_code == 200


def test_the_health_check_is_never_throttled(
    client: Client, use_fakes: UseFakes, monkeypatch: pytest.MonkeyPatch
) -> None:
    """SEC-05"""
    monkeypatch.setitem(AnonRateThrottle.THROTTLE_RATES, "anon", "1/min")

    statuses = {client.get("/api/v1/health").status_code for _ in range(5)}

    assert statuses == {200}


def test_every_response_carries_a_fresh_request_id_that_a_client_cannot_choose(
    client: Client, use_fakes: UseFakes
) -> None:
    """BE-12"""
    first = client.get("/api/v1/health", HTTP_X_REQUEST_ID="attacker-chosen")
    second = client.get("/api/v1/health")

    assert first["X-Request-ID"] != "attacker-chosen"
    assert first["X-Request-ID"] != second["X-Request-ID"]


def test_the_request_log_line_has_the_path_but_no_query_string_so_no_coordinates(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """BE-12"""
    caplog.set_level(logging.INFO, logger="trips.requests")

    client.get("/api/v1/timezone", {"lat": "39.7392", "lon": "-104.9903"})

    messages = " ".join(record.getMessage() for record in caplog.records)
    assert "/api/v1/timezone" in messages
    assert "39.7392" not in messages


def test_the_http_client_libraries_never_log_request_addresses_that_hold_the_key() -> None:
    """SEC-02"""
    assert logging.getLogger("httpx").getEffectiveLevel() >= logging.WARNING
    assert logging.getLogger("httpcore").getEffectiveLevel() >= logging.WARNING
