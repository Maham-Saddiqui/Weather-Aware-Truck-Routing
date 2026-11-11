from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import IntEnum


@dataclass(frozen=True, slots=True)
class GeoPoint:
    """The only floats in the domain (RR-30).

    They place points and group nearby ones into cells; they never enter ratings, distances or
    comparisons of risk.
    """

    lat: float
    lon: float


class CheckpointSpacing(IntEnum):
    """RR-12: the only distances, in miles, a driver can choose between checkpoints."""

    TEN_MILES = 10
    TWENTY_FIVE_MILES = 25
    FIFTY_MILES = 50


@dataclass(frozen=True, slots=True)
class RouteGeometry:
    encoded: str
    precision: int


@dataclass(frozen=True, slots=True)
class ProgressEntry:
    """One reading of the provider's distance and travel-time table (RR-14, RR-15)."""

    point_index: int
    distance_m: int
    elapsed_s: int


@dataclass(frozen=True, slots=True)
class ProviderRoute:
    geometry: RouteGeometry
    path: tuple[GeoPoint, ...]
    distance_m: int
    travel_time_s: int
    progress: tuple[ProgressEntry, ...]


@dataclass(frozen=True, slots=True)
class HourlyWeather:
    """Exact hourly series from one forecast window; None marks a missing reading (RR-11).

    wind and gust describe the moment of the timestamp; rain and snow are the total of
    the hour ending at the timestamp, rain being rain plus showers (RR-02, RR-17).
    """

    first_hour_utc: datetime
    wind_mph: tuple[Decimal | None, ...]
    gust_mph: tuple[Decimal | None, ...]
    rain_in: tuple[Decimal | None, ...]
    snow_in: tuple[Decimal | None, ...]
