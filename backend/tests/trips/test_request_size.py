import json
import logging
from collections.abc import Callable
from typing import Any

import pytest
from django.test import Client

from config.container import Providers
from tests.fakes.trips import trip_body
from trips.limits import MAX_BODY_BYTES

type UseFakes = Callable[[Providers], Providers]

TRIP_PATHS = ("/api/v1/trips/primary", "/api/v1/trips/compare")
JSON = "application/json"


def assert_too_large(response: Any) -> None:
    assert response.status_code == 413
    assert response["Content-Type"] == "application/problem+json"
    assert response["Cache-Control"] == "no-store"
    assert response.json()["code"] == "validation_error"


@pytest.mark.parametrize("path", TRIP_PATHS)
def test_a_body_declared_larger_than_the_limit_is_refused_with_413(
    client: Client, use_fakes: UseFakes, path: str
) -> None:
    """SEC-03"""
    body = json.dumps({"label": "x" * MAX_BODY_BYTES})

    assert_too_large(client.post(path, body, content_type=JSON))


@pytest.mark.parametrize("path", TRIP_PATHS)
def test_a_large_streamed_body_without_a_declared_length_is_refused_with_413(
    client: Client, use_fakes: UseFakes, path: str
) -> None:
    """SEC-03"""
    body = json.dumps({"label": "x" * MAX_BODY_BYTES})

    assert_too_large(client.post(path, body, content_type=JSON, CONTENT_LENGTH=""))


def test_a_declared_length_that_is_not_a_number_is_refused_with_413(
    client: Client, use_fakes: UseFakes
) -> None:
    """SEC-03"""
    assert_too_large(client.post(TRIP_PATHS[0], "{}", content_type=JSON, CONTENT_LENGTH="lots"))


def test_a_normal_trip_request_is_far_below_the_limit(client: Client, use_fakes: UseFakes) -> None:
    """SEC-03"""
    assert len(json.dumps(trip_body())) < MAX_BODY_BYTES // 4
    assert client.post(TRIP_PATHS[0], trip_body(), content_type=JSON).status_code != 413


@pytest.mark.parametrize("path", TRIP_PATHS)
def test_form_and_multipart_bodies_are_not_accepted(
    client: Client, use_fakes: UseFakes, path: str
) -> None:
    """SEC-03"""
    form = client.post(path, {"origin": "x"})

    assert form.status_code == 415
    assert form.json()["code"] == "validation_error"


def test_a_deeply_nested_body_is_a_400_problem_and_not_a_logged_crash(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """SEC-03"""
    nested = "[" * (MAX_BODY_BYTES - 1)

    response = client.post(TRIP_PATHS[0], nested, content_type=JSON)

    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"
    assert not [record for record in caplog.records if record.levelno >= logging.ERROR]
