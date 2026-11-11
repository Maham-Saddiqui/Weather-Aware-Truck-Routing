import secrets
import time
from collections.abc import Callable, Iterator, Mapping, Sequence
from contextlib import contextmanager
from contextvars import ContextVar

import httpx

from providers.provider_call import ProviderCall

USER_AGENT = "weather-aware-truck-routing/1.0"
CONNECT_TIMEOUT_S = 3.0
MAX_CONNECTIONS = 16
RETRY_PAUSE_RANGE_S = (0.1, 0.4)

type QueryParams = Mapping[str, str | int | Sequence[str]]

_jitter = secrets.SystemRandom()
_read_timeout_s: ContextVar[float | None] = ContextVar("read_timeout_s", default=None)
_one_attempt: ContextVar[bool] = ContextVar("one_attempt", default=False)


@contextmanager
def one_attempt(read_timeout_s: float | None = None) -> Iterator[None]:
    """A slow call waits as long as given (or as long as its client allows) and is not repeated.

    A read timeout that is repeated only doubles the wait; failures before any answer are still
    retried once.
    """
    earlier = (_read_timeout_s.set(read_timeout_s), _one_attempt.set(True))
    try:
        yield
    finally:
        _one_attempt.reset(earlier[1])
        _read_timeout_s.reset(earlier[0])


def make_client(
    read_timeout_s: float, transport: httpx.BaseTransport | None = None
) -> httpx.Client:
    """One pooled client per provider with explicit timeouts (BE-08, PERF-05)."""
    return httpx.Client(
        headers={"User-Agent": USER_AGENT},
        timeout=httpx.Timeout(read_timeout_s, connect=CONNECT_TIMEOUT_S),
        limits=httpx.Limits(max_connections=MAX_CONNECTIONS),
        transport=transport,
    )


def get_with_one_retry(
    client: httpx.Client, url: str, params: QueryParams, call: ProviderCall
) -> httpx.Response:
    read_timeout_s = _read_timeout_s.get()
    timeout = (
        httpx.USE_CLIENT_DEFAULT
        if read_timeout_s is None
        else httpx.Timeout(read_timeout_s, connect=CONNECT_TIMEOUT_S)
    )
    return send_with_one_retry(lambda: client.get(url, params=params, timeout=timeout), call)


def send_with_one_retry(send: Callable[[], httpx.Response], call: ProviderCall) -> httpx.Response:
    """Retries once, after a short random pause, and only for network errors (architecture 10)."""
    try:
        return _attempt(send, call)
    except httpx.TransportError as error:
        if isinstance(error, httpx.ReadTimeout) and _one_attempt.get():
            raise
        time.sleep(_jitter.uniform(*RETRY_PAUSE_RANGE_S))
    return _attempt(send, call)


def _attempt(send: Callable[[], httpx.Response], call: ProviderCall) -> httpx.Response:
    call.start_attempt()
    try:
        return send()
    except httpx.RequestError as error:
        call.transport_failed(error)
        raise
