from domain.types import GeoPoint

_CHUNK_BITS = 5
_CHUNK_MASK = 0x1F
_CONTINUATION_BIT = 0x20
_ASCII_OFFSET = 63


def decode_polyline(encoded: str, precision: int) -> tuple[GeoPoint, ...]:
    """Decodes a Google-style encoded polyline; raises ValueError on a truncated line."""
    scale = 10**precision
    points: list[GeoPoint] = []
    index = lat = lon = 0
    while index < len(encoded):
        lat_step, index = _read_signed_step(encoded, index)
        lon_step, index = _read_signed_step(encoded, index)
        lat += lat_step
        lon += lon_step
        points.append(GeoPoint(lat / scale, lon / scale))
    return tuple(points)


def _read_signed_step(encoded: str, index: int) -> tuple[int, int]:
    value = shift = 0
    while True:
        if index >= len(encoded):
            raise ValueError("Encoded polyline ends in the middle of a value")
        chunk = ord(encoded[index]) - _ASCII_OFFSET
        index += 1
        value |= (chunk & _CHUNK_MASK) << shift
        shift += _CHUNK_BITS
        if not chunk & _CONTINUATION_BIT:
            break
    return (~value >> 1 if value & 1 else value >> 1), index
