import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace

from django.test import Client

from config.container import Providers
from domain.types import ProviderRoute
from providers.routing.port import RouteQuery, RoutingProviderName
from services.trip_runner import TripRunner
from tests.fakes.bundle import default_fakes, with_trips
from tests.fakes.trips import route_bent, tomtom_answering, trip_body

type UseFakes = Callable[[Providers], Providers]

SHORT_WAIT_S = 0.05
LONG_WAIT_S = 5
TRIP_PATHS = ("/api/v1/trips/primary", "/api/v1/trips/compare")


def serve_with(use_fakes: UseFakes, runner: TripRunner) -> None:
    bundle = with_trips(default_fakes(), routing=tomtom_answering((route_bent(0.0),)))
    use_fakes(replace(bundle, trip_runner=runner))


def keep_the_only_slot_busy(runner: TripRunner) -> Callable[[], None]:
    started, release = threading.Event(), threading.Event()

    def hold() -> None:
        started.set()
        release.wait(LONG_WAIT_S)

    ThreadPoolExecutor(1).submit(runner.run, hold)
    assert started.wait(LONG_WAIT_S)
    return release.set


def test_a_trip_asked_while_every_slot_is_busy_gets_a_plain_busy_answer(
    client: Client, use_fakes: UseFakes
) -> None:
    """PERF-05"""
    runner = TripRunner(limit=1, queue_wait_s=SHORT_WAIT_S)
    serve_with(use_fakes, runner)
    free_the_slot = keep_the_only_slot_busy(runner)

    for path in TRIP_PATHS:
        response = client.post(path, trip_body(), content_type="application/json")

        assert response.status_code == 429
        assert response.json()["code"] == "rate_limited"
        assert "busy" in response.json()["detail"]
        assert int(response["Retry-After"]) > 0
        assert response["Cache-Control"] == "no-store"
    free_the_slot()


def test_the_health_check_answers_while_every_trip_slot_is_busy(
    client: Client, use_fakes: UseFakes
) -> None:
    runner = TripRunner(limit=1, queue_wait_s=SHORT_WAIT_S)
    serve_with(use_fakes, runner)
    free_the_slot = keep_the_only_slot_busy(runner)

    assert client.get("/api/v1/health").status_code == 200
    free_the_slot()


class SlowRouting:
    name = RoutingProviderName.TOMTOM

    def __init__(self, release: threading.Event) -> None:
        self.release = release

    def routes(self, query: RouteQuery) -> tuple[ProviderRoute, ...]:
        self.release.wait(LONG_WAIT_S)
        return (route_bent(0.0),)


def test_a_trip_that_runs_past_the_deadline_gets_the_plain_unavailable_answer(
    client: Client, use_fakes: UseFakes
) -> None:
    """PERF-05"""
    release = threading.Event()
    runner = TripRunner(limit=1, queue_wait_s=SHORT_WAIT_S, deadline_s=SHORT_WAIT_S)
    use_fakes(
        replace(with_trips(default_fakes(), routing=SlowRouting(release)), trip_runner=runner)
    )

    response = client.post(TRIP_PATHS[0], trip_body(), content_type="application/json")

    assert response.status_code == 503
    assert response.json()["code"] == "routing_unavailable"
    release.set()


class BrieflySlowRouting(SlowRouting):
    def routes(self, query: RouteQuery) -> tuple[ProviderRoute, ...]:
        threading.Event().wait(SHORT_WAIT_S * 4)
        return (route_bent(0.0),)


SEATTLE = {"lat": 47.6062, "lon": -122.3321, "label": "Seattle, WA"}
MIAMI = {"lat": 25.7617, "lon": -80.1918, "label": "Miami, FL"}


def test_a_long_trip_gets_the_longer_deadline_where_a_normal_trip_would_time_out(
    client: Client, use_fakes: UseFakes
) -> None:
    """REQ-03, PERF-05"""
    runner = TripRunner(limit=1, queue_wait_s=LONG_WAIT_S, deadline_s=SHORT_WAIT_S)
    use_fakes(
        replace(
            with_trips(default_fakes(), routing=BrieflySlowRouting(threading.Event())),
            trip_runner=runner,
        )
    )
    compare = "/api/v1/trips/compare"

    normal = client.post(compare, trip_body(), content_type="application/json")
    long = client.post(
        compare, trip_body(origin=SEATTLE, destination=MIAMI), content_type="application/json"
    )

    assert normal.status_code == 503
    assert long.status_code == 200
