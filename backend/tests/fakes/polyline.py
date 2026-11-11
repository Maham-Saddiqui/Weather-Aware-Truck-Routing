from collections.abc import Sequence

from domain.types import GeoPoint


def encode_polyline(points: Sequence[GeoPoint], precision: int) -> str:
    scale = 10**precision
    encoded = ""
    previous_lat = previous_lon = 0
    for point in points:
        lat, lon = round(point.lat * scale), round(point.lon * scale)
        encoded += _encode_step(lat - previous_lat) + _encode_step(lon - previous_lon)
        previous_lat, previous_lon = lat, lon
    return encoded


def _encode_step(step: int) -> str:
    value = ~(step << 1) if step < 0 else step << 1
    encoded = ""
    while value >= 0x20:
        encoded += chr((0x20 | (value & 0x1F)) + 63)
        value >>= 5
    return encoded + chr(value + 63)
