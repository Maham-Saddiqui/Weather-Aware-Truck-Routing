import logging
import os
import sys
from collections.abc import Mapping, Sequence

from django.conf import LazySettings

logger = logging.getLogger("trips.startup")

GUNICORN_DEFAULT_WORKERS = 1
WORKERS_FLAGS = ("--workers", "-w")
REQUIRED_WORKERS = 1


def fail_if_deployment_setting_is_missing(configured: LazySettings) -> None:
    """Outside debug an empty list would silently refuse every visitor or every host (BE-11)."""
    if configured.DEBUG:
        return
    required = {
        "DJANGO_ALLOWED_HOSTS": configured.ALLOWED_HOSTS,
        "ALLOWED_ORIGINS": configured.CORS_ALLOWED_ORIGINS,
    }
    for name, values in required.items():
        if not values:
            raise RuntimeError(f"Missing required environment variable: {name}")


def configured_worker_count(argv: Sequence[str], environ: Mapping[str, str]) -> int:
    """Mirrors gunicorn: the command line beats WEB_CONCURRENCY, which beats the default (BE-09)."""
    for position, argument in enumerate(argv):
        flag, _, inline_value = argument.partition("=")
        if flag in WORKERS_FLAGS:
            value = inline_value or (argv[position + 1] if position + 1 < len(argv) else "")
            return int(value)
    return int(environ.get("WEB_CONCURRENCY", GUNICORN_DEFAULT_WORKERS))


def log_worker_count() -> None:
    workers = configured_worker_count(sys.argv, os.environ)
    if workers == REQUIRED_WORKERS:
        logger.info("Server started with %d worker process", workers)
        return
    logger.warning(
        "Server started with %d worker processes; the weather cache, daily guard and rate "
        "limits assume exactly 1 and will silently misbehave",
        workers,
    )


def warn_if_routing_key_is_missing(api_key: str) -> None:
    if not api_key:
        logger.warning(
            "TOMTOM_API_KEY is not set; every trip will use the backup routing provider "
            "and the credit text will be unavailable"
        )
