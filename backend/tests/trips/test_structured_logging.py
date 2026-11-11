import json
import logging
from typing import Any

import pytest

from config.request_logging import JsonFormatter, RequestIdFilter, request_id_var

LOGGER = logging.getLogger("trips.test_structured_logging")


def formatted(message: str, *args: object, fields: Any = None) -> dict[str, Any]:
    extra = {} if fields is None else {"fields": fields}
    record = LOGGER.makeRecord(
        LOGGER.name, logging.INFO, "file", 1, message, args, None, extra=extra
    )
    RequestIdFilter().filter(record)
    parsed: dict[str, Any] = json.loads(JsonFormatter().format(record))
    return parsed


def test_named_fields_of_a_log_call_become_json_keys() -> None:
    """BE-12"""
    entry = formatted("trip_finished", fields={"outcome": "ok", "routes": 3})

    assert entry["outcome"] == "ok"
    assert entry["routes"] == 3
    assert entry["message"] == "trip_finished"


def test_every_line_carries_the_request_id_of_the_running_request() -> None:
    """BE-12"""
    token = request_id_var.set("abc123")
    try:
        with_filter = formatted("one", fields={"a": 1})
        without_filter = json.loads(
            JsonFormatter().format(
                LOGGER.makeRecord(LOGGER.name, logging.INFO, "file", 1, "two", (), None)
            )
        )
    finally:
        request_id_var.reset(token)

    assert with_filter["request_id"] == "abc123"
    assert without_filter["request_id"] == "abc123"


def test_a_field_can_never_replace_the_message_level_or_request_id() -> None:
    entry = formatted("real", fields={"message": "fake", "level": "DEBUG", "request_id": "fake"})

    assert entry["message"] == "real"
    assert entry["level"] == "INFO"
    assert entry["request_id"] != "fake"


def test_a_field_value_json_cannot_hold_is_written_as_text_not_raised() -> None:
    entry = formatted("odd", fields={"thing": object})

    assert entry["thing"].startswith("<class")


@pytest.mark.parametrize("broken", ["circular", "bad_arguments"])
def test_a_line_that_cannot_be_formatted_becomes_a_short_note_never_an_exception(
    broken: str,
) -> None:
    circular: dict[str, Any] = {}
    circular["self"] = circular
    if broken == "circular":
        entry = formatted("odd", fields=circular)
    else:
        entry = formatted("needs %d", "text")

    assert entry == {"level": "INFO", "message": "log line could not be formatted"}
