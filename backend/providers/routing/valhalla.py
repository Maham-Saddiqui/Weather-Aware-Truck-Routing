import json
import threading
import time
from collections.abc import Callable
from decimal import Decimal, InvalidOperation
from itertools import pairwise
from math import asin, cos, radians, sin, sqrt
from typing import Any

import httpx

from domain.types import GeoPoint, ProgressEntry, ProviderRoute, RouteGeometry
from domain.units import round_half_up
from providers.routing.polyline import decode_polyline
from providers.routing.port import (
    NoRouteFound,
    RouteQuery,
    RoutingProviderName,
    RoutingUnavailable,
)

SHAPE_PRECISION = 6
MIN_SECONDS_BETWEEN_REQUESTS = 1.0
CONNECT_TIMEOUT_S = 3.0
READ_TIMEOUT_S = 15.0
USER_AGENT = "weather-aware-truck-routing"
KILOGRAMS_PER_TONNE = 1000
METRES_PER_KILOMETRE = Decimal(1000)
WHOLE_NUMBER = Decimal(1)
EARTH_RADIUS_M = 6_371_000.0
PROGRESS_POINT_STRIDE = 10
NO_ROUTE_ERROR_CODES = frozenset({171, 442})


class RequestLimiter:
    """Lets one request start per interval, whichever thread asks (BE-08, BE-09)."""

    def __init__(
        self,
        min_gap_s: float = MIN_SECONDS_BETWEEN_REQUESTS,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._min_gap_s = min_gap_s
        self._clock = clock
        self._sleep = sleep
        self._lock = threading.Lock()
        self._next_start = 0.0

    def wait_for_turn(self) -> None:
        with self._lock:
            now = self._clock()
            start = max(now, self._next_start)
            if start > now:
                self._sleep(start - now)
            self._next_start = start + self._min_gap_s


class ValhallaRouting:
    """The backup routing provider (architecture section 6): truck costing, one answer per call."""

    name = RoutingProviderName.VALHALLA

    def __init__(self, client: httpx.Client, base_url: str, limiter: RequestLimiter) -> None:
        self._client = client
        self._url = f"{base_url.rstrip('/')}/route"
        self._limiter = limiter

    def routes(self, query: RouteQuery) -> tuple[ProviderRoute, ...]:
        response = self._send(_request_body(query))
        return _routes_from(self._payload_of(response))

    def _send(self, body: dict[str, Any]) -> httpx.Response:
        try:
            return self._post(body)
        except httpx.TransportError:
            return self._post_again(body)

    def _post_again(self, body: dict[str, Any]) -> httpx.Response:
        """One retry for network errors only (architecture section 10); the limiter spaces it."""
        try:
            return self._post(body)
        except httpx.TransportError as error:
            raise RoutingUnavailable("The backup routing service did not answer.") from error

    def _post(self, body: dict[str, Any]) -> httpx.Response:
        self._limiter.wait_for_turn()
        return self._client.post(
            self._url,
            json=body,
            headers={"User-Agent": USER_AGENT},
            timeout=httpx.Timeout(READ_TIMEOUT_S, connect=CONNECT_TIMEOUT_S),
        )

    def _payload_of(self, response: httpx.Response) -> dict[str, Any]:
        payload = _parse(response.text)
        if response.is_success:
            return payload
        if payload.get("error_code") in NO_ROUTE_ERROR_CODES:
            raise NoRouteFound("The backup routing service found no truck route.")
        raise RoutingUnavailable(
            f"The backup routing service failed (HTTP {response.status_code})."
        )


def _request_body(query: RouteQuery) -> dict[str, Any]:
    """The preference is ignored: the backup always answers with its default costing."""
    return {
        "locations": [_location(query.origin), _location(query.destination)],
        "costing": "truck",
        "costing_options": {"truck": {"weight": query.vehicle_weight_kg / KILOGRAMS_PER_TONNE}},
        "alternates": query.max_alternatives,
        "directions_options": {"units": "kilometers"},
    }


def _location(point: GeoPoint) -> dict[str, float]:
    return {"lat": point.lat, "lon": point.lon}


def _parse(text: str) -> dict[str, Any]:
    try:
        payload = json.loads(text, parse_float=Decimal)
    except ValueError as error:
        raise RoutingUnavailable("The backup routing service sent an unreadable answer.") from error
    if not isinstance(payload, dict):
        raise RoutingUnavailable("The backup routing service sent an unreadable answer.")
    return payload


def _routes_from(payload: dict[str, Any]) -> tuple[ProviderRoute, ...]:
    try:
        trips = [
            payload["trip"],
            *(alternate["trip"] for alternate in payload.get("alternates", [])),
        ]
        return tuple(_route_from(trip) for trip in trips)
    except (KeyError, IndexError, TypeError, ValueError, InvalidOperation) as error:
        raise RoutingUnavailable("The backup routing service sent an unreadable answer.") from error


def _route_from(trip: dict[str, Any]) -> ProviderRoute:
    shape = trip["legs"][0]["shape"]
    path = decode_polyline(shape, SHAPE_PRECISION)
    distance_m = _whole(Decimal(trip["summary"]["length"]) * METRES_PER_KILOMETRE)
    travel_time_s = _whole(Decimal(trip["summary"]["time"]))
    return ProviderRoute(
        geometry=RouteGeometry(encoded=shape, precision=SHAPE_PRECISION),
        path=path,
        distance_m=distance_m,
        travel_time_s=travel_time_s,
        progress=_progress_by_distance(path, distance_m, travel_time_s),
    )


def _whole(value: Decimal) -> int:
    return int(round_half_up(value, WHOLE_NUMBER))


def _progress_by_distance(
    path: tuple[GeoPoint, ...], distance_m: int, travel_time_s: int
) -> tuple[ProgressEntry, ...]:
    """The single place where time is spread over the route in proportion to distance."""
    along = _cumulative_metres(path)
    indexes = [*range(0, len(path) - 1, PROGRESS_POINT_STRIDE), len(path) - 1]
    entries = []
    for index in indexes:
        share = along[index] / along[-1] if along[-1] else 0.0
        entries.append(
            ProgressEntry(index, round(share * distance_m), round(share * travel_time_s))
        )
    return tuple(entries)


def _cumulative_metres(path: tuple[GeoPoint, ...]) -> list[float]:
    along = [0.0]
    for before, after in pairwise(path):
        along.append(along[-1] + _great_circle_m(before, after))
    return along


def _great_circle_m(start: GeoPoint, end: GeoPoint) -> float:
    d_lat = radians(end.lat - start.lat)
    d_lon = radians(end.lon - start.lon)
    haversine = (
        sin(d_lat / 2) ** 2 + cos(radians(start.lat)) * cos(radians(end.lat)) * sin(d_lon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * asin(sqrt(haversine))
