import json
import threading
from collections.abc import Callable
from datetime import UTC, datetime

import httpx
import pytest

from domain.types import GeoPoint
from providers.http import make_client
from providers.weather.budget import WeatherBudget
from providers.weather.cache import WindowCache
from providers.weather.open_meteo import POINTS_PER_REQUEST, OpenMeteoWeather

NOW = datetime(2026, 11, 11, 14, 25, tzinfo=UTC)
FIRST_HOUR = int(datetime(2026, 11, 11, 14, 0, tzinfo=UTC).timestamp())
POINT = GeoPoint(41.0, -87.0)
OTHER_POINT = GeoPoint(42.0, -88.0)


def location(hours: int = 3, **series: str) -> str:
    """Provider JSON as text, so numbers keep their exact spelling like the real service's."""
    columns = {
        "time": json.dumps([FIRST_HOUR + 3600 * hour for hour in range(hours)]),
        "wind_speed_10m": "[10.5, 11.5, 12.5]",
        "wind_gusts_10m": "[20.5, 21.5, 22.5]",
        "rain": "[0.1, 0.0, 0.0]",
        "showers": "[0.2, 0.0, 0.0]",
        "snowfall": "[0.0, 0.01, 0.0]",
        **series,
    }
    return '{"hourly": {' + ", ".join(f'"{name}": {text}' for name, text in columns.items()) + "}}"


def answer(*locations: str) -> httpx.Response:
    body = locations[0] if len(locations) == 1 else "[" + ",".join(locations) + "]"
    return httpx.Response(200, text=body)


def one_location_per_point(request: httpx.Request) -> httpx.Response:
    return answer(*[location()] * len(request.url.params["latitude"].split(",")))


class Service:
    def __init__(
        self,
        respond: Callable[[httpx.Request], httpx.Response] | None = None,
        budget: WeatherBudget | None = None,
    ) -> None:
        self.requests: list[httpx.Request] = []
        self.clock = [NOW]
        self._respond = respond or one_location_per_point
        transport = httpx.MockTransport(self._handle)
        cache = WindowCache(lambda: self.clock[0])
        self.weather = OpenMeteoWeather(
            "https://weather.test",
            make_client(1.0, transport),
            cache,
            lambda: self.clock[0],
        )
        if budget is not None:
            self.weather.limited_by(budget)

    def _handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self._respond(request)


def failing(status: int) -> Service:
    return Service(lambda request: httpx.Response(status))


class SlowFetch:
    """A service whose fetch for OTHER_POINT hangs until `release` is set."""

    def __init__(self) -> None:
        self.started = threading.Event()
        self.release = threading.Event()
        self.service = Service(self._respond)

    def _respond(self, request: httpx.Request) -> httpx.Response:
        if request.url.params["latitude"] == "42.0":
            self.started.set()
            self.release.wait(timeout=5)
        return one_location_per_point(request)

    def begin(self) -> None:
        self.service.weather.forecast([POINT])
        threading.Thread(target=self.service.weather.forecast, args=([OTHER_POINT],)).start()
        assert self.started.wait(timeout=5)


class FakeStopwatch:
    """Stands in for the monotonic clock; every provider call can move it forward."""

    def __init__(self, monkeypatch: pytest.MonkeyPatch) -> None:
        self.seconds = 0.0
        monkeypatch.setattr("providers.weather.open_meteo.monotonic", lambda: self.seconds)

    def respond_taking(self, seconds: float) -> Callable[[httpx.Request], httpx.Response]:
        def respond(request: httpx.Request) -> httpx.Response:
            self.seconds += seconds
            return one_location_per_point(request)

        return respond


def two_chunks_of_points() -> list[GeoPoint]:
    return [GeoPoint(30 + index / 10, -90.0) for index in range(POINTS_PER_REQUEST + 1)]
