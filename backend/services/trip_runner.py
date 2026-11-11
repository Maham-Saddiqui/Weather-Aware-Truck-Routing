import logging
import threading
import time
from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor, wait
from contextvars import copy_context

from providers.event_log import elapsed_ms, log_event
from providers.routing.port import RoutingUnavailable
from providers.trip_notes import current_notes

MAX_TRIPS_IN_FLIGHT = 4
QUEUE_WAIT_S = 1.0
TRIP_DEADLINE_S = 25.0


class TripsBusy(Exception):
    """Every trip slot stayed taken for the whole short wait; the client should ask again."""


class TripTookTooLong(RoutingUnavailable):
    """The routing, backup and weather chain did not finish within the deadline."""


class TripRunner:
    """Runs primary and compare trips together at most MAX_TRIPS_IN_FLIGHT at a time (PERF-05).

    Each trip holds hundreds of megabytes' worth of routes and weather on a 512 MB server. A trip
    that outlives its deadline keeps its slot until it really ends, so memory stays bounded.
    """

    def __init__(
        self,
        limit: int = MAX_TRIPS_IN_FLIGHT,
        queue_wait_s: float = QUEUE_WAIT_S,
        deadline_s: float = TRIP_DEADLINE_S,
    ) -> None:
        self._limit = limit
        self._slots = threading.BoundedSemaphore(limit)
        self._pool = ThreadPoolExecutor(limit, thread_name_prefix="trip")
        self._queue_wait_s = queue_wait_s
        self._deadline_s = deadline_s

    def run[T](self, work: Callable[[], T], deadline_s: float | None = None) -> T:
        """A long trip brings its own, longer deadline; the slot accounting is the same."""
        queued_at = time.monotonic()
        if not self._slots.acquire(timeout=self._queue_wait_s):
            log_event(
                logging.WARNING,
                "trip_cap_rejected",
                waited_ms=elapsed_ms(queued_at),
                limit=self._limit,
            )
            raise TripsBusy("All trip slots are taken")
        trip: Future[T] = self._pool.submit(copy_context().run, work)
        trip.add_done_callback(lambda _: self._slots.release())
        limit_s = deadline_s or self._deadline_s
        done, _ = wait([trip], timeout=limit_s)
        if not done:
            log_event(
                logging.WARNING,
                "trip_deadline_exceeded",
                stage=current_notes().running_stage or "between_stages",
                deadline_s=limit_s,
            )
            raise TripTookTooLong("The trip took too long")
        return trip.result()
