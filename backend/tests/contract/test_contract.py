import json
from collections.abc import Callable
from dataclasses import replace
from typing import Any

import pytest
from django.http.response import HttpResponseBase
from django.test import Client
from rest_framework.throttling import AnonRateThrottle

from config.container import Providers
from domain.types import GeoPoint, HourlyWeather
from providers.routing.port import (
    NoRouteFound,
    RoutePreference,
    RoutingProviderName,
    RoutingUnavailable,
)
from providers.weather.port import WeatherBusy
from tests.contract.openapi import assert_conforms
from tests.fakes.bundle import FIRST_WEATHER_HOUR, FakeAttribution, default_fakes, with_trips
from tests.fakes.routing import FakeRouting
from tests.fakes.trips import (
    route_bent,
    storm_north_of_the_straight_route,
    tomtom_answering,
    trip_body,
)
from tests.fakes.weather import FakeWeather, calm_weather

type UseFakes = Callable[[Providers], Providers]


def test_health_matches_the_contract(client: Client, use_fakes: UseFakes) -> None:
    assert_conforms(client.get("/api/v1/health"), "/health", "get")


def test_attribution_matches_the_contract(client: Client, use_fakes: UseFakes) -> None:
    assert_conforms(client.get("/api/v1/attribution"), "/attribution", "get")


def test_a_failed_attribution_matches_the_contracts_503_problem(
    client: Client, use_fakes: UseFakes
) -> None:
    failing = FakeAttribution(failure=RoutingUnavailable("synthetic"))
    use_fakes(replace(default_fakes(), attribution=failing))

    assert_conforms(client.get("/api/v1/attribution"), "/attribution", "get")


def test_timezone_matches_the_contract(client: Client, use_fakes: UseFakes) -> None:
    response = client.get("/api/v1/timezone", {"lat": "41.88", "lon": "-87.63"})

    assert_conforms(response, "/timezone", "get")


def test_a_timezone_validation_error_matches_the_contracts_400_problem(
    client: Client, use_fakes: UseFakes
) -> None:
    assert_conforms(client.get("/api/v1/timezone", {"lat": "200"}), "/timezone", "get")


def test_a_throttled_response_matches_the_contracts_429_problem_with_retry_after(
    client: Client, use_fakes: UseFakes, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setitem(AnonRateThrottle.THROTTLE_RATES, "attribution", "1/min")
    client.get("/api/v1/attribution")

    assert_conforms(client.get("/api/v1/attribution"), "/attribution", "get")


def post_trip(client: Client, path: str, body: dict[str, Any]) -> HttpResponseBase:
    return client.post(f"/api/v1{path}", body, content_type="application/json")


def json_of(response: HttpResponseBase) -> dict[str, Any]:
    body: dict[str, Any] = json.loads(b"".join(response))
    return body


def three_routes_with(weather_at: Callable[[GeoPoint], HourlyWeather]) -> Providers:
    routing = tomtom_answering((route_bent(0.6), route_bent(0.0)), (route_bent(1.2),))
    return with_trips(default_fakes(), routing=routing, weather=FakeWeather(weather_at))


def calm(point: GeoPoint) -> HourlyWeather:
    return calm_weather(FIRST_WEATHER_HOUR)


@pytest.mark.parametrize("weather_at", [storm_north_of_the_straight_route, calm])
def test_a_compare_response_matches_the_contract(
    client: Client, use_fakes: UseFakes, weather_at: Callable[[GeoPoint], HourlyWeather]
) -> None:
    use_fakes(three_routes_with(weather_at))

    response = post_trip(client, "/trips/compare", trip_body())

    assert_conforms(response, "/trips/compare", "post")
    assert len(json_of(response)["routes"]) == 3


def test_a_primary_response_matches_the_contract(client: Client, use_fakes: UseFakes) -> None:
    use_fakes(three_routes_with(calm))

    assert_conforms(post_trip(client, "/trips/primary", trip_body()), "/trips/primary", "post")


def test_a_response_with_missing_and_unavailable_weather_matches_the_contract(
    client: Client, use_fakes: UseFakes
) -> None:
    down = FakeWeather(calm, failure=WeatherBusy("busy"))
    use_fakes(with_trips(three_routes_with(calm), weather=down))

    response = post_trip(client, "/trips/compare", trip_body())

    assert_conforms(response, "/trips/compare", "post")
    assert json_of(response)["weather"] == {"status": "busy"}


@pytest.mark.parametrize("path", ["/trips/primary", "/trips/compare"])
def test_an_invalid_trip_request_matches_the_contracts_400_problem(
    client: Client, use_fakes: UseFakes, path: str
) -> None:
    response = post_trip(client, path, trip_body(load_lb=90_000))

    assert_conforms(response, path, "post")
    assert set(json_of(response)["field_errors"]) == {"load_lb"}


@pytest.mark.parametrize("path", ["/trips/primary", "/trips/compare"])
def test_a_no_route_answer_matches_the_contracts_422_problem(
    client: Client, use_fakes: UseFakes, path: str
) -> None:
    routing = FakeRouting(
        {RoutePreference.FASTEST: NoRouteFound("none"), RoutePreference.ECO: NoRouteFound("none")}
    )
    use_fakes(with_trips(default_fakes(), routing=routing))

    assert_conforms(post_trip(client, path, trip_body()), path, "post")


@pytest.mark.parametrize("path", ["/trips/primary", "/trips/compare"])
def test_every_routing_provider_failing_matches_the_contracts_503_problem(
    client: Client, use_fakes: UseFakes, path: str
) -> None:
    down = {
        RoutePreference.FASTEST: RoutingUnavailable("down"),
        RoutePreference.ECO: RoutingUnavailable("down"),
    }
    use_fakes(
        with_trips(
            default_fakes(),
            routing=FakeRouting(down),
            backup_routing=FakeRouting(down, RoutingProviderName.VALHALLA),
        )
    )

    assert_conforms(post_trip(client, path, trip_body()), path, "post")


def test_a_body_that_is_not_json_matches_the_contracts_400_problem(
    client: Client, use_fakes: UseFakes
) -> None:
    response = client.post("/api/v1/trips/primary", "{not json", content_type="application/json")

    assert_conforms(response, "/trips/primary", "post")
