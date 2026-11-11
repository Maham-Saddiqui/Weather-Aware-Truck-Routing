from collections.abc import Callable
from dataclasses import replace

import pytest
from django.test import Client
from rest_framework.throttling import AnonRateThrottle

from config.container import Providers
from tests.fakes.bundle import FakeAttribution, FakeCallGuard, default_fakes, with_trips
from tests.fakes.trips import route_bent, tomtom_answering, trip_body

type UseFakes = Callable[[Providers], Providers]

ATTRIBUTION = "/api/v1/attribution"
TRIP_PATHS = ("/api/v1/trips/primary", "/api/v1/trips/compare")
JSON = "application/json"


def test_fetching_the_credit_text_counts_against_the_daily_tomtom_budget(
    client: Client, use_fakes: UseFakes
) -> None:
    """SEC-07"""
    guard = FakeCallGuard()
    use_fakes(with_trips(default_fakes(), call_guard=guard))

    assert client.get(ATTRIBUTION).status_code == 200

    assert guard.acquired == 1


def test_a_spent_daily_budget_makes_the_credit_a_plain_503_without_calling_tomtom(
    client: Client, use_fakes: UseFakes
) -> None:
    """SEC-07"""
    attribution = FakeAttribution()
    bundle = with_trips(default_fakes(), call_guard=FakeCallGuard(allowed=False))
    use_fakes(replace(bundle, attribution=attribution))

    response = client.get(ATTRIBUTION)

    assert response.status_code == 503
    assert response.json()["code"] == "routing_unavailable"
    assert attribution.calls == 0


@pytest.mark.parametrize("path", TRIP_PATHS)
def test_trip_requests_have_their_own_stricter_limit_per_address(
    client: Client, use_fakes: UseFakes, monkeypatch: pytest.MonkeyPatch, path: str
) -> None:
    """SEC-05"""
    use_fakes(with_trips(default_fakes(), routing=tomtom_answering((route_bent(0.0),))))
    monkeypatch.setitem(AnonRateThrottle.THROTTLE_RATES, "trips", "2/min")

    def call(address: str) -> int:
        response = client.post(path, trip_body(), content_type=JSON, HTTP_X_FORWARDED_FOR=address)
        return response.status_code

    assert [call("203.0.113.1") for _ in range(2)] == [200, 200]
    assert call("203.0.113.1") == 429
    assert call("203.0.113.2") == 200


def test_trip_requests_and_cheap_requests_do_not_share_one_bucket(
    client: Client, use_fakes: UseFakes, monkeypatch: pytest.MonkeyPatch
) -> None:
    """SEC-05"""
    use_fakes(with_trips(default_fakes(), routing=tomtom_answering((route_bent(0.0),))))
    monkeypatch.setitem(AnonRateThrottle.THROTTLE_RATES, "trips", "1/min")
    client.post(TRIP_PATHS[0], trip_body(), content_type=JSON)

    assert client.post(TRIP_PATHS[0], trip_body(), content_type=JSON).status_code == 429
    assert client.get(ATTRIBUTION).status_code == 200
