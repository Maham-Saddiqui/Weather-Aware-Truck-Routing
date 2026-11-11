from collections.abc import Callable
from dataclasses import replace
from typing import Any

import pytest
from django.test import Client

from config.container import Providers
from tests.fakes.bundle import default_fakes
from tests.fakes.logs import events
from tests.fakes.trips import trip_body, trip_environment

type UseFakes = Callable[[Providers], Providers]

SUMMARY = "trip_finished"


def post(client: Client, endpoint: str, body: dict[str, Any] | None = None) -> int:
    response = client.post(
        f"/api/v1/trips/{endpoint}",
        body or trip_body(),
        content_type="application/json",
        HTTP_X_FORWARDED_FOR="203.0.113.7",
    )
    return response.status_code


def only_summary(caplog: pytest.LogCaptureFixture) -> dict[str, Any]:
    (summary,) = events(caplog, SUMMARY)
    return summary


def bundle(**changes: Any) -> Providers:
    return replace(default_fakes(), trips=trip_environment(**changes))
