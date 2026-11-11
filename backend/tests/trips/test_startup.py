import importlib
import logging
import sys

import pytest

from config import container
from config.startup import (
    configured_worker_count,
    log_worker_count,
    warn_if_routing_key_is_missing,
)


def test_the_provider_bundle_is_built_at_start_up_before_any_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """BE-09"""
    builds: list[str] = []
    monkeypatch.setattr(container, "providers", lambda: builds.append("built"))
    sys.modules.pop("config.wsgi", None)

    importlib.import_module("config.wsgi")

    assert builds == ["built"]
    sys.modules.pop("config.wsgi", None)


@pytest.mark.parametrize(
    ("argv", "environ", "expected"),
    [
        (["gunicorn", "app", "--workers", "1", "--threads", "8"], {}, 1),
        (["gunicorn", "app", "--workers=3"], {}, 3),
        (["gunicorn", "app", "-w", "2"], {}, 2),
        (["gunicorn", "app", "--workers", "1"], {"WEB_CONCURRENCY": "4"}, 1),
        (["gunicorn", "app"], {"WEB_CONCURRENCY": "4"}, 4),
        (["gunicorn", "app"], {}, 1),
    ],
)
def test_the_worker_count_follows_gunicorns_own_precedence(
    argv: list[str], environ: dict[str, str], expected: int
) -> None:
    """BE-09"""
    assert configured_worker_count(argv, environ) == expected


def test_one_worker_is_logged_as_information(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    """BE-09"""
    monkeypatch.setattr("sys.argv", ["gunicorn", "app", "--workers", "1"])
    caplog.set_level(logging.INFO, logger="trips.startup")

    log_worker_count()

    assert [(r.levelno, r.getMessage()) for r in caplog.records] == [
        (logging.INFO, "Server started with 1 worker process")
    ]


def test_more_than_one_worker_is_logged_as_a_warning(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    """BE-09"""
    monkeypatch.setattr("sys.argv", ["gunicorn", "app", "--workers", "2"])
    caplog.set_level(logging.INFO, logger="trips.startup")

    log_worker_count()

    assert caplog.records[0].levelno == logging.WARNING
    assert "2 worker processes" in caplog.records[0].getMessage()


def test_a_missing_routing_key_is_a_start_up_warning_that_names_no_value(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO, logger="trips.startup")

    warn_if_routing_key_is_missing("")

    assert [(r.levelno, "TOMTOM_API_KEY" in r.getMessage()) for r in caplog.records] == [
        (logging.WARNING, True)
    ]


def test_a_present_routing_key_is_not_mentioned_at_all(caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.INFO, logger="trips.startup")

    warn_if_routing_key_is_missing("fake-key-for-tests")

    assert caplog.records == []
