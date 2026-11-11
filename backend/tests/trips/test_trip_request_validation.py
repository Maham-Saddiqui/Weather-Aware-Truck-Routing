from datetime import timedelta
from typing import Any

import pytest
from rest_framework.exceptions import ValidationError

from domain.types import GeoPoint
from tests.fakes.bundle import CHICAGO, DENVER, NOW
from tests.fakes.trips import trip_body
from trips.problems import flatten_errors
from trips.serializers import parse_trip_request

valid_body = trip_body


def errors_for(body: dict[str, Any]) -> dict[str, list[str]]:
    with pytest.raises(ValidationError) as raised:
        parse_trip_request(body, NOW)
    return flatten_errors(raised.value.detail)


def test_a_valid_request_becomes_a_trip_request_with_the_default_spacing() -> None:
    """RR-12"""
    request = parse_trip_request(valid_body(), NOW)

    assert request.origin == CHICAGO
    assert request.destination == DENVER
    assert request.load_lb == 30_000
    assert request.spacing_miles == 25
    assert request.departure_utc == NOW + timedelta(hours=3)


@pytest.mark.parametrize("spacing", [10, 25, 50])
def test_the_three_spacings_are_accepted(spacing: int) -> None:
    """RR-12"""
    assert parse_trip_request(valid_body(spacing_miles=spacing), NOW).spacing_miles == spacing


def test_any_other_spacing_is_rejected() -> None:
    """RR-12"""
    assert "spacing_miles" in errors_for(valid_body(spacing_miles=15))


def test_a_departure_in_the_current_hour_is_accepted() -> None:
    """RR-29"""
    body = valid_body(departure_utc=NOW.replace(minute=0).isoformat())

    assert parse_trip_request(body, NOW).departure_utc == NOW.replace(minute=0)


def test_a_departure_before_the_current_hour_is_rejected() -> None:
    """RR-29"""
    body = valid_body(departure_utc=(NOW.replace(minute=0) - timedelta(minutes=1)).isoformat())

    assert errors_for(body) == {"departure_utc": ["Departure cannot be in the past."]}


def test_a_departure_exactly_7_days_ahead_is_accepted_and_later_is_rejected() -> None:
    """RR-29"""
    limit = NOW + timedelta(days=7)

    assert parse_trip_request(valid_body(departure_utc=limit.isoformat()), NOW)
    too_late = valid_body(departure_utc=(limit + timedelta(seconds=1)).isoformat())
    assert errors_for(too_late) == {"departure_utc": ["Departure can be at most 7 days from now."]}


def test_a_departure_without_a_time_zone_is_rejected() -> None:
    """RR-18"""
    body = valid_body(departure_utc="2026-11-12T08:00:00")

    assert "departure_utc" in errors_for(body)


@pytest.mark.parametrize("load_lb", [0, 80_000])
def test_loads_from_empty_to_80000_pounds_are_accepted(load_lb: int) -> None:
    """RR-29"""
    assert parse_trip_request(valid_body(load_lb=load_lb), NOW).load_lb == load_lb


@pytest.mark.parametrize("load_lb", [-1, 80_001, "heavy", 1.5, None, True])
def test_loads_outside_0_to_80000_or_not_whole_numbers_are_rejected(load_lb: object) -> None:
    """RR-29"""
    assert "load_lb" in errors_for(valid_body(load_lb=load_lb))


def test_an_origin_equal_to_the_destination_is_rejected() -> None:
    """RR-29"""
    origin = {"lat": CHICAGO.lat, "lon": CHICAGO.lon, "label": "Chicago, IL"}
    body = valid_body(destination={**origin, "label": "Also Chicago"})

    assert errors_for(body) == {"destination": ["Choose a different place than the origin."]}


@pytest.mark.parametrize(
    ("lat", "lon"),
    [
        (51.5, -0.12),
        (19.7, -155.1),
        (35.0, -130.0),
        (35.0, -60.0),
        (float("nan"), -90.0),
        (True, -90.0),
    ],
)
def test_places_outside_the_lower_48_or_not_real_numbers_are_rejected(
    lat: object, lon: float
) -> None:
    """SEC-03"""
    body = valid_body(origin={"lat": lat, "lon": lon, "label": "Elsewhere"})

    assert {"origin.lat", "origin.lon"} & errors_for(body).keys()


def test_unknown_fields_are_rejected_not_ignored() -> None:
    """SEC-03"""
    assert errors_for(valid_body(extra=1)) == {"extra": ["Unknown field."]}


def test_unknown_fields_inside_a_place_are_rejected() -> None:
    """SEC-03"""
    origin = {"lat": CHICAGO.lat, "lon": CHICAGO.lon, "label": "Chicago", "country": "US"}

    assert errors_for(valid_body(origin=origin)) == {"origin.country": ["Unknown field."]}


def test_a_label_longer_than_200_characters_is_rejected() -> None:
    """SEC-03"""
    origin = {"lat": CHICAGO.lat, "lon": CHICAGO.lon, "label": "x" * 201}

    assert "origin.label" in errors_for(valid_body(origin=origin))


def test_a_body_that_is_not_an_object_is_rejected() -> None:
    with pytest.raises(ValidationError):
        parse_trip_request(["not", "an", "object"], NOW)


def test_coordinates_are_passed_on_unchanged() -> None:
    """RR-30"""
    point = GeoPoint(41.123456, -87.654321)
    origin = {"lat": point.lat, "lon": point.lon, "label": "Somewhere"}

    assert parse_trip_request(valid_body(origin=origin), NOW).origin == point
