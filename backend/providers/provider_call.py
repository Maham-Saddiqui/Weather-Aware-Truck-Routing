import logging
import time

import httpx

from providers.event_log import elapsed_ms, log_event

TOMTOM = "tomtom"
VALHALLA = "valhalla"
OPEN_METEO = "open_meteo"
ATTRIBUTION = "attribution"

TIMEOUT = "timeout"
CONNECTION_ERROR = "connection_error"
HTTP_STATUS = "http_status"
RATE_LIMITED = "rate_limited"
KEY_OR_QUOTA_REJECTED = "key_or_quota_rejected"
UNREADABLE_ANSWER = "unreadable_answer"
NO_ROUTE_FOUND = "no_route_found"

HTTP_TOO_MANY_REQUESTS = 429
KEY_OR_QUOTA_STATUSES = (401, 403)


class ProviderCall:
    """Writes one WARNING per failed attempt of one provider call (BE-12).

    Only the provider, a fixed failure class, the status number, the exception class name, the
    duration and the attempt number are logged: the address can hold the TomTom key, and an
    answer or an exception text can echo it.
    """

    def __init__(self, provider: str) -> None:
        self._provider = provider
        self._attempt = 0
        self._attempt_started = time.monotonic()

    def start_attempt(self) -> None:
        self._attempt += 1
        self._attempt_started = time.monotonic()

    def transport_failed(self, error: httpx.RequestError) -> None:
        timed_out = isinstance(error, httpx.TimeoutException)
        self._log(TIMEOUT if timed_out else CONNECTION_ERROR, error_type=type(error).__name__)

    def status_failed(self, status: int) -> None:
        self._log(_failure_of_status(status), status=status)

    def failed(self, failure: str) -> None:
        self._log(failure)

    def _log(self, failure: str, **detail: object) -> None:
        log_event(
            logging.WARNING,
            "provider_failed",
            provider=self._provider,
            failure=failure,
            duration_ms=elapsed_ms(self._attempt_started),
            attempt=self._attempt,
            **detail,
        )


def _failure_of_status(status: int) -> str:
    if status == HTTP_TOO_MANY_REQUESTS:
        return RATE_LIMITED
    return KEY_OR_QUOTA_REJECTED if status in KEY_OR_QUOTA_STATUSES else HTTP_STATUS
