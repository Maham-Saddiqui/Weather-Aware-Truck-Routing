import secrets
import time
from collections.abc import Mapping, Sequence

import httpx

USER_AGENT = "weather-aware-truck-routing/1.0"
CONNECT_TIMEOUT_S = 3.0
MAX_CONNECTIONS = 16
RETRY_PAUSE_RANGE_S = (0.1, 0.4)

type QueryParams = Mapping[str, str | int | Sequence[str]]

_jitter = secrets.SystemRandom()


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
    client: httpx.Client,
    url: str,
    params: QueryParams,
) -> httpx.Response:
    """Retries once, after a short random pause, and only for network errors (architecture 10)."""
    try:
        return client.get(url, params=params)
    except httpx.TransportError:
        time.sleep(_jitter.uniform(*RETRY_PAUSE_RANGE_S))
    return client.get(url, params=params)
