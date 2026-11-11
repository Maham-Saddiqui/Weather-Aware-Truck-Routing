from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from domain.checkpoints import Stop
from domain.ranking import Recommendation
from domain.rating import CheckpointRating, Measurements
from domain.summary import RouteSummary
from domain.types import GeoPoint, ProviderRoute
from providers.routing.port import RoutingProviderName


class WeatherStatus(StrEnum):
    OK = "ok"
    PARTIAL = "partial"
    UNAVAILABLE = "unavailable"
    BUSY = "busy"


@dataclass(frozen=True, slots=True)
class RatedCheckpoint:
    stop: Stop
    measurements: Measurements
    rating: CheckpointRating
    time_zone: str


@dataclass(frozen=True, slots=True)
class RatedRoute:
    """rank stays None in the primary response and for ineligible routes (RR-23)."""

    route_id: str
    route: ProviderRoute
    checkpoints: tuple[RatedCheckpoint, ...]
    summary: RouteSummary
    rank: int | None = None


@dataclass(frozen=True, slots=True)
class HeatmapPoint:
    position: GeoPoint
    risk: str


@dataclass(frozen=True, slots=True)
class Heatmap:
    start_utc: datetime
    points: tuple[HeatmapPoint, ...]


@dataclass(frozen=True, slots=True)
class PrimaryTripResult:
    route: RatedRoute
    heatmap: Heatmap
    routing_provider: RoutingProviderName
    weather_status: WeatherStatus


@dataclass(frozen=True, slots=True)
class CompareTripResult:
    routes: tuple[RatedRoute, ...]
    recommendation: Recommendation
    heatmap: Heatmap
    routing_provider: RoutingProviderName
    weather_status: WeatherStatus
