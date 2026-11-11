import logging
import time

EVENTS = logging.getLogger("trips.events")


def log_event(level: int, event: str, **fields: object) -> None:
    """One searchable line: the fixed event name is the message, the fields become JSON keys.

    Callers pass only counts, names and codes: never a URL, a key, a place or a client address.
    """
    EVENTS.log(level, event, extra={"fields": fields})


def elapsed_ms(started: float) -> int:
    return round((time.monotonic() - started) * 1000)


def log_guard_spent(fell_back_to: str) -> None:
    """SEC-07: the daily TomTom budget is used up; says what answered instead."""
    log_event(logging.WARNING, "tomtom_daily_guard_spent", fell_back_to=fell_back_to)
