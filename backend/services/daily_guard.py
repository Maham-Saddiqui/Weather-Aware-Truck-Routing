import threading
from collections.abc import Callable
from datetime import UTC, date, datetime


class DailyCallGuard:
    """SEC-07: lets at most `daily_limit` provider calls through per UTC day.

    It lives in the memory of the single server process (BE-09) and starts again after a restart.
    """

    def __init__(self, daily_limit: int, clock: Callable[[], datetime]) -> None:
        self._daily_limit = daily_limit
        self._clock = clock
        self._lock = threading.Lock()
        self._day = self._today()
        self._calls_today = 0

    def try_acquire(self) -> bool:
        """Counts one call; True while today's budget lasts, False means use the backup."""
        with self._lock:
            self._start_new_day_if_needed()
            if self._calls_today >= self._daily_limit:
                return False
            self._calls_today += 1
            return True

    def _start_new_day_if_needed(self) -> None:
        today = self._today()
        if today != self._day:
            self._day = today
            self._calls_today = 0

    def _today(self) -> date:
        return self._clock().astimezone(UTC).date()
