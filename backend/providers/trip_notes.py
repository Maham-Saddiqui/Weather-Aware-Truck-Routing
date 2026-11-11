import time
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field

from providers.event_log import elapsed_ms


@dataclass(slots=True)
class TripNotes:
    """What happened during one trip request, filled in by the stages and read for the summary."""

    routing_provider: str = ""
    backup_reason: str = ""
    alternatives_unavailable: bool = False
    alternatives_tier: str = ""
    long_trip: bool = False
    straight_line_miles: int = 0
    alternatives_read_timeout_s: float | None = None
    alternatives_ms: int | None = None
    routes: int = 0
    weather_status: str = ""
    checkpoints: int = 0
    checkpoints_rated: int = 0
    cells_requested: int = 0
    cells_missing: int = 0
    weather_cache_hits: int = 0
    stage_ms: dict[str, int] = field(default_factory=dict)
    running_stage: str = ""
    error: str = ""


_notes: ContextVar[TripNotes | None] = ContextVar("trip_notes", default=None)


def current_notes() -> TripNotes:
    """Outside a trip request (a unit test of one stage) the notes go nowhere."""
    return _notes.get() or TripNotes()


@contextmanager
def recording_trip() -> Iterator[TripNotes]:
    notes = TripNotes()
    token = _notes.set(notes)
    try:
        yield notes
    finally:
        _notes.reset(token)


@contextmanager
def stage(name: str) -> Iterator[None]:
    notes = current_notes()
    notes.running_stage = name
    started = time.monotonic()
    try:
        yield
    finally:
        notes.stage_ms[name] = notes.stage_ms.get(name, 0) + elapsed_ms(started)
        notes.running_stage = ""
