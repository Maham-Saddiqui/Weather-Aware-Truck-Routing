from bisect import bisect_left
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from itertools import pairwise

from domain.constants import METRES_PER_MILE
from domain.types import GeoPoint, ProgressEntry, ProviderRoute
from domain.units import round_half_up

MICROSECONDS_PER_SECOND = Decimal(1_000_000)
WHOLE_NUMBER = Decimal(1)


@dataclass(frozen=True, slots=True)
class Stop:
    """A checkpoint on the route: where it is, when the truck arrives, what stretch it covers."""

    index: int
    distance_m: Decimal
    covered_m: Decimal
    position: GeoPoint
    eta_utc: datetime


def plan_stops(
    route: ProviderRoute, spacing_miles: int, departure_utc: datetime
) -> tuple[Stop, ...]:
    """RR-13 places the checkpoints, RR-15 the arrival times, RR-19 the covered stretches."""
    length_m = Decimal(route.distance_m)
    distances = _checkpoint_distances(length_m, spacing_miles)
    covered = _covered_stretches(distances, length_m)
    table = _progress_table(route)
    stops = []
    for index, (distance_m, covered_m) in enumerate(zip(distances, covered, strict=True)):
        point_index, elapsed_s = _read_progress(table, distance_m)
        stops.append(
            Stop(
                index=index,
                distance_m=distance_m,
                covered_m=covered_m,
                position=_position_on_path(route.path, point_index),
                eta_utc=departure_utc + _duration(elapsed_s),
            )
        )
    return tuple(stops)


def _checkpoint_distances(length_m: Decimal, spacing_miles: int) -> tuple[Decimal, ...]:
    """Origin, each multiple of the spacing and the destination; a set merges an exact multiple."""
    spacing_m = Decimal(spacing_miles) * METRES_PER_MILE
    multiples = {spacing_m * count for count in range(int(length_m // spacing_m) + 1)}
    return tuple(sorted(multiples | {length_m}))


def _covered_stretches(distances: tuple[Decimal, ...], length_m: Decimal) -> tuple[Decimal, ...]:
    """RR-19: each checkpoint covers from halfway back to halfway forward; the stretches add up."""
    midpoints = ((before + after) / 2 for before, after in pairwise(distances))
    boundaries = (Decimal(0), *midpoints, length_m)
    return tuple(end - start for start, end in pairwise(boundaries))


def _progress_table(route: ProviderRoute) -> tuple[ProgressEntry, ...]:
    """The provider's table with a start and an end entry, strictly increasing in distance."""
    table = [ProgressEntry(point_index=0, distance_m=0, elapsed_s=0)]
    for entry in route.progress:
        if entry.distance_m > table[-1].distance_m:
            table.append(entry)
    if route.distance_m > table[-1].distance_m:
        end = ProgressEntry(len(route.path) - 1, route.distance_m, route.travel_time_s)
        table.append(end)
    return tuple(table)


def _read_progress(
    table: tuple[ProgressEntry, ...], distance_m: Decimal
) -> tuple[Decimal, Decimal]:
    """Linear interpolation between neighbouring entries: (path point index, elapsed seconds)."""
    upper_position = bisect_left(table, distance_m, key=lambda entry: Decimal(entry.distance_m))
    upper = table[upper_position]
    if upper.distance_m == distance_m:
        return Decimal(upper.point_index), Decimal(upper.elapsed_s)
    lower = table[upper_position - 1]
    share = (distance_m - lower.distance_m) / (upper.distance_m - lower.distance_m)
    return (
        lower.point_index + share * (upper.point_index - lower.point_index),
        lower.elapsed_s + share * (upper.elapsed_s - lower.elapsed_s),
    )


def _position_on_path(path: tuple[GeoPoint, ...], point_index: Decimal) -> GeoPoint:
    """Coordinates are the only floats allowed (RR-30); the index itself stays exact."""
    before = int(point_index)
    if before >= len(path) - 1:
        return path[-1]
    share = float(point_index - before)
    start, end = path[before], path[before + 1]
    return GeoPoint(
        lat=start.lat + (end.lat - start.lat) * share,
        lon=start.lon + (end.lon - start.lon) * share,
    )


def _duration(elapsed_s: Decimal) -> timedelta:
    microseconds = round_half_up(elapsed_s * MICROSECONDS_PER_SECOND, WHOLE_NUMBER)
    return timedelta(microseconds=int(microseconds))
