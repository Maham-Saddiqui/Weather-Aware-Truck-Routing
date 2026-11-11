from typing import Any

import pytest
from django.test import Client

from providers.routing.port import RoutePreference, RoutingUnavailable
from tests.fakes.bundle import FakeCallGuard
from tests.fakes.logs import capture_events
from tests.fakes.routing import Outcome, ScriptedRouting
from tests.fakes.trip_summary_log import UseFakes, bundle, only_summary, post
from tests.fakes.trips import route_bent, trip_body

SEATTLE = {"lat": 47.6062, "lon": -122.3321, "label": "Seattle, WA"}
MIAMI = {"lat": 25.7617, "lon": -80.1918, "label": "Miami, FL"}


def test_a_long_compare_trip_logs_its_class_the_wait_it_allowed_and_how_long_tomtom_took(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """BE-12"""
    capture_events(caplog)
    use_fakes(bundle())

    assert post(client, "compare", trip_body(origin=SEATTLE, destination=MIAMI)) == 200

    summary = only_summary(caplog)
    assert (summary["long_trip"], summary["straight_line_miles"]) == (True, 2730)
    assert summary["alternatives_read_timeout_s"] == 22.0
    assert isinstance(summary["alternatives_ms"], int)


def test_a_normal_compare_trip_logs_that_it_is_not_long_and_the_normal_wait(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """BE-12"""
    capture_events(caplog)
    use_fakes(bundle())

    assert post(client, "compare") == 200

    summary = only_summary(caplog)
    assert (summary["long_trip"], summary["straight_line_miles"]) == (False, 920)
    assert summary["alternatives_read_timeout_s"] == 12.0


def test_a_primary_trip_logs_its_class_but_no_alternatives_wait(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """BE-12"""
    capture_events(caplog)
    use_fakes(bundle())

    assert post(client, "primary", trip_body(origin=SEATTLE, destination=MIAMI)) == 200

    summary = only_summary(caplog)
    assert summary["long_trip"] is True
    assert (summary["alternatives_read_timeout_s"], summary["alternatives_ms"]) == (None, None)


def long_trip_summary(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture, routing: ScriptedRouting
) -> dict[str, Any]:
    capture_events(caplog)
    use_fakes(bundle(routing=routing))
    assert post(client, "compare", trip_body(origin=SEATTLE, destination=MIAMI)) == 200
    return only_summary(caplog)


def long_trip_tomtom(two: Outcome, one: Outcome, single: Outcome) -> ScriptedRouting:
    return ScriptedRouting(
        {
            (RoutePreference.FASTEST, 2): two,
            (RoutePreference.ECO, 0): (route_bent(1.2),),
            (RoutePreference.FASTEST, 1): one,
            (RoutePreference.FASTEST, 0): single,
        }
    )


def test_a_long_trip_that_got_two_alternatives_logs_tier_two_and_three_routes(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """BE-12, REQ-03"""
    tomtom = long_trip_tomtom((route_bent(0.0), route_bent(0.6)), (), ())

    summary = long_trip_summary(client, use_fakes, caplog, tomtom)

    assert (summary["alternatives_tier"], summary["routes"]) == ("two", 3)
    assert summary["outcome"] == "ok"


def test_a_long_trip_that_fell_back_to_one_alternative_logs_tier_one(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """BE-12"""
    tomtom = long_trip_tomtom(
        RoutingUnavailable("timed out"), (route_bent(0.0), route_bent(0.6)), ()
    )

    summary = long_trip_summary(client, use_fakes, caplog, tomtom)

    assert (summary["alternatives_tier"], summary["routes"]) == ("one", 2)
    assert (summary["routing_provider"], summary["backup_used"]) == ("tomtom", False)
    assert isinstance(summary["alternatives_ms"], int)


def test_a_long_trip_that_fell_back_to_a_single_route_logs_tier_none_and_is_degraded(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """BE-12"""
    tomtom = long_trip_tomtom(RoutingUnavailable("x"), RoutingUnavailable("y"), (route_bent(0.0),))

    summary = long_trip_summary(client, use_fakes, caplog, tomtom)

    assert (summary["alternatives_tier"], summary["routes"]) == ("none", 1)
    assert (summary["outcome"], summary["alternatives_unavailable"]) == ("degraded", True)


def test_a_trip_answered_by_the_backup_logs_no_alternatives_tier(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """BE-12"""
    capture_events(caplog)
    use_fakes(bundle(call_guard=FakeCallGuard(allowed=False)))

    assert post(client, "compare") == 200

    assert only_summary(caplog)["alternatives_tier"] is None
