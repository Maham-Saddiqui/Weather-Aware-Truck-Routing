"""Django settings. Everything environment-specific comes from environment variables (BE-11)."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DEFAULT_VALHALLA_BASE_URL = "https://valhalla1.openstreetmap.de"
DEFAULT_OPEN_METEO_BASE_URL = "https://api.open-meteo.com"
DEFAULT_THROTTLE_RATE = "60/min"
DEFAULT_TOMTOM_DAILY_CALL_LIMIT = 2_000


def required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def list_env(name: str) -> list[str]:
    return [item.strip() for item in os.environ.get(name, "").split(",") if item.strip()]


def int_env(name: str, default: int) -> int:
    return int(os.environ.get(name, default))


DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() == "true"

SECRET_KEY = required_env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = list_env("DJANGO_ALLOWED_HOSTS")
CORS_ALLOWED_ORIGINS = list_env("ALLOWED_ORIGINS")

# Only read when a TomTom call is made; without it the backup provider answers (BE-11).
TOMTOM_API_KEY = os.environ.get("TOMTOM_API_KEY", "")
VALHALLA_BASE_URL = os.environ.get("VALHALLA_BASE_URL", DEFAULT_VALHALLA_BASE_URL)
OPEN_METEO_BASE_URL = os.environ.get("OPEN_METEO_BASE_URL", DEFAULT_OPEN_METEO_BASE_URL)
API_THROTTLE_RATE = os.environ.get("API_THROTTLE_RATE", DEFAULT_THROTTLE_RATE)
TOMTOM_DAILY_CALL_LIMIT = int_env("TOMTOM_DAILY_CALL_LIMIT", DEFAULT_TOMTOM_DAILY_CALL_LIMIT)

INSTALLED_APPS = ["rest_framework", "corsheaders", "trips"]

MIDDLEWARE = [
    "config.request_logging.RequestIdMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "trips.body_limit.BodyLimitMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"

# No database: nothing is stored (docs/architecture.md section 1).
DATABASES: dict[str, dict[str, str]] = {}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
    # Only the trip endpoints read a body, and they declare JSON themselves (SEC-03).
    "DEFAULT_PARSER_CLASSES": [],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "EXCEPTION_HANDLER": "trips.problems.problem_response",
    # Every endpoint is throttled per client address unless a view opts out (SEC-05).
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": API_THROTTLE_RATE},
    # Behind Render's proxy the client address is read from X-Forwarded-For (BE-17).
    "NUM_PROXIES": int(os.environ.get("NUM_PROXIES", "1")),
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {"request_id": {"()": "config.request_logging.RequestIdFilter"}},
    "formatters": {"json": {"()": "config.request_logging.JsonFormatter"}},
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["request_id"],
            "formatter": "json",
        }
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    # These log full request addresses at INFO, and TomTom's key travels in the address (SEC-02).
    "loggers": {
        "httpx": {"level": "WARNING"},
        "httpcore": {"level": "WARNING"},
    },
}

# Render terminates TLS and tells us so through this header (BE-17). Its own health probe arrives
# over plain HTTP, so that one path is exempt from the redirect.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = not DEBUG
SECURE_REDIRECT_EXEMPT = [r"^api/v1/health$"]
SECURE_HSTS_SECONDS = 31_536_000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
