import json
from dataclasses import dataclass, field, replace
from datetime import UTC
from typing import Any

import httpx

from domain.types import GeoPoint, ProgressEntry, ProviderRoute, RouteGeometry
from providers.http import (
    CONNECT_TIMEOUT_S,
    QueryParams,
    get_with_one_retry,
    send_with_one_retry,
    without_retry_after_read_timeout,
)
from providers.provider_call import (
    ATTRIBUTION,
    NO_ROUTE_FOUND,
    TOMTOM,
    UNREADABLE_ANSWER,
    ProviderCall,
)
from providers.routing.polyline import decode_polyline
from providers.routing.port import (
    NoRouteFound,
    RouteQuery,
    RoutingProviderName,
    RoutingUnavailable,
)

TOMTOM_BASE_URL = "https://api.tomtom.com"
TOMTOM_READ_TIMEOUT_S = 8.0
ALTERNATIVES_READ_TIMEOUT_S = 12.0
HTTP_OK = 200
HTTP_BAD_REQUEST = 400
NO_ROUTE_MARKERS = ("NO_ROUTE_FOUND", "MAP_MATCHING_FAILURE")

type JsonObject = dict[str, Any]


class TomTomRouting:
    name = RoutingProviderName.TOMTOM

    def __init__(self, api_key: str, client: httpx.Client, base_url: str = TOMTOM_BASE_URL) -> None:
        self._http = _TomTomHttp(api_key, client, base_url)
        self._alternatives_http = replace(
            self._http,
            read_timeout=httpx.Timeout(ALTERNATIVES_READ_TIMEOUT_S, connect=CONNECT_TIMEOUT_S),
        )

    def routes(self, query: RouteQuery) -> tuple[ProviderRoute, ...]:
        """Alternatives take TomTom longer on long trips: more time, and one attempt only."""
        http = self._alternatives_http if query.max_alternatives else self._http
        waypoints = f"{_waypoint(query.origin)}:{_waypoint(query.destination)}"
        call = ProviderCall(TOMTOM)
        body = http.get_json(
            f"/routing/1/calculateRoute/{waypoints}/json", _route_params(query), call
        )
        try:
            routes = tuple(_parse_route(raw) for raw in body["routes"])
        except (KeyError, IndexError, TypeError, ValueError):
            call.failed(UNREADABLE_ANSWER)
            raise RoutingUnavailable("TomTom sent a route answer we cannot read") from None
        if not routes:
            call.failed(NO_ROUTE_FOUND)
            raise NoRouteFound("TomTom found no route")
        return routes


class TomTomAttribution:
    """Fetches the required credit text on every call; it is never stored (SEC-08)."""

    def __init__(self, api_key: str, client: httpx.Client, base_url: str = TOMTOM_BASE_URL) -> None:
        self._http = _TomTomHttp(api_key, client, base_url)

    def routing_copyright(self) -> str:
        call = ProviderCall(ATTRIBUTION)
        body = self._http.get_json("/map/2/copyrights/caption.json", {}, call)
        caption = body.get("copyrightsCaption")
        if not isinstance(caption, str) or not caption:
            call.failed(UNREADABLE_ANSWER)
            raise RoutingUnavailable("TomTom sent a copyright answer we cannot read")
        return caption


@dataclass(frozen=True, slots=True)
class _TomTomHttp:
    """The key is in the query string, so URLs and transport errors are never logged or chained.

    With a read_timeout, a call waits that long and is not repeated after a read timeout.
    """

    api_key: str = field(repr=False)
    client: httpx.Client
    base_url: str
    read_timeout: httpx.Timeout | None = None

    def get_json(self, path: str, params: QueryParams, call: ProviderCall) -> JsonObject:
        if not self.api_key:
            raise RoutingUnavailable("No TomTom key is configured")
        try:
            response = self._get(self.base_url + path, {**params, "key": self.api_key}, call)
        except httpx.RequestError:
            raise RoutingUnavailable("TomTom could not be reached") from None
        _raise_for_failure(response, call)
        try:
            body = json.loads(response.text)
        except ValueError:
            call.failed(UNREADABLE_ANSWER)
            raise RoutingUnavailable("TomTom sent an answer that is not JSON") from None
        if not isinstance(body, dict):
            call.failed(UNREADABLE_ANSWER)
            raise RoutingUnavailable("TomTom sent an answer that is not a JSON object")
        return body

    def _get(self, url: str, params: QueryParams, call: ProviderCall) -> httpx.Response:
        if self.read_timeout is None:
            return get_with_one_retry(self.client, url, params, call)
        with without_retry_after_read_timeout():
            return send_with_one_retry(
                lambda: self.client.get(url, params=params, timeout=self.read_timeout), call
            )


def _waypoint(point: GeoPoint) -> str:
    return f"{point.lat},{point.lon}"


def _route_params(query: RouteQuery) -> QueryParams:
    return {
        "travelMode": "truck",
        "vehicleCommercial": "true",
        "vehicleWeight": query.vehicle_weight_kg,
        "departAt": query.depart_at.astimezone(UTC).replace(microsecond=0).isoformat(),
        "routeType": query.preference.value,
        "maxAlternatives": query.max_alternatives,
        "routeRepresentation": "encodedPolyline",
        "extendedRouteRepresentation": ["distance", "travelTime"],
    }


def _raise_for_failure(response: httpx.Response, call: ProviderCall) -> None:
    if response.status_code == HTTP_OK:
        return
    if _says_no_route(response):
        call.failed(NO_ROUTE_FOUND)
        raise NoRouteFound("TomTom found no route")
    call.status_failed(response.status_code)
    raise RoutingUnavailable(f"TomTom answered with status {response.status_code}")


def _says_no_route(response: httpx.Response) -> bool:
    """Not confirmed against a live answer: the error text and codes are our best reading."""
    return response.status_code == HTTP_BAD_REQUEST and any(
        marker in response.text for marker in NO_ROUTE_MARKERS
    )


def _leg_geometry(raw: JsonObject) -> RouteGeometry:
    """Not confirmed against a live answer: where the line sits (legs[0].encodedPolyline)."""
    (leg,) = raw["legs"]
    return RouteGeometry(leg["encodedPolyline"], int(leg["encodedPolylinePrecision"]))


def _parse_route(raw: JsonObject) -> ProviderRoute:
    geometry = _leg_geometry(raw)
    return ProviderRoute(
        geometry=geometry,
        path=decode_polyline(geometry.encoded, geometry.precision),
        distance_m=int(raw["summary"]["lengthInMeters"]),
        travel_time_s=int(raw["summary"]["travelTimeInSeconds"]),
        progress=tuple(_parse_progress(entry) for entry in raw["progress"]),
    )


def _parse_progress(entry: JsonObject) -> ProgressEntry:
    return ProgressEntry(
        point_index=int(entry["pointIndex"]),
        distance_m=int(entry["distanceInMeters"]),
        elapsed_s=int(entry["travelTimeInSeconds"]),
    )
