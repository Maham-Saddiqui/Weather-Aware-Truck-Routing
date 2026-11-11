import pytest

from domain.levels import Level
from providers.routing.port import (
    RoutePreference,
    RoutingProviderName,
)
from providers.weather.port import WeatherBusy, WeatherError, WeatherUnavailable
from services.primary_trip import plan_primary_trip
from services.results import WeatherStatus
from tests.fakes.bundle import FIRST_WEATHER_HOUR
from tests.fakes.routing import FakeRouting
from tests.fakes.trips import route_bent, trip_environment, trip_request
from tests.fakes.weather import FakeWeather, calm_weather

HEATMAP_HOURS = 49


environment = trip_environment


def test_calm_weather_gives_a_rated_route_with_every_checkpoint_low() -> None:
    """RR-12, RR-13: checkpoints at the origin, every 25 miles and the destination"""
    result = plan_primary_trip(environment(), trip_request())

    assert [c.checkpoint.index for c in result.route.checkpoints] == [0, 1, 2, 3, 4]
    assert {c.rating.level for c in result.route.checkpoints} == {Level.LOW}
    assert result.weather_status is WeatherStatus.OK
    assert result.routing_provider is RoutingProviderName.TOMTOM
    assert result.route.rank is None


def test_the_first_checkpoint_arrives_at_the_departure_time() -> None:
    """RR-15"""
    request = trip_request()

    result = plan_primary_trip(environment(), request)

    assert result.route.checkpoints[0].checkpoint.eta_utc == request.departure_utc


def test_one_vehicle_weight_and_one_call_without_alternatives_are_sent_to_the_provider() -> None:
    routing = FakeRouting({RoutePreference.FASTEST: (route_bent(0.0),)})

    plan_primary_trip(environment(routing=routing), trip_request(load_lb=30_000))

    (query,) = routing.calls
    assert query.preference is RoutePreference.FASTEST
    assert query.max_alternatives == 0
    assert query.vehicle_weight_kg == 29_484


def test_weather_for_all_checkpoints_and_heatmap_points_is_one_batched_call() -> None:
    """PERF-01"""
    weather = FakeWeather.uniform(calm_weather(FIRST_WEATHER_HOUR))

    plan_primary_trip(environment(weather=weather), trip_request())

    assert len(weather.calls) == 1


def test_the_heatmap_has_one_point_per_grid_cell_with_49_hourly_digits() -> None:
    """RR-28"""
    result = plan_primary_trip(environment(), trip_request())

    positions = [point.position for point in result.heatmap.points]
    assert len(positions) == len(set(positions)) == 5
    assert {point.risk for point in result.heatmap.points} == {"0" * HEATMAP_HOURS}
    assert result.heatmap.start_utc == trip_request().departure_utc


def test_a_checkpoint_without_weather_is_no_data_and_the_status_is_partial() -> None:
    """RR-11"""
    calm = calm_weather(FIRST_WEATHER_HOUR)
    weather = FakeWeather(lambda point: None if point.lon > -91 else calm)

    result = plan_primary_trip(environment(weather=weather), trip_request())

    levels = [c.rating.level for c in result.route.checkpoints]
    assert levels[-1] is None
    assert levels[0] is Level.LOW
    assert result.weather_status is WeatherStatus.PARTIAL


@pytest.mark.parametrize(
    ("failure", "status"),
    [
        (WeatherBusy("busy"), WeatherStatus.BUSY),
        (WeatherUnavailable("down"), WeatherStatus.UNAVAILABLE),
    ],
)
def test_a_weather_failure_still_returns_the_route_without_ratings(
    failure: WeatherError, status: WeatherStatus
) -> None:
    """RR-23, RR-11"""
    weather = FakeWeather(lambda point: None, failure=failure)

    result = plan_primary_trip(environment(weather=weather), trip_request())

    assert result.weather_status is status
    assert {c.rating.level for c in result.route.checkpoints} == {None}
    assert {point.risk for point in result.heatmap.points} == {"x" * HEATMAP_HOURS}
