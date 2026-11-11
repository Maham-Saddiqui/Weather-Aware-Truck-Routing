from tzfpy import get_tz

from domain.types import GeoPoint


class TimeZoneNotFound(LookupError):
    """No time zone covers the place; the departure picker cannot be set for it."""


class OfflineTimeZoneLookup:
    """Finds the IANA zone of a place offline, from data bundled with the library (RR-18)."""

    def zone_name(self, point: GeoPoint) -> str:
        name = get_tz(point.lon, point.lat)
        if not name:
            raise TimeZoneNotFound("No time zone covers this place.")
        return name
