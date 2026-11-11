import hashlib
from collections.abc import Sequence
from fractions import Fraction
from math import floor

from domain.constants import NEAR_DUPLICATE_OVERLAP_PERCENT, OVERLAP_CELLS_PER_DEGREE
from domain.types import ProviderRoute, RouteGeometry

ROUTE_ID_LENGTH = 16
NEAR_DUPLICATE_OVERLAP = Fraction(NEAR_DUPLICATE_OVERLAP_PERCENT, 100)

Cell = tuple[int, int]


def route_id(geometry: RouteGeometry) -> str:
    """A stable hash of the geometry, so the screen keeps its selection between responses."""
    text = f"{geometry.precision}:{geometry.encoded}"
    return hashlib.sha256(text.encode()).hexdigest()[:ROUTE_ID_LENGTH]


def drop_near_duplicates(routes: Sequence[ProviderRoute]) -> tuple[ProviderRoute, ...]:
    """Keeps the first of any routes that follow the same roads; length plays no part."""
    kept: list[ProviderRoute] = []
    kept_shapes: list[frozenset[Cell]] = []
    for route in routes:
        shape = _shape_of(route)
        if all(_overlap(shape, other) < NEAR_DUPLICATE_OVERLAP for other in kept_shapes):
            kept.append(route)
            kept_shapes.append(shape)
    return tuple(kept)


def choose_variety(routes: Sequence[ProviderRoute], limit: int) -> tuple[ProviderRoute, ...]:
    """The fastest route first, then each time the route sharing least road with those kept."""
    if not routes:
        return ()
    shapes = [_shape_of(route) for route in routes]
    chosen = [min(range(len(routes)), key=lambda i: routes[i].travel_time_s)]
    remaining = [i for i in range(len(routes)) if i not in chosen]
    while remaining and len(chosen) < limit:
        next_index = min(remaining, key=lambda i: _variety_cost(i, chosen, shapes, routes))
        chosen.append(next_index)
        remaining.remove(next_index)
    return tuple(routes[i] for i in chosen)


def _variety_cost(
    candidate: int,
    chosen: list[int],
    shapes: list[frozenset[Cell]],
    routes: Sequence[ProviderRoute],
) -> tuple[Fraction, int]:
    most_shared = max(_overlap(shapes[candidate], shapes[kept]) for kept in chosen)
    return most_shared, routes[candidate].travel_time_s


def _shape_of(route: ProviderRoute) -> frozenset[Cell]:
    """Coordinates are the only floats allowed; cells make shapes comparable with integers."""
    return frozenset(
        (floor(point.lat * OVERLAP_CELLS_PER_DEGREE), floor(point.lon * OVERLAP_CELLS_PER_DEGREE))
        for point in route.path
    )


def _overlap(shape: frozenset[Cell], other: frozenset[Cell]) -> Fraction:
    """Share of both shapes lying on the other; a neighbouring cell counts as the same road."""
    shared = _cells_near(shape, other) + _cells_near(other, shape)
    return Fraction(shared, len(shape) + len(other))


def _cells_near(shape: frozenset[Cell], other: frozenset[Cell]) -> int:
    return sum(1 for cell in shape if any(near in other for near in _neighbourhood(cell)))


def _neighbourhood(cell: Cell) -> list[Cell]:
    row, column = cell
    return [(row + dr, column + dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1)]
