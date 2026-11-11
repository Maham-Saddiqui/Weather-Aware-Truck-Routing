import json
import logging
import threading
from collections.abc import Callable
from dataclasses import replace

import pytest
from django.test import Client
from rest_framework.throttling import AnonRateThrottle

from config.container import Providers
from domain.types import ProviderRoute
from providers.routing.port import RoutePreference, RouteQuery, RoutingProviderName
from services.trip_runner import TripRunner
from tests.fakes.bundle import FakeCallGuard, default_fakes, with_trips
from tests.fakes.logs import assert_nothing_sensitive_was_logged, capture_events, events
from tests.fakes.routing import FakeRouting
from tests.fakes.trips import route_bent, tomtom_answering, trip_body, trip_environment
from trips.limits import MAX_BODY_BYTES

type UseFakes = Callable[[Providers], Providers]

PRIMARY = "/api/v1/trips/primary"
COMPARE = "/api/v1/trips/compare"
ATTRIBUTION = "/api/v1/attribution"
JSON = "application/json"
CLIENT_HEADERS = {"X-Forwarded-For": "203.0.113.7"}
SHORT_WAIT_S = 0.05
LONG_WAIT_S = 5


def post(client: Client, path: str, body: object | None = None) -> int:
    payload = trip_body() if body is None else body
    return client.post(path, payload, content_type=JSON, headers=CLIENT_HEADERS).status_code


def single(caplog: pytest.LogCaptureFixture, name: str) -> dict[str, object]:
    (event,) = events(caplog, name)
    return event


@pytest.fixture
def one_route_fakes(use_fakes: UseFakes) -> None:
    use_fakes(with_trips(default_fakes(), routing=tomtom_answering((route_bent(0.0),))))


@pytest.fixture
def one_request_a_minute(monkeypatch: pytest.MonkeyPatch) -> None:
    for scope in ("trips", "attribution", "anon"):
        monkeypatch.setitem(AnonRateThrottle.THROTTLE_RATES, scope, "1/min")


@pytest.mark.usefixtures("one_route_fakes", "one_request_a_minute")
@pytest.mark.parametrize(
    ("path", "scope"), [(PRIMARY, "trips"), (COMPARE, "trips"), (ATTRIBUTION, "attribution")]
)
def test_a_throttled_request_logs_the_scope_name_and_never_the_address(
    client: Client, caplog: pytest.LogCaptureFixture, path: str, scope: str
) -> None:
    """SEC-05, SEC-11"""
    capture_events(caplog)

    for _ in range(2):
        if path == ATTRIBUTION:
            status = client.get(path, headers=CLIENT_HEADERS).status_code
        else:
            status = post(client, path)

    assert status == 429
    throttled = single(caplog, "throttled")
    assert (throttled["scope"], throttled["level"]) == (scope, "WARNING")
    assert_nothing_sensitive_was_logged(caplog)


@pytest.mark.usefixtures("one_request_a_minute")
def test_a_cheap_endpoint_that_is_throttled_logs_the_default_scope(
    client: Client, caplog: pytest.LogCaptureFixture
) -> None:
    capture_events(caplog)

    for _ in range(2):
        client.get("/api/v1/timezone", {"lat": "39.7", "lon": "-104.9"}, headers=CLIENT_HEADERS)

    assert single(caplog, "throttled")["scope"] == "anon"


def test_a_validation_failure_logs_the_names_of_the_invalid_fields_never_their_values(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """SEC-03, SEC-11"""
    capture_events(caplog)

    assert post(client, PRIMARY, trip_body(load_lb=999_999)) == 400

    failure = single(caplog, "validation_failed")
    assert (failure["invalid_fields"], failure["unknown_fields"]) == (["load_lb"], 0)
    assert_nothing_sensitive_was_logged(caplog, "999999")


def test_an_unknown_field_is_only_counted_because_its_name_is_whatever_the_client_typed(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """SEC-03, SEC-11"""
    capture_events(caplog)

    assert post(client, PRIMARY, trip_body(**{"typed-by-client-41.123456": 1})) == 400

    failure = single(caplog, "validation_failed")
    assert (failure["invalid_fields"], failure["unknown_fields"]) == ([], 1)
    assert_nothing_sensitive_was_logged(caplog, "typed-by-client")


def test_a_body_that_is_not_json_logs_that_the_request_could_not_be_used(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    capture_events(caplog)

    assert post(client, PRIMARY, "{not json") == 400

    assert single(caplog, "request_not_usable")["status"] == 400


def test_a_body_over_the_limit_logs_the_limit_and_nothing_from_the_body(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """SEC-03"""
    capture_events(caplog)
    body = json.dumps({"label": "Chicago, IL " * MAX_BODY_BYTES})

    assert post(client, PRIMARY, body) == 413

    too_large = single(caplog, "request_body_too_large")
    assert (too_large["limit_bytes"], too_large["level"]) == (MAX_BODY_BYTES, "WARNING")
    assert_nothing_sensitive_was_logged(caplog)


def keep_the_only_slot_busy(runner: TripRunner) -> Callable[[], None]:
    started, release = threading.Event(), threading.Event()

    def hold() -> None:
        started.set()
        release.wait(LONG_WAIT_S)

    threading.Thread(target=runner.run, args=(hold,), daemon=True).start()
    assert started.wait(LONG_WAIT_S)
    return release.set


def test_a_trip_turned_away_for_capacity_logs_how_long_it_waited(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """PERF-05"""
    capture_events(caplog)
    runner = TripRunner(limit=1, queue_wait_s=SHORT_WAIT_S)
    use_fakes(replace(default_fakes(), trip_runner=runner))
    free_the_slot = keep_the_only_slot_busy(runner)

    assert post(client, PRIMARY) == 429
    free_the_slot()

    rejected = single(caplog, "trip_cap_rejected")
    assert rejected["limit"] == 1
    assert isinstance(rejected["waited_ms"], int)
    assert rejected["waited_ms"] >= SHORT_WAIT_S * 1000 * 0.5
    assert single(caplog, "trip_finished")["error"] == "TripsBusy"


class SlowRouting:
    name = RoutingProviderName.TOMTOM

    def __init__(self, release: threading.Event) -> None:
        self.release = release

    def routes(self, query: RouteQuery) -> tuple[ProviderRoute, ...]:
        self.release.wait(LONG_WAIT_S)
        return (route_bent(0.0),)


def test_a_trip_past_its_deadline_logs_the_stage_that_was_running(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """PERF-05"""
    capture_events(caplog)
    release = threading.Event()
    runner = TripRunner(limit=1, queue_wait_s=SHORT_WAIT_S, deadline_s=0.3)
    use_fakes(
        replace(with_trips(default_fakes(), routing=SlowRouting(release)), trip_runner=runner)
    )

    assert post(client, PRIMARY) == 503
    release.set()

    exceeded = single(caplog, "trip_deadline_exceeded")
    assert (exceeded["stage"], exceeded["deadline_s"]) == ("routing", 0.3)
    assert single(caplog, "trip_finished")["error"] == "TripTookTooLong"


def test_a_spent_daily_guard_logs_that_the_backup_answered_instead(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """SEC-07"""
    capture_events(caplog)
    use_fakes(
        replace(default_fakes(), trips=trip_environment(call_guard=FakeCallGuard(allowed=False)))
    )

    assert post(client, PRIMARY) == 200

    spent = single(caplog, "tomtom_daily_guard_spent")
    assert (spent["fell_back_to"], spent["level"]) == ("backup_routing", "WARNING")


class AllowsOneCall:
    def __init__(self) -> None:
        self.allowed = [True, False]

    def try_acquire(self) -> bool:
        return self.allowed.pop(0) if self.allowed else False


def test_a_guard_spent_before_the_eco_call_logs_that_fastest_routes_alone_answered(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """SEC-07"""
    capture_events(caplog)
    fastest_only = FakeRouting({RoutePreference.FASTEST: (route_bent(0.0),)})
    use_fakes(
        replace(
            default_fakes(),
            trips=trip_environment(routing=fastest_only, call_guard=AllowsOneCall()),
        )
    )

    assert post(client, COMPARE) == 200

    assert single(caplog, "tomtom_daily_guard_spent")["fell_back_to"] == "fastest_routes_only"


def test_a_spent_guard_on_the_credit_text_logs_that_there_is_no_credit_text(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    """SEC-07"""
    capture_events(caplog)
    use_fakes(with_trips(default_fakes(), call_guard=FakeCallGuard(allowed=False)))

    assert client.get(ATTRIBUTION, headers=CLIENT_HEADERS).status_code == 503

    assert single(caplog, "tomtom_daily_guard_spent")["fell_back_to"] == "no_credit_text"
    assert_nothing_sensitive_was_logged(caplog)


def test_events_written_while_logging_everything_still_hold_nothing_sensitive(
    client: Client, use_fakes: UseFakes, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG)
    use_fakes(
        replace(default_fakes(), trips=trip_environment(call_guard=FakeCallGuard(allowed=False)))
    )

    post(client, COMPARE)
    post(client, PRIMARY, trip_body(load_lb=-5))

    assert_nothing_sensitive_was_logged(caplog)
