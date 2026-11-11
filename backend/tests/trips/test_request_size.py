import json
import logging
from collections.abc import Callable
from io import BytesIO
from typing import Any

import pytest
from django.core.handlers.wsgi import WSGIHandler
from django.http import HttpResponse
from django.test import Client, RequestFactory

from config.container import Providers
from tests.fakes.trips import trip_body
from trips.body_limit import BodyLimitMiddleware
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


@pytest.mark.parametrize(
    "declared",
    ["\u00b2", "\u0663", "\uff11\uff12", "9" * 5_000, "-1", " 5"],
    ids=["superscript", "arabic-indic", "fullwidth", "thousands-of-digits", "negative", "space"],
)
def test_an_odd_declared_length_is_refused_with_413_and_never_crashes(
    client: Client, use_fakes: UseFakes, declared: str
) -> None:
    """SEC-03: non-ASCII digits and huge numbers are not lengths"""
    assert_too_large(client.post(TRIP_PATHS[0], "{}", content_type=JSON, CONTENT_LENGTH=declared))


class EndlessBody:
    def __init__(self) -> None:
        self.sizes_asked: list[int] = []

    def read(self, size: int) -> bytes:
        self.sizes_asked.append(size)
        return b"x" * size


def test_a_body_without_a_length_is_read_at_most_the_limit_plus_one_byte() -> None:
    """SEC-03"""
    body = EndlessBody()
    request = RequestFactory().post(TRIP_PATHS[0], "{}", content_type=JSON)
    request.META["CONTENT_LENGTH"] = ""
    request.META["wsgi.input"] = body

    response = BodyLimitMiddleware(lambda _: HttpResponse())(request)

    assert response.status_code == 413
    assert body.sizes_asked == [MAX_BODY_BYTES + 1]


@pytest.mark.parametrize("path", TRIP_PATHS)
def test_a_small_chunked_body_gets_a_plain_400_problem_because_a_length_is_required(
    use_fakes: UseFakes, path: str
) -> None:
    """SEC-03: browsers always send a length, so only hand-made requests land here"""
    environ = RequestFactory().post(path, "{}", content_type=JSON).environ
    environ["CONTENT_LENGTH"] = ""
    environ["wsgi.input"] = BytesIO(json.dumps(trip_body()).encode())
    started: list[str] = []

    def start_response(
        status: str, headers: list[tuple[str, str]], exc_info: object = None
    ) -> Callable[[bytes], object]:
        started.append(status)
        return lambda data: None

    WSGIHandler()(environ, start_response)

    assert started[0].startswith("400")


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
