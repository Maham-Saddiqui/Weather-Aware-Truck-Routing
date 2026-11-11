import secrets

from django.core import checks
from django.test import Client, override_settings


def production_like_settings() -> dict[str, object]:
    return {
        "DEBUG": False,
        "SECRET_KEY": secrets.token_urlsafe(60),
        "ALLOWED_HOSTS": [".onrender.com"],
        "SECURE_SSL_REDIRECT": True,
    }


def test_the_deployment_checks_pass_with_production_like_settings() -> None:
    """SEC-06"""
    with override_settings(**production_like_settings()):
        problems = checks.run_checks(include_deployment_checks=True)

    assert [problem.id for problem in problems] == []


def test_a_plain_http_request_is_redirected_to_https_but_the_health_probe_is_not() -> None:
    """SEC-06"""
    with override_settings(**production_like_settings()):
        client = Client()
        redirected = client.get("/api/v1/attribution", HTTP_HOST="api.onrender.com")
        probe = client.get("/api/v1/health", HTTP_HOST="api.onrender.com")

    assert redirected.status_code == 301
    assert probe.status_code == 200


def test_a_request_the_proxy_marks_as_https_gets_the_security_headers() -> None:
    """SEC-06"""
    with override_settings(**production_like_settings()):
        response = Client().get(
            "/api/v1/health", HTTP_HOST="api.onrender.com", HTTP_X_FORWARDED_PROTO="https"
        )

    assert response["Strict-Transport-Security"].startswith("max-age=31536000")
    assert response["X-Content-Type-Options"] == "nosniff"
    assert response["Referrer-Policy"] == "same-origin"
    assert response["X-Frame-Options"] == "DENY"
