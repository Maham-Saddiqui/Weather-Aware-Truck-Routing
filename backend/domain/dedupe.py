import hashlib
from collections.abc import Sequence
from fractions import Fraction
from functools import cached_property
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


class Shape:
    """The 0.01 degree cells a route passes through; coordinates are the only floats allowed, so
    cells make shapes comparable with integers."""

    def __init__(self, route: ProviderRoute) -> None:
        self.cells = frozenset(
            (
                floor(point.lat * OVERLAP_CELLS_PER_DEGREE),
                floor(point.lon * OVERLAP_CELLS_PER_DEGREE),
            )
            for point in route.path
        )

    @cached_property
    def halo(self) -> frozenset[Cell]:
        """The shape's cells and their eight neighbours: a neighbouring cell is the same road."""
        return frozenset(
            (row + dr, column + dc)
            for row, column in self.cells
            for dr in (-1, 0, 1)
            for dc in (-1, 0, 1)
        )


class ShapeBook:
    """The shapes of one request's routes, each worked out once and dropped with the request."""

    def __init__(self) -> None:
        self._shapes: dict[RouteGeometry, Shape] = {}

    def of(self, route: ProviderRoute) -> Shape:
        if route.geometry not in self._shapes:
            self._shapes[route.geometry] = Shape(route)
        return self._shapes[route.geometry]


def overlap(shape: Shape, other: Shape) -> Fraction:
    """Share of both shapes lying on the other; a neighbouring cell counts as the same road."""
    shared = len(shape.cells & other.halo) + len(other.cells & shape.halo)
    return Fraction(shared, len(shape.cells) + len(other.cells))


def drop_near_duplicates(
    routes: Sequence[ProviderRoute], book: ShapeBook | None = None
) -> tuple[ProviderRoute, ...]:
    """Keeps the first of any routes that follow the same roads; length plays no part."""
    book = book or ShapeBook()
    kept: list[ProviderRoute] = []
    for route in routes:
        shape = book.of(route)
        if all(overlap(shape, book.of(other)) < NEAR_DUPLICATE_OVERLAP for other in kept):
            kept.append(route)
    return tuple(kept)


def choose_variety(
    routes: Sequence[ProviderRoute], limit: int, book: ShapeBook | None = None
) -> tuple[ProviderRoute, ...]:
    """The fastest route first, then each time the route sharing least road with those kept."""
    if not routes:
        return ()
    book = book or ShapeBook()
    chosen = [min(range(len(routes)), key=lambda i: routes[i].travel_time_s)]
    remaining = [i for i in range(len(routes)) if i not in chosen]
    while remaining and len(chosen) < limit:
        next_index = min(remaining, key=lambda i: _variety_cost(i, chosen, routes, book))
        chosen.append(next_index)
        remaining.remove(next_index)
    return tuple(routes[i] for i in chosen)


def _variety_cost(
    candidate: int, chosen: list[int], routes: Sequence[ProviderRoute], book: ShapeBook
) -> tuple[Fraction, int]:
    shape = book.of(routes[candidate])
    most_shared = max(overlap(shape, book.of(routes[kept])) for kept in chosen)
    return most_shared, routes[candidate].travel_time_s
