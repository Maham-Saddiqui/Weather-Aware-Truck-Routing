import logging
import math
from dataclasses import dataclass, replace
from typing import Any

from django.http import JsonResponse
from rest_framework.exceptions import APIException, Throttled, ValidationError
from rest_framework.response import Response

from providers.event_log import log_event
from providers.routing.port import NoRouteFound, RoutingUnavailable
from providers.timezone.offline import TimeZoneNotFound
from services.trip_runner import TripsBusy
from trips.responses import no_store
from trips.serializers import UNKNOWN_FIELD

logger = logging.getLogger("trips.problems")

PROBLEM_CONTENT_TYPE = "application/problem+json"
HTTP_BAD_REQUEST = 400
HTTP_PAYLOAD_TOO_LARGE = 413
HTTP_UNPROCESSABLE = 422
HTTP_TOO_MANY_REQUESTS = 429
HTTP_INTERNAL_ERROR = 500
HTTP_SERVICE_UNAVAILABLE = 503
DEFAULT_RETRY_AFTER_S = 60
BUSY_RETRY_AFTER_S = 5
ANONYMOUS_SCOPE = "anon"
UNUSABLE_REQUEST_DETAIL = "The request could not be used. Check it and try again."


@dataclass(frozen=True, slots=True)
class Problem:
    status: int
    code: str
    title: str
    detail: str


VALIDATION = Problem(
    HTTP_BAD_REQUEST,
    "validation_error",
    "Check the trip details",
    "Some of the details are not valid. Fix the marked fields and try again.",
)
NO_ROUTE = Problem(
    HTTP_UNPROCESSABLE,
    "no_route_found",
    "No truck route found",
    "We could not find a truck route between these two places. Try different places.",
)
ROUTING_UNAVAILABLE = Problem(
    HTTP_SERVICE_UNAVAILABLE,
    "routing_unavailable",
    "Routing is unavailable",
    "We could not get a route right now. Please try again in a minute.",
)
NO_TIME_ZONE = Problem(
    HTTP_UNPROCESSABLE,
    "validation_error",
    "A place has no time zone",
    "No time zone covers a place on this route, so its times cannot be shown. Try other places.",
)
PAYLOAD_TOO_LARGE = Problem(
    HTTP_PAYLOAD_TOO_LARGE,
    "validation_error",
    "Request too large",
    "This request is much larger than a trip request can be. Check it and try again.",
)
RATE_LIMITED = Problem(
    HTTP_TOO_MANY_REQUESTS,
    "rate_limited",
    "Too many requests",
    "You are sending requests too quickly. Please wait a little and try again.",
)
BUSY = replace(
    RATE_LIMITED,
    detail="The server is busy with other trips. Please wait a few seconds and try again.",
)
INTERNAL = Problem(
    HTTP_INTERNAL_ERROR,
    "internal_error",
    "Something went wrong",
    "Something went wrong on our side. Please try again.",
)


def problem_response(exc: Exception, context: dict[str, Any]) -> Response:
    """The one place where errors become problem responses (BE-07, RFC 9457 style)."""
    if isinstance(exc, ValidationError):
        field_errors = flatten_errors(exc.detail)
        _log_validation_failure(field_errors)
        return _respond(VALIDATION, field_errors=field_errors)
    if isinstance(exc, Throttled):
        scope = getattr(context.get("view"), "throttle_scope", None) or ANONYMOUS_SCOPE
        log_event(logging.WARNING, "throttled", scope=scope)
        return _respond(RATE_LIMITED, retry_after_s=_seconds_to_wait(exc))
    if isinstance(exc, APIException) and exc.status_code < HTTP_INTERNAL_ERROR:
        log_event(logging.INFO, "request_not_usable", status=exc.status_code)
        return _respond(replace(VALIDATION, status=exc.status_code, detail=UNUSABLE_REQUEST_DETAIL))
    if isinstance(exc, TripsBusy):
        return _respond(BUSY, retry_after_s=BUSY_RETRY_AFTER_S)
    return _respond(_problem_of(exc))


def _log_validation_failure(field_errors: dict[str, list[str]]) -> None:
    """Names of fields the server declares only: an unknown name is whatever the client typed."""
    declared = sorted(name for name, errors in field_errors.items() if errors != [UNKNOWN_FIELD])
    unknown_count = len(field_errors) - len(declared)
    log_event(
        logging.INFO, "validation_failed", invalid_fields=declared, unknown_fields=unknown_count
    )


def _problem_of(exc: Exception) -> Problem:
    if isinstance(exc, NoRouteFound):
        return NO_ROUTE
    if isinstance(exc, RoutingUnavailable):
        return ROUTING_UNAVAILABLE
    if isinstance(exc, TimeZoneNotFound):
        return NO_TIME_ZONE
    logger.exception("Unhandled error")
    return INTERNAL


def too_large_response() -> JsonResponse:
    """Built outside DRF, because this answer is given before any view runs."""
    response = JsonResponse(
        _body(PAYLOAD_TOO_LARGE), status=HTTP_PAYLOAD_TOO_LARGE, content_type=PROBLEM_CONTENT_TYPE
    )
    response["Cache-Control"] = "no-store"
    return response


def _body(problem: Problem) -> dict[str, Any]:
    return {
        "type": f"/problems/{problem.code.replace('_', '-')}",
        "title": problem.title,
        "status": problem.status,
        "detail": problem.detail,
        "code": problem.code,
    }


def _respond(
    problem: Problem,
    field_errors: dict[str, list[str]] | None = None,
    retry_after_s: int | None = None,
) -> Response:
    body = _body(problem)
    if field_errors is not None:
        body["field_errors"] = field_errors
    response = no_store(Response(body, status=problem.status, content_type=PROBLEM_CONTENT_TYPE))
    if retry_after_s is not None:
        response["Retry-After"] = str(retry_after_s)
    return response


def _seconds_to_wait(exc: Throttled) -> int:
    wait_s: float | None = getattr(exc, "wait", None)
    return max(1, math.ceil(wait_s)) if wait_s is not None else DEFAULT_RETRY_AFTER_S


def flatten_errors(detail: object, prefix: str = "") -> dict[str, list[str]]:
    """Turns DRF's nested error structure into {"origin.lat": ["message"]}."""
    if isinstance(detail, dict):
        flat: dict[str, list[str]] = {}
        for name, inner in detail.items():
            flat.update(flatten_errors(inner, f"{prefix}.{name}" if prefix else str(name)))
        return flat
    messages = detail if isinstance(detail, list) else [detail]
    return {prefix or "non_field_errors": [str(message) for message in messages]}
