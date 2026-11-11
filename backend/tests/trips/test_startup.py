import logging

import pytest

from config.startup import configured_worker_count, log_worker_count


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
def test_the_worker_count_follows_gunicorns_own_precedence_BE_09(
    argv: list[str], environ: dict[str, str], expected: int
) -> None:
    assert configured_worker_count(argv, environ) == expected


def test_one_worker_is_logged_as_information_BE_09(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("sys.argv", ["gunicorn", "app", "--workers", "1"])
    caplog.set_level(logging.INFO, logger="trips.startup")

    log_worker_count()

    assert [(r.levelno, r.getMessage()) for r in caplog.records] == [
        (logging.INFO, "Server started with 1 worker process")
    ]


def test_more_than_one_worker_is_logged_as_a_warning_BE_09(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("sys.argv", ["gunicorn", "app", "--workers", "2"])
    caplog.set_level(logging.INFO, logger="trips.startup")

    log_worker_count()

    assert caplog.records[0].levelno == logging.WARNING
    assert "2 worker processes" in caplog.records[0].getMessage()
