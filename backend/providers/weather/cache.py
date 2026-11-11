import threading
from collections import OrderedDict
from collections.abc import Callable
from datetime import datetime, timedelta

WEATHER_CACHE_TTL = timedelta(hours=1)
WEATHER_CACHE_MAX_CELLS = 2_000

type CellKey = tuple[float, float]


class WindowCache:
    """Weather only, never route data (SEC-08): rounded cell to the raw text of its whole window.

    Least recently used cells are dropped beyond the cap. One lock guards both the order and the
    contents because the server runs a single process with several threads (BE-09).
    """

    def __init__(
        self,
        clock: Callable[[], datetime],
        ttl: timedelta = WEATHER_CACHE_TTL,
        max_cells: int = WEATHER_CACHE_MAX_CELLS,
    ) -> None:
        self._clock = clock
        self._ttl = ttl
        self._max_cells = max_cells
        self._entries: OrderedDict[CellKey, tuple[datetime, str]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, cell: CellKey) -> str | None:
        with self._lock:
            entry = self._entries.get(cell)
            if entry is None:
                return None
            stored_at, text = entry
            if self._clock() - stored_at >= self._ttl:
                del self._entries[cell]
                return None
            self._entries.move_to_end(cell)
            return text

    def put(self, cell: CellKey, text: str) -> None:
        with self._lock:
            self._entries[cell] = (self._clock(), text)
            self._entries.move_to_end(cell)
            while len(self._entries) > self._max_cells:
                self._entries.popitem(last=False)
