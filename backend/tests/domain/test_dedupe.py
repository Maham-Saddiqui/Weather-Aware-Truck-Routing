from dataclasses import replace
from time import perf_counter

from domain.dedupe import ShapeBook, choose_variety, drop_near_duplicates, route_id
from domain.types import GeoPoint, ProviderRoute, RouteGeometry
from tests.fakes.routing import straight_route, with_denser_vertices

SEATTLE = GeoPoint(47.6, -122.3)
MIAMI = GeoPoint(25.8, -80.2)
GENEROUS_SECONDS = 2.0

POINTS_PER_ROUTE = 100


def road(lat: float, travel_time_s: int, lat_after_half: float | None = None) -> ProviderRoute:
    """A synthetic west-east road; optionally it turns onto another latitude halfway."""
    turn = lat if lat_after_half is None else lat_after_half
    path = tuple(
        GeoPoint(lat if point < POINTS_PER_ROUTE // 2 else turn, -100.0 + (point + 0.5) / 100)
        for point in range(POINTS_PER_ROUTE)
    )
    geometry = RouteGeometry(encoded=f"{lat}-{turn}", precision=5)
    return ProviderRoute(
        geometry, path, distance_m=100_000, travel_time_s=travel_time_s, progress=()
    )


def test_a_route_id_is_the_same_for_the_same_geometry_every_time() -> None:
    geometry = RouteGeometry(encoded="abc", precision=5)

    assert route_id(geometry) == route_id(RouteGeometry(encoded="abc", precision=5))
    assert len(route_id(geometry)) == 16


def test_a_route_id_differs_when_the_line_or_its_precision_differs() -> None:
    base = route_id(RouteGeometry(encoded="abc", precision=5))

    assert route_id(RouteGeometry(encoded="abd", precision=5)) != base
    assert route_id(RouteGeometry(encoded="abc", precision=6)) != base


def test_section5_a_route_on_the_same_roads_is_dropped_whatever_its_length() -> None:
    original = road(35.005, travel_time_s=3600)
    same_roads_longer_time = road(35.005, travel_time_s=5000)

    assert drop_near_duplicates([original, same_roads_longer_time]) == (original,)


def test_section5_a_route_one_cell_to_the_side_counts_as_the_same_road() -> None:
    original = road(35.005, travel_time_s=3600)
    next_to_it = road(35.015, travel_time_s=3700)

    assert drop_near_duplicates([original, next_to_it]) == (original,)


def test_section5_routes_on_different_roads_are_both_kept() -> None:
    north = road(36.005, travel_time_s=3600)
    south = road(35.005, travel_time_s=3700)

    assert drop_near_duplicates([north, south]) == (north, south)


def test_section5_a_route_sharing_only_half_its_road_is_kept() -> None:
    main = road(35.005, travel_time_s=3600)
    detour = road(35.005, travel_time_s=3800, lat_after_half=36.005)

    assert drop_near_duplicates([main, detour]) == (main, detour)


def test_section5_variety_starts_with_the_fastest_route_wherever_it_is_listed() -> None:
    slow = road(36.005, travel_time_s=4000)
    fast = road(35.005, travel_time_s=3600)

    assert choose_variety([slow, fast], limit=2) == (fast, slow)


def test_section5_variety_prefers_the_route_sharing_least_road_with_those_kept() -> None:
    fast = road(35.005, travel_time_s=3600)
    shares_half = road(35.005, travel_time_s=3700, lat_after_half=36.005)
    separate = road(37.005, travel_time_s=4500)

    assert choose_variety([fast, shares_half, separate], limit=2) == (fast, separate)


def test_section5_variety_breaks_ties_in_favour_of_the_faster_route() -> None:
    fast = road(35.005, travel_time_s=3600)
    slower = road(37.005, travel_time_s=4500)
    quicker = road(39.005, travel_time_s=4000)

    assert choose_variety([fast, slower, quicker], limit=2) == (fast, quicker)


def test_section5_variety_keeps_every_route_when_the_limit_allows() -> None:
    routes = [road(35.005, 3600), road(37.005, 4500), road(39.005, 4000)]

    assert len(choose_variety(routes, limit=5)) == 3


def test_section5_variety_of_no_routes_is_empty() -> None:
    assert choose_variety([], limit=3) == ()


def test_section5_routes_with_the_same_distance_and_time_are_one_route_whatever_the_line() -> None:
    first = straight_route(SEATTLE, MIAMI, distance_miles=3556)
    other_line_same_measures = straight_route(SEATTLE, MIAMI, distance_miles=3556, bend_lat=6.0)

    assert drop_near_duplicates([first, other_line_same_measures]) == (first,)


def test_section5_routes_differing_by_one_second_or_one_metre_are_not_taken_as_equal() -> None:
    first = straight_route(SEATTLE, MIAMI, distance_miles=3556, bend_lat=3.0)
    one_second_slower = replace(
        straight_route(SEATTLE, MIAMI, distance_miles=3556, bend_lat=6.0),
        travel_time_s=first.travel_time_s + 1,
    )
    one_metre_longer = replace(
        straight_route(SEATTLE, MIAMI, distance_miles=3556, bend_lat=-6.0),
        distance_m=first.distance_m + 1,
    )

    kept = drop_near_duplicates([first, one_second_slower, one_metre_longer])

    assert kept == (first, one_second_slower, one_metre_longer)


def test_section5_the_same_road_with_different_vertex_density_is_one_route() -> None:
    sparse = straight_route(SEATTLE, MIAMI, distance_miles=3556)
    dense = replace(with_denser_vertices(sparse, 500), distance_m=sparse.distance_m + 1)

    assert drop_near_duplicates([sparse, dense]) == (sparse,)
    assert drop_near_duplicates([dense, sparse]) == (dense,)


def test_section5_a_bent_route_stays_distinct_from_the_straight_line_at_any_density() -> None:
    straight = straight_route(SEATTLE, MIAMI, distance_miles=3556)
    bent = straight_route(SEATTLE, MIAMI, distance_miles=3600, bend_lat=3.0)
    bent_densely = with_denser_vertices(bent, 500)

    assert drop_near_duplicates([straight, bent_densely]) == (straight, bent_densely)


def test_section5_routes_that_merely_cross_each_other_stay_distinct() -> None:
    across = straight_route(SEATTLE, MIAMI, distance_miles=3556)
    down = straight_route(GeoPoint(44.9, -93.3), GeoPoint(29.8, -95.4), distance_miles=1200)

    assert drop_near_duplicates([across, down]) == (across, down)


def test_section5_routes_sharing_only_their_start_and_end_stay_distinct() -> None:
    direct = straight_route(SEATTLE, MIAMI, distance_miles=3556)
    around = straight_route(SEATTLE, MIAMI, distance_miles=3700, bend_lat=4.0)

    assert drop_near_duplicates([direct, around]) == (direct, around)


def test_section5_six_cross_country_routes_of_six_thousand_points_are_sorted_out_quickly() -> None:
    bends = (0.0, 1.0, 2.0, 3.0, 4.0, 5.0)
    routes = [
        with_denser_vertices(straight_route(SEATTLE, MIAMI, 3500 + 10 * i, bend), 600)
        for i, bend in enumerate(bends)
    ]
    book = ShapeBook()

    started = perf_counter()
    distinct = drop_near_duplicates(routes, book)
    chosen = choose_variety(distinct, limit=3, book=book)
    elapsed = perf_counter() - started

    assert len(chosen) == 3
    assert elapsed < GENEROUS_SECONDS


def test_section5_variety_on_long_dense_routes_still_starts_fast_and_adds_the_most_separate() -> (
    None
):
    fast = with_denser_vertices(straight_route(SEATTLE, MIAMI, 3500), 300)
    near_fast = with_denser_vertices(straight_route(SEATTLE, MIAMI, 3510, bend_lat=0.5), 300)
    far_away = with_denser_vertices(straight_route(SEATTLE, MIAMI, 3700, bend_lat=6.0), 300)

    assert choose_variety([near_fast, far_away, fast], limit=2) == (fast, far_away)
