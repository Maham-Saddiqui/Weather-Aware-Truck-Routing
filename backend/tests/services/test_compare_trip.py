from domain.ranking import RecommendationStatus
from domain.summary import IneligibleReason
from providers.routing.port import RoutePreference, RoutingProviderName, RoutingUnavailable
from providers.weather.port import WeatherUnavailable
from services.compare_trip import plan_compare_trip
from services.results import WeatherStatus
from tests.fakes.bundle import FIRST_WEATHER_HOUR
from tests.fakes.routing import FakeRouting
from tests.fakes.trips import (
    route_bent,
    storm_north_of_the_straight_route,
    tomtom_answering,
    trip_environment,
    trip_request,
)
from tests.fakes.weather import FakeWeather, calm_weather

STRAIGHT, NORTHERN, FAR_NORTHERN = 0.0, 0.6, 1.2


def test_a_storm_over_one_route_ranks_the_other_first_and_recommends_it() -> None:
    """RR-22, RR-24, RR-23"""
    routing = tomtom_answering((route_bent(NORTHERN), route_bent(STRAIGHT)))
    weather = FakeWeather(storm_north_of_the_straight_route)

    result = plan_compare_trip(trip_environment(routing=routing, weather=weather), trip_request())

    straight, stormy = result.routes
    assert straight.rank == 1
    assert stormy.rank is None
    assert stormy.summary.ineligible_reason is IneligibleReason.NO_TRAVEL
    assert result.recommendation.status is RecommendationStatus.RECOMMENDED
    assert result.recommendation.route_id == straight.route_id


def test_routes_come_back_in_display_order_with_ids_from_the_geometry() -> None:
    routing = tomtom_answering((route_bent(STRAIGHT), route_bent(NORTHERN)))

    result = plan_compare_trip(trip_environment(routing=routing), trip_request())

    assert [route.rank for route in result.routes] == [1, 2]
    assert len({route.route_id for route in result.routes}) == 2
    assert result.routing_provider is RoutingProviderName.TOMTOM


def test_one_weather_call_covers_every_route_and_the_heatmap_has_no_repeated_points() -> None:
    """PERF-01, RR-28"""
    routing = tomtom_answering((route_bent(STRAIGHT), route_bent(NORTHERN)))
    weather = FakeWeather.uniform(calm_weather(FIRST_WEATHER_HOUR))

    result = plan_compare_trip(trip_environment(routing=routing, weather=weather), trip_request())

    positions = [point.position for point in result.heatmap.points]
    assert len(weather.calls) == 1
    assert len(positions) == len(set(positions))


def test_the_same_road_returned_twice_is_shown_once() -> None:
    routing = tomtom_answering((route_bent(STRAIGHT), route_bent(STRAIGHT)))

    result = plan_compare_trip(trip_environment(routing=routing), trip_request())

    assert len(result.routes) == 1


def test_eco_routes_fill_in_when_fastest_gives_too_few_distinct_routes() -> None:
    routing = tomtom_answering(
        (route_bent(STRAIGHT),), (route_bent(NORTHERN), route_bent(FAR_NORTHERN))
    )

    result = plan_compare_trip(trip_environment(routing=routing), trip_request())

    assert len(result.routes) == 3


def test_at_most_three_routes_are_shown_and_eco_is_ignored_when_fastest_has_three() -> None:
    fastest = tuple(route_bent(bend) for bend in (STRAIGHT, NORTHERN, FAR_NORTHERN, 1.8))
    eco_only = route_bent(-1.0)
    routing = tomtom_answering(fastest, (eco_only,))

    result = plan_compare_trip(trip_environment(routing=routing), trip_request())

    assert len(result.routes) == 3
    assert eco_only.geometry.encoded not in {
        route.route.geometry.encoded for route in result.routes
    }


def test_a_failing_eco_call_does_not_fail_the_comparison() -> None:
    routing = FakeRouting(
        {
            RoutePreference.FASTEST: (route_bent(STRAIGHT),),
            RoutePreference.ECO: RoutingUnavailable("x"),
        }
    )

    result = plan_compare_trip(trip_environment(routing=routing), trip_request())

    assert len(result.routes) == 1
    assert result.routing_provider is RoutingProviderName.TOMTOM


def test_without_any_weather_no_route_is_recommended_and_all_are_marked_for_missing_data() -> None:
    """RR-23, RR-22"""
    routing = tomtom_answering((route_bent(STRAIGHT), route_bent(NORTHERN)))
    weather = FakeWeather(lambda point: None, failure=WeatherUnavailable("down"))

    result = plan_compare_trip(trip_environment(routing=routing, weather=weather), trip_request())

    assert result.weather_status is WeatherStatus.UNAVAILABLE
    assert result.recommendation.status is RecommendationStatus.NONE_ELIGIBLE
    assert {route.summary.ineligible_reason for route in result.routes} == {
        IneligibleReason.NOT_ENOUGH_WEATHER_DATA
    }
