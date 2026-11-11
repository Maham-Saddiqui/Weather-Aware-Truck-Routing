import threading
from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor, wait
from contextvars import copy_context

from providers.routing.port import RoutingUnavailable

MAX_TRIPS_IN_FLIGHT = 2
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
        self._slots = threading.BoundedSemaphore(limit)
        self._pool = ThreadPoolExecutor(limit, thread_name_prefix="trip")
        self._queue_wait_s = queue_wait_s
        self._deadline_s = deadline_s

    def run[T](self, work: Callable[[], T]) -> T:
        if not self._slots.acquire(timeout=self._queue_wait_s):
            raise TripsBusy("All trip slots are taken")
        trip: Future[T] = self._pool.submit(copy_context().run, work)
        trip.add_done_callback(lambda _: self._slots.release())
        done, _ = wait([trip], timeout=self._deadline_s)
        if not done:
            raise TripTookTooLong("The trip took too long")
        return trip.result()
