from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Protocol

from domain.types import GeoPoint, ProviderRoute


class RoutingProviderName(StrEnum):
    TOMTOM = "tomtom"
    VALHALLA = "valhalla"


class RoutePreference(StrEnum):
    FASTEST = "fastest"
    ECO = "eco"


@dataclass(frozen=True, slots=True)
class RouteQuery:
    origin: GeoPoint
    destination: GeoPoint
    depart_at: datetime
    vehicle_weight_kg: int
    preference: RoutePreference
    max_alternatives: int


class RoutingError(Exception):
    """Base of every routing failure; adapters raise only its two subclasses."""


class NoRouteFound(RoutingError):
    """The provider answered that no truck route exists. Never triggers the backup (BE-07)."""


class RoutingUnavailable(RoutingError):
    """Timeout, server error, too many requests, or a quota or key failure. Triggers the backup."""


class RoutingProvider(Protocol):
    name: RoutingProviderName

    def routes(self, query: RouteQuery) -> tuple[ProviderRoute, ...]: ...


class AttributionSource(Protocol):
    def routing_copyright(self) -> str: ...
