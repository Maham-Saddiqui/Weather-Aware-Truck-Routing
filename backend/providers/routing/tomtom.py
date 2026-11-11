import json
from datetime import UTC
from typing import Any

import httpx

from domain.types import GeoPoint, ProgressEntry, ProviderRoute, RouteGeometry
from providers.http import QueryParams, get_with_one_retry
from providers.routing.polyline import decode_polyline
from providers.routing.port import (
    NoRouteFound,
    RouteQuery,
    RoutingProviderName,
    RoutingUnavailable,
)

TOMTOM_BASE_URL = "https://api.tomtom.com"
TOMTOM_READ_TIMEOUT_S = 8.0
HTTP_OK = 200
HTTP_BAD_REQUEST = 400
NO_ROUTE_MARKERS = ("NO_ROUTE_FOUND", "MAP_MATCHING_FAILURE")

type JsonObject = dict[str, Any]


class TomTomRouting:
    name = RoutingProviderName.TOMTOM

    def __init__(self, api_key: str, client: httpx.Client, base_url: str = TOMTOM_BASE_URL) -> None:
        self._http = _TomTomHttp(api_key, client, base_url)

    def routes(self, query: RouteQuery) -> tuple[ProviderRoute, ...]:
        waypoints = f"{_waypoint(query.origin)}:{_waypoint(query.destination)}"
        body = self._http.get_json(
            f"/routing/1/calculateRoute/{waypoints}/json", _route_params(query)
        )
        try:
            routes = tuple(_parse_route(raw) for raw in body["routes"])
        except (KeyError, IndexError, TypeError, ValueError):
            raise RoutingUnavailable("TomTom sent a route answer we cannot read") from None
        if not routes:
            raise NoRouteFound("TomTom found no route")
        return routes


class TomTomAttribution:
    """Fetches the required credit text on every call; it is never stored (SEC-08)."""

    def __init__(self, api_key: str, client: httpx.Client, base_url: str = TOMTOM_BASE_URL) -> None:
        self._http = _TomTomHttp(api_key, client, base_url)

    def routing_copyright(self) -> str:
        body = self._http.get_json("/map/2/copyrights/caption.json", {})
        caption = body.get("copyrightsCaption")
        if not isinstance(caption, str) or not caption:
            raise RoutingUnavailable("TomTom sent a copyright answer we cannot read")
        return caption


class _TomTomHttp:
    """The key is in the query string, so URLs and transport errors are never logged or chained."""

    def __init__(self, api_key: str, client: httpx.Client, base_url: str) -> None:
        self._api_key = api_key
        self._client = client
        self._base_url = base_url

    def get_json(self, path: str, params: QueryParams) -> JsonObject:
        if not self._api_key:
            raise RoutingUnavailable("No TomTom key is configured")
        try:
            response = get_with_one_retry(
                self._client, self._base_url + path, {**params, "key": self._api_key}
            )
        except httpx.TransportError:
            raise RoutingUnavailable("TomTom could not be reached") from None
        _raise_for_failure(response)
        try:
            body = json.loads(response.text)
        except ValueError:
            raise RoutingUnavailable("TomTom sent an answer that is not JSON") from None
        if not isinstance(body, dict):
            raise RoutingUnavailable("TomTom sent an answer that is not a JSON object")
        return body


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


def _raise_for_failure(response: httpx.Response) -> None:
    if response.status_code == HTTP_OK:
        return
    if _says_no_route(response):
        raise NoRouteFound("TomTom found no route")
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
