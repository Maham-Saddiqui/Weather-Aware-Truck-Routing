from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import cast

import pytest

from domain.checkpoints import plan_stops
from domain.constants import METRES_PER_MILE
from domain.types import CheckpointSpacing, GeoPoint, ProgressEntry, ProviderRoute, RouteGeometry

DEPARTURE = datetime(2026, 11, 12, 8, 0, tzinfo=UTC)
GEOMETRY = RouteGeometry(encoded="synthetic", precision=5)
LAST_POINT = 100


def straight_route(
    distance_m: int, travel_time_s: int = 7200, progress: tuple[ProgressEntry, ...] = ()
) -> ProviderRoute:
    """A synthetic east-west road of 101 points, one tenth of a degree apart."""
    path = tuple(GeoPoint(lat=35.0, lon=-100.0 + point / 10) for point in range(LAST_POINT + 1))
    return ProviderRoute(GEOMETRY, path, distance_m, travel_time_s, progress)


def halfway_table(distance_m: int) -> tuple[ProgressEntry, ...]:
    """Slow first half: 3000 s for the first half of the distance, 4200 s for the rest."""
    return (
        ProgressEntry(0, 0, 0),
        ProgressEntry(50, distance_m // 2, 3000),
        ProgressEntry(LAST_POINT, distance_m, 7200),
    )


def miles(count: str) -> Decimal:
    return Decimal(count) * METRES_PER_MILE


def test_rr13_checkpoints_sit_at_the_origin_every_multiple_and_the_destination() -> None:
    """RR-13."""
    stops = plan_stops(straight_route(210_000), CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE)

    assert [stop.distance_m for stop in stops] == [
        0,
        miles("25"),
        miles("50"),
        miles("75"),
        miles("100"),
        miles("125"),
        Decimal(210_000),
    ]
    assert [stop.index for stop in stops] == [0, 1, 2, 3, 4, 5, 6]


def test_rr13_an_exact_multiple_of_the_spacing_has_no_duplicate_destination() -> None:
    """RR-13."""
    stops = plan_stops(straight_route(201_168), CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE)

    assert [stop.distance_m for stop in stops][-2:] == [miles("100"), Decimal(201_168)]
    assert len(stops) == 6


def test_rr13_a_route_shorter_than_the_spacing_has_only_origin_and_destination() -> None:
    """RR-13."""
    stops = plan_stops(straight_route(12_875), CheckpointSpacing.TEN_MILES, DEPARTURE)

    assert [stop.distance_m for stop in stops] == [0, Decimal(12_875)]


def test_rr13_a_route_with_no_length_has_a_single_checkpoint() -> None:
    """RR-13."""
    stops = plan_stops(
        straight_route(0, travel_time_s=0), CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE
    )

    assert len(stops) == 1
    assert stops[0].covered_m == 0
    assert stops[0].eta_utc == DEPARTURE


def test_rr19_rr30_covered_stretches_of_a_60_mile_route_follow_the_worked_example() -> None:
    """RR-19, RR-30."""
    stops = plan_stops(
        straight_route(96_561), CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE
    )  # 60.0002 miles, whole metres

    assert [stop.covered_m for stop in stops] == [
        Decimal("20116.8"),
        Decimal("40233.6"),
        Decimal("28163.7"),
        Decimal("8046.9"),
    ]


def test_rr19_rr30_covered_stretches_add_up_exactly_to_the_route_length() -> None:
    """RR-19, RR-30."""
    for route_m in (12_875, 96_561, 201_168, 1_414_213):
        stops = plan_stops(straight_route(route_m), CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE)

        assert sum(stop.covered_m for stop in stops) == route_m


def test_rr19_an_8_mile_route_at_10_mile_spacing_covers_half_each() -> None:
    """RR-19."""
    stops = plan_stops(straight_route(12_875), CheckpointSpacing.TEN_MILES, DEPARTURE)

    assert [stop.covered_m for stop in stops] == [Decimal("6437.5"), Decimal("6437.5")]


def test_rr14_rr15_arrival_time_interpolates_the_providers_travel_time_table() -> None:
    """RR-14, RR-15."""
    route = straight_route(201_168, progress=halfway_table(201_168))

    stops = plan_stops(route, CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE)

    assert stops[0].eta_utc == DEPARTURE
    assert stops[1].eta_utc == DEPARTURE + timedelta(seconds=1200)
    assert stops[2].eta_utc == DEPARTURE + timedelta(seconds=2400)
    assert stops[3].eta_utc == DEPARTURE + timedelta(seconds=3840)
    assert stops[-1].eta_utc == DEPARTURE + timedelta(seconds=7200)


def test_rr14_a_table_without_start_and_end_entries_is_completed_from_the_route() -> None:
    """RR-14."""
    middle_only = (ProgressEntry(50, 100_584, 3000),)

    stops = plan_stops(
        straight_route(201_168, progress=middle_only),
        CheckpointSpacing.TWENTY_FIVE_MILES,
        DEPARTURE,
    )

    assert stops[0].eta_utc == DEPARTURE
    assert stops[-1].eta_utc == DEPARTURE + timedelta(seconds=7200)


def test_rr14_a_route_without_any_table_is_interpolated_by_distance() -> None:
    """RR-14."""
    stops = plan_stops(straight_route(201_168), CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE)

    assert stops[1].eta_utc == DEPARTURE + timedelta(seconds=1440)


def test_rr14_entries_that_do_not_advance_the_distance_are_ignored() -> None:
    """RR-14."""
    stalled = (ProgressEntry(10, 5_000, 100), ProgressEntry(11, 5_000, 140))

    stops = plan_stops(
        straight_route(201_168, progress=stalled), CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE
    )

    assert stops[-1].eta_utc == DEPARTURE + timedelta(seconds=7200)


def test_rr13_positions_run_from_the_first_to_the_last_point_of_the_path() -> None:
    """RR-13."""
    route = straight_route(201_168, progress=halfway_table(201_168))

    stops = plan_stops(route, CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE)

    assert stops[0].position == GeoPoint(35.0, -100.0)
    assert stops[-1].position == GeoPoint(35.0, -90.0)


def test_rr13_a_checkpoint_between_two_path_points_is_placed_proportionally() -> None:
    """RR-13."""
    route = straight_route(201_168, progress=halfway_table(201_168))

    stops = plan_stops(route, CheckpointSpacing.TWENTY_FIVE_MILES, DEPARTURE)

    assert stops[1].position.lon == pytest.approx(-100.0 + 20 / 10)
    assert stops[2].position.lon == pytest.approx(-96.0)
    assert stops[3].position.lon == pytest.approx(-94.0)


@pytest.mark.parametrize(
    ("spacing", "stop_count"),
    [
        (CheckpointSpacing.TEN_MILES, 15),
        (CheckpointSpacing.TWENTY_FIVE_MILES, 7),
        (CheckpointSpacing.FIFTY_MILES, 4),
    ],
)
def test_rr12_rr13_the_chosen_spacing_sets_how_many_checkpoints_a_210_km_route_has(
    spacing: CheckpointSpacing, stop_count: int
) -> None:
    """RR-12, RR-13."""
    stops = plan_stops(straight_route(210_000), spacing, DEPARTURE)

    assert len(stops) == stop_count


@pytest.mark.parametrize("spacing_miles", [0, 7, 15, 100])
def test_rr12_any_spacing_other_than_10_25_or_50_miles_is_refused(spacing_miles: int) -> None:
    """RR-12."""
    with pytest.raises(ValueError, match="not a valid CheckpointSpacing"):
        plan_stops(straight_route(210_000), cast(CheckpointSpacing, spacing_miles), DEPARTURE)
