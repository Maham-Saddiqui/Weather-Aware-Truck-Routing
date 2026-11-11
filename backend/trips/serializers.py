import math
from collections.abc import Mapping
from datetime import datetime
from typing import Any

from rest_framework import serializers

from domain.types import CheckpointSpacing, GeoPoint
from services.trip_request import TripRequest
from trips import limits

OUTSIDE_LOWER_48 = "Choose a place inside the lower 48 states."
NOT_A_NUMBER = "Enter a number."
UNKNOWN_FIELD = "Unknown field."


class FiniteFloatField(serializers.FloatField):
    """Coordinates must be real numbers: not NaN, not infinite, not true or false."""

    def to_internal_value(self, data: object) -> float:
        if isinstance(data, bool) or not isinstance(data, float | int | str):
            self.fail("invalid")
        value = super().to_internal_value(data)
        if not math.isfinite(value):
            self.fail("invalid")
        return value


class StrictSerializer(serializers.Serializer[Any]):
    """Unknown fields are rejected, never ignored (SEC-03)."""

    def to_internal_value(self, data: object) -> dict[str, Any]:
        if isinstance(data, Mapping):
            unknown = sorted(set(data) - set(self.fields))
            if unknown:
                raise serializers.ValidationError({name: [UNKNOWN_FIELD] for name in unknown})
        internal: dict[str, Any] = super().to_internal_value(data)
        return internal


class AwareDateTimeField(serializers.DateTimeField):
    def enforce_timezone(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            self.fail("invalid")
        return value


class PlaceSerializer(StrictSerializer):
    """Declared in get_fields because `label` is also the name of a serializer attribute."""

    def get_fields(self) -> dict[str, serializers.Field[Any, Any, Any, Any]]:
        return {
            "lat": _coordinate(limits.LOWER_48_MIN_LAT, limits.LOWER_48_MAX_LAT),
            "lon": _coordinate(limits.LOWER_48_MIN_LON, limits.LOWER_48_MAX_LON),
            "label": serializers.CharField(max_length=limits.MAX_LABEL_LENGTH),
        }


class TripRequestSerializer(StrictSerializer):
    """Validates a trip request against RR-29. The clock arrives in the context as `now`."""

    origin = PlaceSerializer()
    destination = PlaceSerializer()
    departure_utc = AwareDateTimeField(
        error_messages={
            "invalid": "Enter a date and time with a time zone, like 2026-11-12T08:00:00Z."
        }
    )
    load_lb = serializers.IntegerField(min_value=0, max_value=limits.MAX_LOAD_LB)
    spacing_miles = serializers.ChoiceField(
        choices=limits.SPACING_CHOICES_MILES, default=limits.DEFAULT_SPACING_MILES
    )

    def validate_departure_utc(self, value: datetime) -> datetime:
        now: datetime = self.context["now"]
        current_hour = now.replace(minute=0, second=0, microsecond=0)
        if value < current_hour:
            raise serializers.ValidationError("Departure cannot be in the past.")
        if value > now + limits.MAX_DEPARTURE_AHEAD:
            raise serializers.ValidationError("Departure can be at most 7 days from now.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if _point(attrs["origin"]) == _point(attrs["destination"]):
            raise serializers.ValidationError(
                {"destination": ["Choose a different place than the origin."]}
            )
        return attrs


def _coordinate(minimum: float, maximum: float) -> FiniteFloatField:
    return FiniteFloatField(
        min_value=minimum,
        max_value=maximum,
        error_messages={"min_value": OUTSIDE_LOWER_48, "max_value": OUTSIDE_LOWER_48},
    )


class TimeZoneQuerySerializer(serializers.Serializer[Any]):
    lat = FiniteFloatField(min_value=-90, max_value=90)
    lon = FiniteFloatField(min_value=-180, max_value=180)


def parse_trip_request(data: object, now: datetime) -> TripRequest:
    serializer = TripRequestSerializer(data=data, context={"now": now})
    serializer.is_valid(raise_exception=True)
    valid = serializer.validated_data
    return TripRequest(
        origin=_point(valid["origin"]),
        destination=_point(valid["destination"]),
        departure_utc=valid["departure_utc"],
        load_lb=valid["load_lb"],
        spacing_miles=CheckpointSpacing(valid["spacing_miles"]),
    )


def _point(place: Mapping[str, Any]) -> GeoPoint:
    return GeoPoint(place["lat"], place["lon"])
