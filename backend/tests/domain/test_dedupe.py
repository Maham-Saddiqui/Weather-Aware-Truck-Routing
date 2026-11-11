from dataclasses import replace

from domain.dedupe import choose_variety, drop_near_duplicates, route_id
from domain.types import GeoPoint, ProviderRoute, RouteGeometry
from tests.fakes.routing import straight_route

SEATTLE = GeoPoint(47.6, -122.3)
MIAMI = GeoPoint(25.8, -80.2)

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
