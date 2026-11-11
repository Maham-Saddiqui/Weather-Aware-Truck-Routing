import math
from collections.abc import Mapping

from domain.types import GeoPoint, ProgressEntry, ProviderRoute, RouteGeometry
from providers.routing.port import (
    RoutePreference,
    RouteQuery,
    RoutingError,
    RoutingProviderName,
)
from tests.fakes.polyline import encode_polyline

type Outcome = tuple[ProviderRoute, ...] | RoutingError

POLYLINE_PRECISION = 5
METRES_PER_MILE = 1609.344
POINT_COUNT = 11
SECONDS_PER_MILE = 60


def straight_route(
    start: GeoPoint,
    end: GeoPoint,
    distance_miles: int = 100,
    bend_lat: float = 0.0,
) -> ProviderRoute:
    """A synthetic route along a line, bent north by `bend_lat` degrees at most."""
    fractions = [step / (POINT_COUNT - 1) for step in range(POINT_COUNT)]
    path = tuple(
        GeoPoint(
            start.lat + (end.lat - start.lat) * f + bend_lat * math.sin(math.pi * f),
            start.lon + (end.lon - start.lon) * f,
        )
        for f in fractions
    )
    distance_m = round(distance_miles * METRES_PER_MILE)
    travel_time_s = distance_miles * SECONDS_PER_MILE
    progress = tuple(
        ProgressEntry(index, round(distance_m * f), round(travel_time_s * f))
        for index, f in enumerate(fractions)
    )
    geometry = RouteGeometry(encode_polyline(path, POLYLINE_PRECISION), POLYLINE_PRECISION)
    return ProviderRoute(geometry, path, distance_m, travel_time_s, progress)


class FakeRouting:
    """Answers per route preference with routes or a scripted failure, and records every call."""

    def __init__(
        self,
        outcomes: Mapping[RoutePreference, Outcome],
        name: RoutingProviderName = RoutingProviderName.TOMTOM,
    ) -> None:
        self.name = name
        self.outcomes = dict(outcomes)
        self.calls: list[RouteQuery] = []

    def routes(self, query: RouteQuery) -> tuple[ProviderRoute, ...]:
        self.calls.append(query)
        outcome = self.outcomes[query.preference]
        if isinstance(outcome, RoutingError):
            raise outcome
        return outcome
