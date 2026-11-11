"""Shapes service results exactly as docs/api/openapi.yaml. Numbers are the server's strings."""

from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from domain.constants import HEATMAP_HOURS
from domain.heatmap import worst_digit_by_hour
from domain.levels import Level
from domain.ranking import Recommendation
from domain.rating import Measurements
from domain.summary import MetresByLevel, RouteSummary
from domain.types import GeoPoint
from domain.units import miles_from_metres, travel_time_text
from services.results import (
    CompareTripResult,
    Heatmap,
    PrimaryTripResult,
    RatedRoute,
    RouteCheckpoint,
)

NO_DATA = "no_data"

type Json = dict[str, Any]


def present_primary(result: PrimaryTripResult) -> Json:
    return {
        "route": _route(result.route),
        "heatmap": _heatmap(result.heatmap),
        "routing_provider": result.routing_provider.value,
        "weather": {"status": result.weather_status.value},
    }


def present_compare(result: CompareTripResult) -> Json:
    return {
        "routes": [_route(route) for route in result.routes],
        "recommendation": _recommendation(result.recommendation),
        "heatmap": _heatmap(result.heatmap),
        "routing_provider": result.routing_provider.value,
        "weather": {"status": result.weather_status.value},
    }


def _route(route: RatedRoute) -> Json:
    geometry = route.route.geometry
    return {
        "id": route.route_id,
        "rank": route.rank,
        "geometry": {
            "encoding": "encoded_polyline",
            "precision": geometry.precision,
            "data": geometry.encoded,
        },
        "summary": _summary(route.summary),
        "checkpoints": [_checkpoint(checkpoint) for checkpoint in route.checkpoints],
    }


def _summary(summary: RouteSummary) -> Json:
    return {
        "distance_miles": _miles(summary.distance_m),
        "travel_time_s": summary.travel_time_s,
        "travel_time_text": travel_time_text(summary.travel_time_s),
        "arrival_utc": _instant(summary.arrival_utc),
        "miles_by_level": _miles_by_level(summary.metres_by_level),
        "average_risk": _text_or_none(summary.average_risk),
        "worst_level": _level_name(summary.worst_level),
        "eligible": summary.is_eligible,
        "ineligible_reason": _value_or_none(summary.ineligible_reason),
    }


def _miles_by_level(metres: MetresByLevel) -> Json:
    by_level = {level.name.lower(): _miles(metres.of(level)) for level in Level}
    return {**by_level, NO_DATA: _miles(metres.no_data)}


def _checkpoint(route_checkpoint: RouteCheckpoint) -> Json:
    checkpoint, rating = route_checkpoint.checkpoint, route_checkpoint.rating
    return {
        "index": checkpoint.index,
        "distance_miles": _miles(checkpoint.distance_m),
        "covered_miles": _miles(checkpoint.covered_m),
        "position": _position(checkpoint.position),
        "eta_utc": _instant(checkpoint.eta_utc),
        "time_zone": route_checkpoint.time_zone,
        "measurements": _measurements(route_checkpoint.measurements),
        "level": _level_name(rating.level) or NO_DATA,
        "driving_factors": [factor.value for factor in rating.driving_factors],
        "load_rule": rating.load_rule.value,
    }


def _measurements(measurements: Measurements) -> Json:
    return {
        "wind_mph": _text_or_none(measurements.wind_mph),
        "rain_in_hr": _text_or_none(measurements.rain_in),
        "snow_in_hr": _text_or_none(measurements.snow_in),
        "gust_mph": _text_or_none(measurements.gust_mph),
    }


def _heatmap(heatmap: Heatmap) -> Json:
    return {
        "start_utc": _instant(heatmap.start_utc),
        "hours": HEATMAP_HOURS,
        "worst_level_by_hour": worst_digit_by_hour(point.risk for point in heatmap.points),
        "points": [
            {"position": _position(point.position), "risk": point.risk} for point in heatmap.points
        ],
    }


def _recommendation(recommendation: Recommendation) -> Json:
    return {
        "status": recommendation.status.value,
        "route_id": recommendation.route_id,
        "least_bad_route_id": recommendation.least_bad_route_id,
        "deciding_criterion": _value_or_none(recommendation.deciding_criterion),
        "sentence": recommendation.sentence,
    }


def _position(point: GeoPoint) -> Json:
    return {"lat": point.lat, "lon": point.lon}


def _miles(distance_m: Decimal) -> str:
    return str(miles_from_metres(distance_m))


def _instant(moment: datetime) -> str:
    return moment.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _text_or_none(value: Decimal | None) -> str | None:
    return None if value is None else str(value)


def _level_name(level: Level | None) -> str | None:
    return None if level is None else level.name.lower()


def _value_or_none(value: StrEnum | None) -> str | None:
    return None if value is None else str(value.value)
