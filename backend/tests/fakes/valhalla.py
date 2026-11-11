from collections.abc import Callable
from datetime import UTC, datetime

import httpx

from domain.types import GeoPoint
from providers.http import make_client
from providers.routing.port import RoutePreference, RouteQuery
from providers.routing.valhalla import READ_TIMEOUT_S, RequestLimiter, ValhallaRouting
from tests.fakes.polyline import encode_polyline

BASE_URL = "https://valhalla.example.test"
QUERY = RouteQuery(
    origin=GeoPoint(35.0, -100.0),
    destination=GeoPoint(35.0, -99.0),
    depart_at=datetime(2026, 11, 12, 8, 0, tzinfo=UTC),
    vehicle_weight_kg=34_020,
    preference=RoutePreference.FASTEST,
    max_alternatives=1,
)


def line_of(point_count: int) -> list[GeoPoint]:
    return [GeoPoint(35.0, -100.0 + step * 0.01) for step in range(point_count)]


def trip_json(point_count: int = 25, length_km: str = "12.345", time_s: str = "900.4") -> str:
    shape = encode_polyline(line_of(point_count), 6)
    summary = f'{{"length": {length_km}, "time": {time_s}}}'
    return f'{{"legs": [{{"shape": "{shape}"}}], "summary": {summary}}}'


def success_body(alternates: int = 0) -> str:
    extra = ", ".join(f'{{"trip": {trip_json(30, "15.5", "1000.0")}}}' for _ in range(alternates))
    return f'{{"trip": {trip_json()}, "alternates": [{extra}]}}'


def adapter(
    handler: Callable[[httpx.Request], httpx.Response], limiter: RequestLimiter | None = None
) -> ValhallaRouting:
    client = make_client(READ_TIMEOUT_S, httpx.MockTransport(handler))
    return ValhallaRouting(client, BASE_URL, limiter or instant_limiter())


def instant_limiter() -> RequestLimiter:
    return RequestLimiter(min_gap_s=0.0, sleep=lambda _seconds: None)


def answering(status: int, body: str) -> Callable[[httpx.Request], httpx.Response]:
    return lambda _request: httpx.Response(status, text=body)


class FakeClock:
    def __init__(self) -> None:
        self.now = 100.0
        self.sleeps: list[float] = []

    def read(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds
