"""Django settings. Everything environment-specific comes from environment variables (BE-11)."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def list_env(name: str) -> list[str]:
    return [item.strip() for item in os.environ.get(name, "").split(",") if item.strip()]


DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() == "true"
SECRET_KEY = required_env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = list_env("DJANGO_ALLOWED_HOSTS")
CORS_ALLOWED_ORIGINS = list_env("ALLOWED_ORIGINS")

INSTALLED_APPS = ["rest_framework", "corsheaders", "trips"]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
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
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    # Behind Render's proxy the client address is read from X-Forwarded-For (BE-17).
    "NUM_PROXIES": int(os.environ.get("NUM_PROXIES", "1")),
}

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_HSTS_SECONDS = 31_536_000
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
