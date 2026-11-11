from datetime import datetime, timedelta
from math import floor

from domain.constants import HEATMAP_HOURS, WEATHER_CELLS_PER_DEGREE
from domain.levels import Level
from domain.rating import is_low_for_hours, measurements_at, rate_checkpoint
from domain.types import GeoPoint, HourlyWeather

NO_DATA_DIGIT = "x"


def risk_digits(weather: HourlyWeather | None, departure_utc: datetime, load_lb: int) -> str:
    """RR-28: one character per hour after departure, 0 to 4 for Low to No Travel, x for no data."""
    if is_low_for_hours(weather, departure_utc, HEATMAP_HOURS):
        return str(Level.LOW.value) * HEATMAP_HOURS
    hours = range(HEATMAP_HOURS)
    return "".join(
        _digit_at(weather, departure_utc + timedelta(hours=hour), load_lb) for hour in hours
    )


def cell_of(point: GeoPoint) -> GeoPoint:
    """Snaps a point to the weather grid so nearby points share one forecast."""
    return GeoPoint(_snapped(point.lat), _snapped(point.lon))


def _digit_at(weather: HourlyWeather | None, moment_utc: datetime, load_lb: int) -> str:
    rating = rate_checkpoint(measurements_at(weather, moment_utc), load_lb)
    return NO_DATA_DIGIT if rating.level is None else str(rating.level.value)


def _snapped(degrees: float) -> float:
    return floor(degrees * WEATHER_CELLS_PER_DEGREE + 0.5) / WEATHER_CELLS_PER_DEGREE
