from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal

from domain.constants import (
    PRECIPITATION_DECIMALS,
    WIND_DECIMALS,
    WIND_LOAD_LIMIT_FOR_NO_TRAVEL_LB,
    WIND_LOAD_LIMIT_FOR_SEVERE_LB,
)
from domain.levels import DrivingFactor, Level, LoadRule, worst_of
from domain.types import HourlyWeather
from domain.units import round_half_up

ONE_HOUR = timedelta(hours=1)
HALF_HOUR = timedelta(minutes=30)

# Each band starts at its lower edge and includes it; the first edge reached wins (RR-03 to RR-05).
WIND_BANDS = (
    (Decimal(55), Level.NO_TRAVEL),
    (Decimal(45), Level.SEVERE),
    (Decimal(35), Level.HIGH),
    (Decimal(25), Level.MODERATE),
)
RAIN_BANDS = (
    (Decimal("0.50"), Level.SEVERE),
    (Decimal("0.25"), Level.HIGH),
    (Decimal("0.10"), Level.MODERATE),
)
SNOW_BANDS = (
    (Decimal("2.0"), Level.SEVERE),
    (Decimal("1.0"), Level.HIGH),
    (Decimal("0.5"), Level.MODERATE),
)
RAIN_NO_TRAVEL_ABOVE = Decimal("1.00")
SNOW_NO_TRAVEL_ABOVE = Decimal("3.0")

CHECKPOINT_FACTOR_COUNT = 3


@dataclass(frozen=True, slots=True)
class Measurements:
    """Readings already rounded for display (RR-02); None marks a missing reading (RR-11)."""

    wind_mph: Decimal | None
    rain_in: Decimal | None
    snow_in: Decimal | None
    gust_mph: Decimal | None


@dataclass(frozen=True, slots=True)
class CheckpointRating:
    """level is None for "no data" (RR-11), which is never a level and never Low (RR-01)."""

    level: Level | None
    driving_factors: tuple[DrivingFactor, ...]
    load_rule: LoadRule


@dataclass(frozen=True, slots=True)
class FactorRating:
    factor: DrivingFactor
    level: Level
    load_rule: LoadRule


@dataclass(frozen=True, slots=True)
class LoadRaise:
    applies_to: Level
    load_above_lb: int
    raised_to: Level
    rule: LoadRule


NO_DATA = CheckpointRating(level=None, driving_factors=(), load_rule=LoadRule.NONE)

NO_TRAVEL_RULE = LoadRule.RAISED_TO_NO_TRAVEL
LOAD_RAISES = (
    LoadRaise(Level.SEVERE, WIND_LOAD_LIMIT_FOR_NO_TRAVEL_LB, Level.NO_TRAVEL, NO_TRAVEL_RULE),
    LoadRaise(Level.HIGH, WIND_LOAD_LIMIT_FOR_SEVERE_LB, Level.SEVERE, LoadRule.RAISED_TO_SEVERE),
)


@dataclass(frozen=True, slots=True)
class _ReadingHours:
    """RR-17: the forecast hours (positions in the series) that an arrival reads."""

    wind: int
    precipitation: int


def _reading_hours(weather: HourlyWeather, arrival_utc: datetime) -> _ReadingHours:
    since_first_hour = arrival_utc - weather.first_hour_utc
    return _ReadingHours(
        wind=(since_first_hour + HALF_HOUR) // ONE_HOUR,
        precipitation=since_first_hour // ONE_HOUR + 1,
    )


def measurements_at(weather: HourlyWeather | None, arrival_utc: datetime) -> Measurements:
    """RR-17 picks the forecast hours, RR-02 rounds half up once; missing data gives None."""
    if weather is None:
        return Measurements(None, None, None, None)
    hours = _reading_hours(weather, arrival_utc)
    return Measurements(
        wind_mph=_rounded(_reading(weather.wind_mph, hours.wind), WIND_DECIMALS),
        rain_in=_rounded(_reading(weather.rain_in, hours.precipitation), PRECIPITATION_DECIMALS),
        snow_in=_rounded(_reading(weather.snow_in, hours.precipitation), PRECIPITATION_DECIMALS),
        gust_mph=_rounded(_reading(weather.gust_mph, hours.wind), WIND_DECIMALS),
    )


def is_low_for_hours(
    weather: HourlyWeather | None, first_arrival_utc: datetime, hours: int
) -> bool:
    """True only when `hours` arrivals an hour apart are all certain to rate Low (RR-03 to RR-05).

    Every reading they use must exist and, once rounded, lie below its lowest band edge. Loads
    only raise High and Severe, so they play no part. A fast path for the heatmap (RR-28): any
    doubt answers False and the arrivals are rated one by one.
    """
    if weather is None:
        return False
    start = _reading_hours(weather, first_arrival_utc)
    wind = _readings_for(weather.wind_mph, start.wind, hours)
    rain = _readings_for(weather.rain_in, start.precipitation, hours)
    snow = _readings_for(weather.snow_in, start.precipitation, hours)
    return (
        _below_lowest_edge(wind, WIND_DECIMALS, WIND_BANDS)
        and _below_lowest_edge(rain, PRECIPITATION_DECIMALS, RAIN_BANDS)
        and _below_lowest_edge(snow, PRECIPITATION_DECIMALS, SNOW_BANDS)
    )


def _readings_for(
    series: Sequence[Decimal | None], first_hour: int, hours: int
) -> list[Decimal] | None:
    """The readings of consecutive hours, or None when any is missing or outside the forecast."""
    if first_hour < 0 or first_hour + hours > len(series):
        return None
    present = [
        reading for reading in series[first_hour : first_hour + hours] if reading is not None
    ]
    return present if len(present) == hours else None


def _below_lowest_edge(
    readings: list[Decimal] | None, decimals: Decimal, bands: tuple[tuple[Decimal, Level], ...]
) -> bool:
    """Rounding never reorders values, so the rounded maximum decides for every reading."""
    return readings is not None and round_half_up(max(readings), decimals) < bands[-1][0]


def rate_checkpoint(measurements: Measurements, load_lb: int) -> CheckpointRating:
    """RR-09 worst of the three ratings, RR-10 driving factors, RR-11 missing readings."""
    ratings = _present_ratings(measurements, load_lb)
    worst = worst_of(rating.level for rating in ratings)
    if worst is None:
        return NO_DATA
    has_missing_reading = len(ratings) < CHECKPOINT_FACTOR_COUNT
    if has_missing_reading and worst is not Level.NO_TRAVEL:
        return NO_DATA
    if worst is Level.LOW:
        return CheckpointRating(Level.LOW, (), LoadRule.NONE)
    drivers = tuple(rating for rating in ratings if rating.level is worst)
    return CheckpointRating(worst, _factors_of(drivers), _load_rule_of(drivers))


def _rounded(value: Decimal | None, decimals: Decimal) -> Decimal | None:
    return None if value is None else round_half_up(value, decimals)


def _reading(series: Sequence[Decimal | None], hour: int) -> Decimal | None:
    return series[hour] if 0 <= hour < len(series) else None


def _present_ratings(measurements: Measurements, load_lb: int) -> tuple[FactorRating, ...]:
    ratings = (
        _rate_wind(measurements.wind_mph, load_lb),
        _rate_precipitation(
            DrivingFactor.RAIN, measurements.rain_in, RAIN_BANDS, RAIN_NO_TRAVEL_ABOVE
        ),
        _rate_precipitation(
            DrivingFactor.SNOW, measurements.snow_in, SNOW_BANDS, SNOW_NO_TRAVEL_ABOVE
        ),
    )
    return tuple(rating for rating in ratings if rating is not None)


def _rate_wind(wind_mph: Decimal | None, load_lb: int) -> FactorRating | None:
    """RR-03 bands, then the load rules RR-06 to RR-08 (55 mph is No Travel for any load)."""
    if wind_mph is None:
        return None
    level = _level_from_bands(wind_mph, WIND_BANDS)
    for raise_rule in LOAD_RAISES:
        if level is raise_rule.applies_to and load_lb > raise_rule.load_above_lb:
            return FactorRating(DrivingFactor.WIND, raise_rule.raised_to, raise_rule.rule)
    return FactorRating(DrivingFactor.WIND, level, LoadRule.NONE)


def _rate_precipitation(
    factor: DrivingFactor,
    amount_in: Decimal | None,
    bands: tuple[tuple[Decimal, Level], ...],
    no_travel_above: Decimal,
) -> FactorRating | None:
    """RR-04 and RR-05: only No Travel starts strictly above its edge."""
    if amount_in is None:
        return None
    if amount_in > no_travel_above:
        return FactorRating(factor, Level.NO_TRAVEL, LoadRule.NONE)
    return FactorRating(factor, _level_from_bands(amount_in, bands), LoadRule.NONE)


def _level_from_bands(value: Decimal, bands: tuple[tuple[Decimal, Level], ...]) -> Level:
    return next((level for edge, level in bands if value >= edge), Level.LOW)


def _factors_of(drivers: tuple[FactorRating, ...]) -> tuple[DrivingFactor, ...]:
    return tuple(driver.factor for driver in drivers)


def _load_rule_of(drivers: tuple[FactorRating, ...]) -> LoadRule:
    return next((d.load_rule for d in drivers if d.factor is DrivingFactor.WIND), LoadRule.NONE)
