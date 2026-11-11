from fractions import Fraction
from math import floor
from time import perf_counter

from hypothesis import given
from hypothesis import strategies as st

from domain.constants import OVERLAP_CELLS_PER_DEGREE
from domain.dedupe import NEAR_DUPLICATE_OVERLAP, Cell, Shape, ShapeBook, overlap
from domain.types import GeoPoint, ProviderRoute, RouteGeometry
from tests.fakes.routing import straight_route, with_denser_vertices

SEATTLE = GeoPoint(47.6, -122.3)
MIAMI = GeoPoint(25.8, -80.2)
GENEROUS_SECONDS = 2.0

lats = st.floats(min_value=30.0, max_value=30.2)
lons = st.floats(min_value=-100.2, max_value=-100.0)
paths = st.lists(st.builds(GeoPoint, lats, lons), min_size=1, max_size=40).map(tuple)


def route_on(path: tuple[GeoPoint, ...], name: str = "a") -> ProviderRoute:
    return ProviderRoute(RouteGeometry(name, 5), path, distance_m=1, travel_time_s=1, progress=())


def share_by_nine_neighbour_probe(shape: frozenset[Cell], other: frozenset[Cell]) -> int:
    """The definition the faster set arithmetic replaces: probe each cell's nine neighbours."""
    return sum(
        1
        for row, column in shape
        if any((row + dr, column + dc) in other for dr in (-1, 0, 1) for dc in (-1, 0, 1))
    )


@given(paths, paths)
def test_section5_the_overlap_is_exactly_what_probing_the_nine_neighbours_gives(
    first: tuple[GeoPoint, ...], second: tuple[GeoPoint, ...]
) -> None:
    """Architecture section 5: overlap decides near-duplicates and variety."""
    a, b = Shape(route_on(first)), Shape(route_on(second))
    shared = share_by_nine_neighbour_probe(a.cells, b.cells) + share_by_nine_neighbour_probe(
        b.cells, a.cells
    )

    assert overlap(a, b) == Fraction(shared, len(a.cells) + len(b.cells))


def test_section5_a_shape_holds_every_cell_between_two_far_apart_vertices() -> None:
    route = route_on((GeoPoint(35.005, -100.0), GeoPoint(35.005, -99.0)))

    row = floor(35.005 * OVERLAP_CELLS_PER_DEGREE)
    first_column = floor(-100.0 * OVERLAP_CELLS_PER_DEGREE)
    whole_road = {(row, first_column + step) for step in range(OVERLAP_CELLS_PER_DEGREE + 1)}
    assert Shape(route).cells == whole_road


def test_section5_a_shape_of_a_single_vertex_is_its_own_cell() -> None:
    cell = (floor(35.005 * OVERLAP_CELLS_PER_DEGREE), floor(-100.0 * OVERLAP_CELLS_PER_DEGREE))

    assert Shape(route_on((GeoPoint(35.005, -100.0),))).cells == {cell}


def test_section5_a_sparse_and_a_dense_route_along_one_line_hold_the_same_cells() -> None:
    sparse = straight_route(SEATTLE, MIAMI)
    dense = with_denser_vertices(sparse, pieces_per_segment=600)

    assert overlap(Shape(sparse), Shape(dense)) >= NEAR_DUPLICATE_OVERLAP


def test_section5_a_cross_country_route_of_six_thousand_points_is_shaped_quickly() -> None:
    long_route = with_denser_vertices(straight_route(SEATTLE, MIAMI, bend_lat=3.0), 600)

    started = perf_counter()
    cells = Shape(long_route).cells
    elapsed = perf_counter() - started

    assert len(cells) < 20_000
    assert elapsed < GENEROUS_SECONDS


def test_a_shape_book_works_each_route_out_once_and_tells_routes_apart() -> None:
    book = ShapeBook()
    first = route_on((GeoPoint(30.0, -100.0),), "first")
    second = route_on((GeoPoint(31.0, -100.0),), "second")

    assert book.of(first) is book.of(first)
    assert book.of(first).cells != book.of(second).cells
