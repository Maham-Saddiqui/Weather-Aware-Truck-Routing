from collections.abc import Callable
from dataclasses import replace

import pytest
from django.test import Client
from rest_framework.throttling import AnonRateThrottle

from config.container import Providers
from providers.routing.port import RoutingUnavailable
from tests.contract.openapi import assert_conforms
from tests.fakes.bundle import FakeAttribution, default_fakes

type UseFakes = Callable[[Providers], Providers]


def test_health_matches_the_contract(client: Client, use_fakes: UseFakes) -> None:
    assert_conforms(client.get("/api/v1/health"), "/health", "get")


def test_attribution_matches_the_contract(client: Client, use_fakes: UseFakes) -> None:
    assert_conforms(client.get("/api/v1/attribution"), "/attribution", "get")


def test_a_failed_attribution_matches_the_contracts_503_problem(
    client: Client, use_fakes: UseFakes
) -> None:
    failing = FakeAttribution(failure=RoutingUnavailable("synthetic"))
    use_fakes(replace(default_fakes(), attribution=failing))

    assert_conforms(client.get("/api/v1/attribution"), "/attribution", "get")


def test_timezone_matches_the_contract(client: Client, use_fakes: UseFakes) -> None:
    response = client.get("/api/v1/timezone", {"lat": "41.88", "lon": "-87.63"})

    assert_conforms(response, "/timezone", "get")


def test_a_timezone_validation_error_matches_the_contracts_400_problem(
    client: Client, use_fakes: UseFakes
) -> None:
    assert_conforms(client.get("/api/v1/timezone", {"lat": "200"}), "/timezone", "get")


def test_a_throttled_response_matches_the_contracts_429_problem_with_retry_after(
    client: Client, use_fakes: UseFakes, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setitem(AnonRateThrottle.THROTTLE_RATES, "anon", "1/min")
    client.get("/api/v1/attribution")

    assert_conforms(client.get("/api/v1/attribution"), "/attribution", "get")
