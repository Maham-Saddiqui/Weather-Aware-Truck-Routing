import threading
from datetime import UTC, datetime, timedelta, timezone

from services.daily_guard import DailyCallGuard


class MutableClock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def read(self) -> datetime:
        return self.now


NOON = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)


def test_sec07_calls_pass_until_the_daily_budget_is_spent() -> None:
    guard = DailyCallGuard(daily_limit=3, clock=MutableClock(NOON).read)

    assert [guard.try_acquire() for _ in range(5)] == [True, True, True, False, False]


def test_sec07_a_budget_of_zero_sends_every_call_to_the_backup() -> None:
    guard = DailyCallGuard(daily_limit=0, clock=MutableClock(NOON).read)

    assert not guard.try_acquire()


def test_sec07_the_budget_starts_again_on_the_next_utc_day() -> None:
    clock = MutableClock(NOON)
    guard = DailyCallGuard(daily_limit=1, clock=clock.read)
    assert guard.try_acquire()
    assert not guard.try_acquire()

    clock.now = datetime(2026, 11, 13, 0, 0, 0, tzinfo=UTC)

    assert guard.try_acquire()
    assert not guard.try_acquire()


def test_sec07_the_budget_does_not_reset_just_before_utc_midnight() -> None:
    clock = MutableClock(datetime(2026, 11, 12, 23, 59, 59, tzinfo=UTC))
    guard = DailyCallGuard(daily_limit=1, clock=clock.read)
    assert guard.try_acquire()

    clock.now += timedelta(milliseconds=500)

    assert not guard.try_acquire()


def test_sec07_the_day_is_counted_in_utc_whatever_zone_the_clock_reports() -> None:
    pakistan = timezone(timedelta(hours=5))
    clock = MutableClock(datetime(2026, 11, 13, 4, 30, tzinfo=pakistan))  # 23:30 UTC on the 12th
    guard = DailyCallGuard(daily_limit=1, clock=clock.read)
    assert guard.try_acquire()

    clock.now = datetime(2026, 11, 13, 5, 30, tzinfo=pakistan)  # 00:30 UTC on the 13th

    assert guard.try_acquire()


def test_sec07_threads_asking_together_never_pass_more_than_the_budget() -> None:
    guard = DailyCallGuard(daily_limit=20, clock=MutableClock(NOON).read)
    answers: list[bool] = []

    def ask() -> None:
        answers.append(guard.try_acquire())

    threads = [threading.Thread(target=ask) for _ in range(100)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert answers.count(True) == 20
    assert answers.count(False) == 80
