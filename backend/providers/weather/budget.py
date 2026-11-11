import threading
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True, slots=True)
class BudgetLimit:
    window: timedelta
    locations: int


# Just under the weather service's free allowance (performance.md PERF-04), counting one call per
# location, so distinct trips from many visitors cannot spend the whole day's allowance.
WEATHER_BUDGET_LIMITS = (
    BudgetLimit(timedelta(minutes=1), 550),
    BudgetLimit(timedelta(hours=1), 4_500),
    BudgetLimit(timedelta(days=1), 9_000),
)


@dataclass(slots=True)
class _Window:
    limit: BudgetLimit
    started_at: datetime
    spent: int = 0


class WeatherBudget:
    """SEC-07: every location asked of the weather service is counted here, for all visitors.

    Like the other guards it lives in the memory of the single server process (BE-09).
    """

    def __init__(self, limits: Sequence[BudgetLimit], clock: Callable[[], datetime]) -> None:
        self._clock = clock
        self._lock = threading.Lock()
        self._windows = [_Window(limit, clock()) for limit in limits]

    def try_spend(self, locations: int) -> bool:
        """Counts the locations and returns True, or counts nothing and returns False."""
        with self._lock:
            now = self._clock()
            for window in self._windows:
                if now - window.started_at >= window.limit.window:
                    window.started_at, window.spent = now, 0
            if any(w.spent + locations > w.limit.locations for w in self._windows):
                return False
            for window in self._windows:
                window.spent += locations
            return True
