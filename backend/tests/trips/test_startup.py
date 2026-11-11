import importlib
import logging
import sys

import pytest
from django.conf import settings
from django.test import override_settings

from config import container
from config.startup import (
    configured_worker_count,
    fail_if_deployment_setting_is_missing,
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

    with override_settings(DEBUG=True):
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


DEPLOYED = {
    "DEBUG": False,
    "ALLOWED_HOSTS": [".onrender.com"],
    "CORS_ALLOWED_ORIGINS": ["https://a.test"],
}


def test_a_fully_configured_deployment_starts() -> None:
    """BE-11"""
    with override_settings(**DEPLOYED):
        fail_if_deployment_setting_is_missing(settings)


@pytest.mark.parametrize(
    ("empty_setting", "variable"),
    [("ALLOWED_HOSTS", "DJANGO_ALLOWED_HOSTS"), ("CORS_ALLOWED_ORIGINS", "ALLOWED_ORIGINS")],
)
def test_a_deployment_without_hosts_or_origins_stops_and_names_the_variable(
    empty_setting: str, variable: str
) -> None:
    """BE-11"""
    with override_settings(**{**DEPLOYED, empty_setting: []}), pytest.raises(RuntimeError) as stop:
        fail_if_deployment_setting_is_missing(settings)

    assert variable in str(stop.value)


def test_debug_keeps_the_local_defaults_when_hosts_and_origins_are_missing() -> None:
    """BE-11"""
    with override_settings(DEBUG=True, ALLOWED_HOSTS=[], CORS_ALLOWED_ORIGINS=[]):
        fail_if_deployment_setting_is_missing(settings)
