from decimal import Decimal
from math import asin, cos, radians, sin, sqrt

from domain.constants import METRES_PER_MILE
from domain.types import GeoPoint

EARTH_RADIUS_M = 6_371_000.0


def great_circle_m(start: GeoPoint, end: GeoPoint) -> float:
    d_lat = radians(end.lat - start.lat)
    d_lon = radians(end.lon - start.lon)
    haversine = (
        sin(d_lat / 2) ** 2 + cos(radians(start.lat)) * cos(radians(end.lat)) * sin(d_lon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * asin(sqrt(haversine))


def straight_line_miles(start: GeoPoint, end: GeoPoint) -> Decimal:
    """The distance as the crow flies: a quick size of a trip before any route exists."""
    return Decimal(great_circle_m(start, end)) / METRES_PER_MILE
