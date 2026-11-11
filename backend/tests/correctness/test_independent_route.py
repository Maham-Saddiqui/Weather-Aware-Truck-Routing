"""Independent check of checkpoints, summary and heatmap (RR-13 to RR-22, RR-28, RR-30)."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import cast

import pytest

from domain.checkpoints import plan_stops
from domain.heatmap import risk_digits
from domain.levels import Level, LoadRule
from domain.rating import CheckpointRating
from domain.summary import RatedStop, summarize
from domain.types import (
    CheckpointSpacing,
    GeoPoint,
    HourlyWeather,
    ProgressEntry,
    ProviderRoute,
    RouteGeometry,
)
from tests.correctness.expected_route import (
    BASE_HOUR_ISO,
    CALM_WIND,
    EDGE_METRE_CASES,
    ETA_CASES,
    HEAT_CASES,
    HEAT_HEAVY_LOAD_CHANGES,
    HEAT_HEAVY_LOAD_LB,
    HEAT_RAIN_OVERRIDES,
    HEAT_WIND_OVERRIDES,
    HEATMAP_HOURS,
    METRES_PER_MILE,
    PLACEMENT_CASES,
    SERIES_LENGTH,
    WHOLE_METRE_CASES,
)
from tests.correctness.expected_summary import SUMMARY_CASES

DEPARTURE = datetime(2026, 11, 12, 12, tzinfo=UTC)
ONE_MILE_M = Decimal(METRES_PER_MILE)


def route_of_length(length_m: Decimal) -> ProviderRoute:
    """Synthetic route; decimal metres are passed through for the hand-built mile cases (RR-30)."""
    return ProviderRoute(
        geometry=RouteGeometry("", 5),
        path=(GeoPoint(40.0, -100.0), GeoPoint(41.0, -101.0)),
        distance_m=cast(int, length_m),
        travel_time_s=3600,
        progress=(),
    )


def decimals(texts: list[str]) -> list[Decimal]:
    return [Decimal(text) for text in texts]


def in_metres(miles: list[str]) -> list[Decimal]:
    return [Decimal(text) * ONE_MILE_M for text in miles]


@pytest.mark.parametrize(("length", "spacing", "places", "covers"), PLACEMENT_CASES)
def test_checkpoints_sit_at_spacing_multiples_and_cover_midpoint_stretches_rr13_rr19(
    length: str, spacing: int, places: list[str], covers: list[str]
) -> None:
    """RR-13 RR-19 RR-30: placement, no duplicate at an exact multiple, stretches add up."""
    length_m = Decimal(length) * ONE_MILE_M
    stops = plan_stops(route_of_length(length_m), CheckpointSpacing(spacing), DEPARTURE)
    assert [stop.distance_m for stop in stops] == in_metres(places)
    assert [stop.covered_m for stop in stops] == in_metres(covers)
    assert sum((stop.covered_m for stop in stops), Decimal(0)) == length_m


@pytest.mark.parametrize(
    ("length", "spacing", "places", "covers"), WHOLE_METRE_CASES + EDGE_METRE_CASES
)
def test_whole_metre_routes_keep_exact_decimal_positions_and_stretches_rr30(
    length: str, spacing: int, places: list[str], covers: list[str]
) -> None:
    """RR-30: a 25-mile checkpoint at 40,233.6 m, never rounded, stretches add up exactly."""
    stops = plan_stops(route_of_length(Decimal(length)), CheckpointSpacing(spacing), DEPARTURE)
    assert [stop.distance_m for stop in stops] == decimals(places)
    assert [stop.covered_m for stop in stops] == decimals(covers)
    assert sum((stop.covered_m for stop in stops), Decimal(0)) == Decimal(length)


def rating_of(level: str) -> CheckpointRating:
    chosen = None if level == "no_data" else Level[level.upper()]
    return CheckpointRating(level=chosen, driving_factors=(), load_rule=LoadRule.NONE)


type SummaryCase = tuple[
    str, str, int, list[str], dict[str, str], str | None, str | None, bool, str | None
]


@pytest.mark.parametrize("case", SUMMARY_CASES, ids=[case[0] for case in SUMMARY_CASES])
def test_route_summary_reports_miles_average_worst_and_eligibility_rr20_rr21_rr22(
    case: SummaryCase,
) -> None:
    """RR-19 RR-20 RR-21 RR-22: exact miles per level, mile-weighted average, 10 percent cap."""
    why, length, spacing, levels, miles, average, worst, eligible, reason = case
    route = route_of_length(Decimal(length) * ONE_MILE_M)
    stops = plan_stops(route, CheckpointSpacing(spacing), DEPARTURE)
    assert len(stops) == len(levels), why
    rated = [RatedStop(stop, rating_of(level)) for stop, level in zip(stops, levels, strict=True)]
    summary = summarize(rated, 3600, DEPARTURE)
    by_level = summary.metres_by_level
    actual = {
        "low": by_level.low,
        "moderate": by_level.moderate,
        "high": by_level.high,
        "severe": by_level.severe,
        "no_travel": by_level.no_travel,
        "no_data": by_level.no_data,
    }
    for name, metres in actual.items():
        assert metres == Decimal(miles.get(name, "0")) * ONE_MILE_M, f"{why}: {name}"
    assert summary.average_risk == (None if average is None else Decimal(average)), why
    assert (None if summary.worst_level is None else summary.worst_level.name.lower()) == worst, why
    assert summary.is_eligible is eligible, why
    assert (
        None if summary.ineligible_reason is None else summary.ineligible_reason.value
    ) == reason, why


def heatmap_weather() -> HourlyWeather:
    wind = [Decimal(CALM_WIND)] * SERIES_LENGTH
    rain: list[Decimal | None] = [Decimal(0)] * SERIES_LENGTH
    wind_readings: list[Decimal | None] = list(wind)
    for hour, text in HEAT_WIND_OVERRIDES.items():
        wind_readings[hour] = None if text is None else Decimal(text)
    for hour, text in HEAT_RAIN_OVERRIDES.items():
        rain[hour] = None if text is None else Decimal(text)
    return HourlyWeather(
        first_hour_utc=datetime.fromisoformat(BASE_HOUR_ISO),
        wind_mph=tuple(wind_readings),
        gust_mph=tuple(wind_readings),
        rain_in=tuple(rain),
        snow_in=(Decimal(0),) * SERIES_LENGTH,
    )


def digits_from(changes: dict[int, str]) -> str:
    return "".join(changes.get(hour, "0") for hour in range(HEATMAP_HOURS))


@pytest.mark.parametrize("departure", list(HEAT_CASES))
def test_heatmap_string_has_49_digits_from_the_same_rating_and_hour_rule_rr28(
    departure: str,
) -> None:
    """RR-28 RR-17 RR-11: 49 characters, 0 to 4 or x; departures on and around the half hour."""
    digits = risk_digits(heatmap_weather(), datetime.fromisoformat(departure), 10_000)
    assert len(digits) == HEATMAP_HOURS
    assert digits == digits_from(HEAT_CASES[departure])


def test_heatmap_applies_the_load_rules_of_the_same_rating_function_rr28() -> None:
    """RR-28 RR-07 RR-08: heavy cargo lifts wind 40 to Severe and wind 50 to No Travel."""
    expected = digits_from(HEAT_CASES[BASE_HOUR_ISO] | HEAT_HEAVY_LOAD_CHANGES)
    assert (
        risk_digits(heatmap_weather(), datetime.fromisoformat(BASE_HOUR_ISO), HEAT_HEAVY_LOAD_LB)
        == expected
    )


def test_heatmap_without_any_forecast_is_all_x_rr28() -> None:
    """RR-28 RR-11: no data is x, never 0."""
    assert risk_digits(None, DEPARTURE, 10_000) == "x" * HEATMAP_HOURS


@pytest.mark.parametrize("case", ETA_CASES)
def test_arrival_is_departure_plus_the_providers_travel_time_to_that_distance_rr15(
    case: tuple[int, int, list[tuple[int, int]], int, list[tuple[str, str]]],
) -> None:
    """RR-14 RR-15: provider readings, linear in between, exact to the microsecond."""
    length, seconds, table, spacing, expected = case
    progress = tuple(ProgressEntry(1, metres, elapsed) for metres, elapsed in table)
    route = ProviderRoute(
        geometry=RouteGeometry("", 5),
        path=(GeoPoint(40.0, -100.0), GeoPoint(41.0, -101.0)),
        distance_m=length,
        travel_time_s=seconds,
        progress=progress,
    )
    stops = plan_stops(route, CheckpointSpacing(spacing), DEPARTURE)
    actual = [(stop.distance_m, stop.eta_utc) for stop in stops]
    wanted = [
        (Decimal(metres), DEPARTURE + timedelta(microseconds=int(Decimal(elapsed) * 1_000_000)))
        for metres, elapsed in expected
    ]
    assert actual == wanted
