import logging
import time
from collections.abc import Callable

from providers.event_log import elapsed_ms, log_event
from providers.trip_notes import TripNotes, recording_trip

OK = "ok"
DEGRADED = "degraded"
FAILED = "failed"
STAGES = ("routing", "weather", "rating", "total")


def summarized[T](endpoint: str, work: Callable[[], T]) -> T:
    """Writes the one summary line of a trip request, whether it answered or failed."""
    with recording_trip() as notes:
        started = time.monotonic()
        try:
            return work()
        except Exception as error:
            notes.error = type(error).__name__
            raise
        finally:
            notes.stage_ms["total"] = elapsed_ms(started)
            _log_summary(endpoint, notes)


def _outcome(notes: TripNotes) -> str:
    if notes.error:
        return FAILED
    if notes.backup_reason or notes.alternatives_unavailable or notes.weather_status != "ok":
        return DEGRADED
    return OK


def _log_summary(endpoint: str, notes: TripNotes) -> None:
    outcome = _outcome(notes)
    level = logging.WARNING if outcome == FAILED else logging.INFO
    log_event(
        level,
        "trip_finished",
        endpoint=endpoint,
        outcome=outcome,
        error=notes.error or None,
        routing_provider=notes.routing_provider or None,
        backup_used=bool(notes.backup_reason),
        backup_reason=notes.backup_reason or None,
        alternatives_unavailable=notes.alternatives_unavailable,
        long_trip=notes.long_trip,
        straight_line_miles=notes.straight_line_miles,
        alternatives_read_timeout_s=notes.alternatives_read_timeout_s,
        alternatives_ms=notes.alternatives_ms,
        routes=notes.routes,
        weather_status=notes.weather_status or None,
        checkpoints=notes.checkpoints,
        checkpoints_rated=notes.checkpoints_rated,
        cells_requested=notes.cells_requested,
        cells_missing=notes.cells_missing,
        weather_cache_hits=notes.weather_cache_hits,
        **{f"{name}_ms": notes.stage_ms.get(name, 0) for name in STAGES},
    )
