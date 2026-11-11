from collections.abc import Callable

import pytest
from django.conf import settings
from django.test import Client
from rest_framework.throttling import AnonRateThrottle

from config.container import Providers

type UseFakes = Callable[[Providers], Providers]

GENUINE_CHAIN = "203.0.113.7, 198.51.100.1, 10.0.0.1"
LOCATION = {"lat": "39.7", "lon": "-104.9"}


@pytest.fixture(autouse=True)
def one_request_a_minute(use_fakes: UseFakes, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(AnonRateThrottle.THROTTLE_RATES, "anon", "1/min")


def status_of(client: Client, forwarded_for: str | None) -> int:
    if forwarded_for is None:
        return client.get("/api/v1/timezone", LOCATION).status_code
    response = client.get("/api/v1/timezone", LOCATION, HTTP_X_FORWARDED_FOR=forwarded_for)
    return response.status_code


def test_the_server_expects_three_proxies_unless_the_environment_says_otherwise() -> None:
    """SEC-05"""
    assert settings.REST_FRAMEWORK["NUM_PROXIES"] == 3


@pytest.mark.parametrize(
    "forged_entries",
    ["1.1.1.1", "1.1.1.1, 2.2.2.2", "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4"],
    ids=["one", "two", "four"],
)
def test_a_forged_forwarding_header_cannot_choose_the_throttle_bucket(
    client: Client, forged_entries: str
) -> None:
    """SEC-05"""
    assert status_of(client, f"9.9.9.9, {GENUINE_CHAIN}") == 200

    assert status_of(client, f"{forged_entries}, {GENUINE_CHAIN}") == 429


def test_the_third_address_from_the_right_picks_the_throttle_bucket(client: Client) -> None:
    """SEC-05"""
    assert status_of(client, GENUINE_CHAIN) == 200

    other_visitor = "203.0.113.8, 198.51.100.1, 10.0.0.1"
    assert status_of(client, other_visitor) == 200


def test_without_a_forwarding_header_the_socket_address_is_the_client(client: Client) -> None:
    """SEC-05"""
    assert status_of(client, None) == 200
    assert status_of(client, None) == 429
