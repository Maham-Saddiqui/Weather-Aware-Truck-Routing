import logging
from collections.abc import Callable
from dataclasses import replace
from typing import Any

import pytest
from django.test import Client

from config.container import Providers
from domain.types import GeoPoint
from providers.routing.port import NoRouteFound, RoutePreference, RoutingUnavailable
from providers.weather.port import WeatherUnavailable
from tests.fakes.bundle import FIRST_WEATHER_HOUR, FakeCallGuard, default_fakes
from tests.fakes.logs import assert_nothing_sensitive_was_logged, capture_events, events
from tests.fakes.routing import FakeRouting
from tests.fakes.trips import route_bent, tomtom_answering, trip_body, trip_environment
from tests.fakes.weather import FakeWeather, calm_weather

type UseFakes = Callable[[Providers], Providers]

SUMMARY = "trip_finished"
STAGE_FIELDS = ("routing_ms", "weather_ms", "rating_ms", "total_ms")


def post(client: Client, endpoint: str, body: dict[str, Any] | None = None) -> int:
    response = client.post(
        f"/api/v1/trips/{endpoint}",
        body or trip_body(),
        content_type="application/json",
        HTTP_X_FORWARDED_FOR="203.0.113.7",
    )
    return response.status_code


def only_summary(caplog: pytest.LogCaptureFixture) -> dict[str, Any]:
    (summary,) = events(caplog, SUMMARY)
    return summary


def bundle(**changes: Any) -> Providers:
    return replace(default_fakes(), trips=trip_environment(**changes))


def test_a_primary_trip_writes_one_summary_line_with_what_answered(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """BE-12"""
    capture_events(caplog)
    use_fakes(bundle())

    assert post(client, "primary") == 200

    summary = only_summary(caplog)
    assert summary["endpoint"] == "primary"
    assert summary["outcome"] == "ok"
    assert (summary["routing_provider"], summary["backup_used"]) == ("tomtom", False)
    assert (summary["routes"], summary["weather_status"]) == (1, "ok")
    assert summary["checkpoints"] > 0
    assert summary["checkpoints_rated"] == summary["checkpoints"]
    assert (summary["cells_requested"] > 0, summary["cells_missing"]) == (True, 0)
    assert all(isinstance(summary[name], int) and summary[name] >= 0 for name in STAGE_FIELDS)


def test_a_compare_trip_writes_its_own_summary_with_the_route_count(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    capture_events(caplog)
    two_routes = tomtom_answering((route_bent(0.0), route_bent(0.6)))
    use_fakes(bundle(routing=two_routes))

    assert post(client, "compare") == 200

    summary = only_summary(caplog)
    assert (summary["endpoint"], summary["outcome"], summary["routes"]) == ("compare", "ok", 2)


def test_a_spent_daily_guard_is_a_degraded_trip_that_says_the_backup_answered(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """SEC-07"""
    capture_events(caplog)
    use_fakes(bundle(call_guard=FakeCallGuard(allowed=False)))

    assert post(client, "primary") == 200

    summary = only_summary(caplog)
    assert summary["outcome"] == "degraded"
    assert (summary["routing_provider"], summary["backup_used"]) == ("valhalla", True)
    assert summary["backup_reason"] == "daily_guard_spent"


def test_a_tomtom_outage_is_a_degraded_trip_with_its_reason(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    capture_events(caplog)
    down = FakeRouting({RoutePreference.FASTEST: RoutingUnavailable("down")})
    use_fakes(bundle(routing=down))

    assert post(client, "primary") == 200

    summary = only_summary(caplog)
    assert (summary["outcome"], summary["backup_reason"]) == ("degraded", "tomtom_unavailable")


def test_a_weather_outage_is_a_degraded_trip_with_every_cell_missing(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """RR-11"""
    capture_events(caplog)
    down = FakeWeather(lambda point: None, failure=WeatherUnavailable("down"))
    use_fakes(bundle(weather=down))

    post(client, "primary")

    summary = only_summary(caplog)
    assert (summary["outcome"], summary["weather_status"]) == ("degraded", "unavailable")
    assert summary["cells_missing"] == summary["cells_requested"] > 0
    assert summary["checkpoints_rated"] == 0


def test_a_few_missing_weather_cells_make_the_weather_partial(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """RR-11"""
    capture_events(caplog)

    def window_at(point: GeoPoint) -> Any:
        return None if point.lon > -95 else calm_weather(FIRST_WEATHER_HOUR)

    use_fakes(bundle(weather=FakeWeather(window_at)))

    post(client, "primary")

    summary = only_summary(caplog)
    assert (summary["outcome"], summary["weather_status"]) == ("degraded", "partial")
    assert 0 < summary["cells_missing"] < summary["cells_requested"]


def test_a_trip_that_fails_still_writes_its_summary_at_warning_with_the_error_class(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    capture_events(caplog)
    use_fakes(bundle(routing=FakeRouting({RoutePreference.FASTEST: NoRouteFound("none")})))

    assert post(client, "primary") == 422

    summary = only_summary(caplog)
    assert (summary["outcome"], summary["error"]) == ("failed", "NoRouteFound")
    assert summary["level"] == "WARNING"


def test_a_rejected_request_still_writes_a_summary_without_echoing_the_values(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    capture_events(caplog)
    use_fakes(bundle())

    assert post(client, "primary", trip_body(load_lb=999_999)) == 400

    summary = only_summary(caplog)
    assert (summary["outcome"], summary["error"]) == ("failed", "ValidationError")
    assert "999999" not in str(summary)


@pytest.mark.parametrize("endpoint", ["primary", "compare"])
def test_no_log_line_of_a_trip_holds_a_coordinate_a_place_label_or_a_client_address(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture, endpoint: str
) -> None:
    """SEC-11"""
    caplog.set_level(logging.DEBUG)
    use_fakes(bundle(call_guard=FakeCallGuard(allowed=False)))

    post(client, endpoint)

    assert_nothing_sensitive_was_logged(caplog)


def test_the_failure_path_logs_no_sensitive_values_either(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    no_route = FakeRouting({RoutePreference.FASTEST: NoRouteFound("41.8781")})
    use_fakes(bundle(routing=no_route))

    post(client, "primary")

    assert_nothing_sensitive_was_logged(caplog)
