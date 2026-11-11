from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from trips.limits import MAX_BODY_BYTES
from trips.problems import too_large_response

BODY_METHODS = ("POST", "PUT", "PATCH")
MAX_LENGTH_DIGITS = len(str(MAX_BODY_BYTES))


class BodyLimitMiddleware:
    """SEC-03: a trip request is under 1 KB, so anything far larger is refused unread."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self._get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if request.method in BODY_METHODS and _is_too_large(request):
            return too_large_response()
        return self._get_response(request)


def _is_too_large(request: HttpRequest) -> bool:
    declared = request.META.get("CONTENT_LENGTH")
    if declared:
        return _declared_length_is_too_large(declared)
    # Django treats a missing length as an empty body, so a small chunked body ends as a 400.
    return len(request.META["wsgi.input"].read(MAX_BODY_BYTES + 1)) > MAX_BODY_BYTES


def _declared_length_is_too_large(declared: str) -> bool:
    """Only plain ASCII digits are a length; other digits such as superscripts break int()."""
    if not (declared.isascii() and declared.isdigit()) or len(declared) > MAX_LENGTH_DIGITS:
        return True
    return int(declared) > MAX_BODY_BYTES
