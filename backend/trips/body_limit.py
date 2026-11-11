from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

from trips.limits import MAX_BODY_BYTES
from trips.problems import too_large_response

BODY_METHODS = ("POST", "PUT", "PATCH")


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
        return not declared.isdigit() or int(declared) > MAX_BODY_BYTES
    return len(request.META["wsgi.input"].read(MAX_BODY_BYTES + 1)) > MAX_BODY_BYTES
