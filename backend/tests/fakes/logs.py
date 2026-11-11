import logging
import re
from typing import Any

import pytest

from config.request_logging import JsonFormatter

EVENTS_LOGGER = "trips.events"
COORDINATE_LIKE = re.compile(r"-?\d+\.\d{3,}")
PLACE_LABELS = ("Chicago, IL", "Denver, CO")
KNOWN_COORDINATES = ("41.8781", "-87.6298", "39.7392", "-104.9903")
CLIENT_ADDRESSES = ("203.0.113.7", "127.0.0.1")


def written_lines(caplog: pytest.LogCaptureFixture) -> list[str]:
    """Every captured record exactly as the server would write it."""
    return [JsonFormatter().format(record) for record in caplog.records]


def events(caplog: pytest.LogCaptureFixture, name: str) -> list[dict[str, Any]]:
    """The structured events with this fixed name, as parsed fields."""
    return [
        {**record.__dict__["fields"], "level": record.levelname}
        for record in caplog.records
        if record.name == EVENTS_LOGGER and record.getMessage() == name
    ]


def assert_nothing_sensitive_was_logged(caplog: pytest.LogCaptureFixture, *secrets: str) -> None:
    lines = written_lines(caplog)
    assert lines
    forbidden = (*secrets, *PLACE_LABELS, *KNOWN_COORDINATES, *CLIENT_ADDRESSES)
    for line in lines:
        assert not COORDINATE_LIKE.search(line), line
        for value in forbidden:
            assert value not in line, line


def capture_events(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.INFO)
