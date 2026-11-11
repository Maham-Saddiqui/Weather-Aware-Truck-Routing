import threading
from concurrent.futures import ThreadPoolExecutor
from contextvars import ContextVar

import pytest

from services.trip_runner import TripRunner, TripsBusy, TripTookTooLong

SHORT_WAIT_S = 0.05
LONG_WAIT_S = 5


class HeldTrip:
    """A trip that stays in flight until `finish` is called."""

    def __init__(self, runner: TripRunner, pool: ThreadPoolExecutor) -> None:
        self.started = threading.Event()
        self._finish = threading.Event()
        self.outcome = pool.submit(runner.run, self._work)
        assert self.started.wait(LONG_WAIT_S)

    def _work(self) -> str:
        self.started.set()
        self._finish.wait(LONG_WAIT_S)
        return "done"

    def finish(self) -> str:
        self._finish.set()
        return self.outcome.result(LONG_WAIT_S)


@pytest.fixture
def pool() -> ThreadPoolExecutor:
    return ThreadPoolExecutor(4)


def test_a_trip_that_finishes_returns_its_answer() -> None:
    assert TripRunner().run(lambda: "answer") == "answer"


def test_a_failing_trip_raises_its_own_error_and_frees_its_slot() -> None:
    runner = TripRunner(limit=1)

    def fail() -> None:
        raise ValueError("synthetic")

    with pytest.raises(ValueError, match="synthetic"):
        runner.run(fail)

    assert runner.run(lambda: "next") == "next"


def test_no_more_trips_than_the_limit_run_at_once_and_the_extra_one_is_turned_away(
    pool: ThreadPoolExecutor,
) -> None:
    """PERF-05"""
    runner = TripRunner(limit=2, queue_wait_s=SHORT_WAIT_S)
    first, second = HeldTrip(runner, pool), HeldTrip(runner, pool)

    with pytest.raises(TripsBusy):
        runner.run(lambda: "third")

    assert (first.finish(), second.finish()) == ("done", "done")


def test_a_finished_trip_gives_its_slot_to_the_next_one(pool: ThreadPoolExecutor) -> None:
    runner = TripRunner(limit=1, queue_wait_s=LONG_WAIT_S)
    held = HeldTrip(runner, pool)
    waiting = pool.submit(runner.run, lambda: "second")

    held.finish()

    assert waiting.result(LONG_WAIT_S) == "second"


def test_a_trip_past_its_deadline_is_reported_but_keeps_its_slot_until_it_really_ends(
    pool: ThreadPoolExecutor,
) -> None:
    """PERF-05"""
    runner = TripRunner(limit=1, queue_wait_s=SHORT_WAIT_S, deadline_s=SHORT_WAIT_S)
    slow = threading.Event()
    ended = threading.Event()

    def slow_trip() -> None:
        slow.wait(LONG_WAIT_S)
        ended.set()

    with pytest.raises(TripTookTooLong):
        runner.run(slow_trip)
    with pytest.raises(TripsBusy):
        runner.run(lambda: "while the slow trip still runs")

    slow.set()
    assert ended.wait(LONG_WAIT_S)
    assert runner.run(lambda: "after") == "after"


def test_the_request_context_follows_the_trip_into_its_thread() -> None:
    request_id: ContextVar[str] = ContextVar("request_id", default="-")
    request_id.set("abc")

    assert TripRunner().run(request_id.get) == "abc"
