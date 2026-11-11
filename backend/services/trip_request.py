from dataclasses import dataclass
from datetime import datetime

from domain.types import GeoPoint


@dataclass(frozen=True, slots=True)
class TripRequest:
    """A validated trip (RR-29); labels are for the screen only and stop at the API layer."""

    origin: GeoPoint
    destination: GeoPoint
    departure_utc: datetime
    load_lb: int
    spacing_miles: int
