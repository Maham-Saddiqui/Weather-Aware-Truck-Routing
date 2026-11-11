import logging
import math
from dataclasses import dataclass, replace
from typing import Any

from rest_framework.exceptions import APIException, Throttled, ValidationError
from rest_framework.response import Response

from providers.routing.port import NoRouteFound, RoutingUnavailable
from trips.responses import no_store

logger = logging.getLogger("trips.problems")

PROBLEM_CONTENT_TYPE = "application/problem+json"
HTTP_BAD_REQUEST = 400
HTTP_UNPROCESSABLE = 422
HTTP_TOO_MANY_REQUESTS = 429
HTTP_INTERNAL_ERROR = 500
HTTP_SERVICE_UNAVAILABLE = 503
DEFAULT_RETRY_AFTER_S = 60
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
RATE_LIMITED = Problem(
    HTTP_TOO_MANY_REQUESTS,
    "rate_limited",
    "Too many requests",
    "You are sending requests too quickly. Please wait a little and try again.",
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
        return _respond(VALIDATION, field_errors=flatten_errors(exc.detail))
    if isinstance(exc, Throttled):
        return _respond(RATE_LIMITED, retry_after_s=_seconds_to_wait(exc))
    if isinstance(exc, APIException) and exc.status_code < HTTP_INTERNAL_ERROR:
        return _respond(replace(VALIDATION, status=exc.status_code, detail=UNUSABLE_REQUEST_DETAIL))
    if isinstance(exc, NoRouteFound):
        return _respond(NO_ROUTE)
    if isinstance(exc, RoutingUnavailable):
        return _respond(ROUTING_UNAVAILABLE)
    logger.exception("Unhandled error")
    return _respond(INTERNAL)


def _respond(
    problem: Problem,
    field_errors: dict[str, list[str]] | None = None,
    retry_after_s: int | None = None,
) -> Response:
    body: dict[str, Any] = {
        "type": f"/problems/{problem.code.replace('_', '-')}",
        "title": problem.title,
        "status": problem.status,
        "detail": problem.detail,
        "code": problem.code,
    }
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
