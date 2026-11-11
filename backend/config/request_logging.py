import json
import logging
import resource
import sys
import time
import uuid
from collections.abc import Callable
from contextvars import ContextVar

from django.http import HttpRequest, HttpResponse

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

logger = logging.getLogger("trips.requests")

PEAK_MEMORY_UNITS_PER_MB = 1024 * 1024 if sys.platform == "darwin" else 1024


def peak_memory_mb() -> int:
    """The free host shows no memory graph, so the log carries the process's peak (PERF-05)."""
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // PEAK_MEMORY_UNITS_PER_MB


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    """One JSON object per line (BE-12): no secrets, bodies or precise coordinates in messages."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "time": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "message": record.getMessage(),
        }
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry)


class RequestIdMiddleware:
    """Gives every request a fresh id (a client-sent id is never trusted) and logs one line."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self._get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request_id = uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.monotonic()
        try:
            response = self._get_response(request)
            duration_ms = round((time.monotonic() - started) * 1000)
            logger.info(
                "%s %s %s %d ms, peak memory %d MB",
                request.method,
                request.path,
                response.status_code,
                duration_ms,
                peak_memory_mb(),
            )
        finally:
            request_id_var.reset(token)
        response["X-Request-ID"] = request_id
        return response
