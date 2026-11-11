from typing import Protocol

from domain.types import GeoPoint


class TimeZoneLookup(Protocol):
    def zone_name(self, point: GeoPoint) -> str:
        """IANA name such as America/Chicago (RR-18)."""
        ...
