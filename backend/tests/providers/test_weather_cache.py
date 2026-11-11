from datetime import UTC, datetime, timedelta

from providers.weather.cache import WindowCache

START = datetime(2026, 11, 11, 12, 0, tzinfo=UTC)


class Clock:
    def __init__(self) -> None:
        self.now = START

    def __call__(self) -> datetime:
        return self.now


def test_a_stored_window_is_returned_until_its_time_to_live_runs_out() -> None:
    clock = Clock()
    cache = WindowCache(clock, ttl=timedelta(hours=1))
    cache.put((41.0, -87.0), "window")

    clock.now = START + timedelta(minutes=59)
    assert cache.get((41.0, -87.0)) == "window"

    clock.now = START + timedelta(hours=1)
    assert cache.get((41.0, -87.0)) is None


def test_an_unknown_cell_has_no_window() -> None:
    assert WindowCache(Clock()).get((1.0, 2.0)) is None


def test_beyond_the_size_cap_the_least_recently_used_cell_is_dropped() -> None:
    cache = WindowCache(Clock(), max_cells=2)
    cache.put((1.0, 1.0), "first")
    cache.put((2.0, 2.0), "second")
    cache.get((1.0, 1.0))

    cache.put((3.0, 3.0), "third")

    assert cache.get((2.0, 2.0)) is None
    assert cache.get((1.0, 1.0)) == "first"
    assert cache.get((3.0, 3.0)) == "third"
