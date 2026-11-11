from datetime import UTC, datetime, timedelta

from providers.weather.budget import BudgetLimit, WeatherBudget

START = datetime(2026, 11, 11, 14, 0, tzinfo=UTC)
PER_MINUTE = BudgetLimit(timedelta(minutes=1), 10)
PER_HOUR = BudgetLimit(timedelta(hours=1), 15)


class Clock:
    def __init__(self) -> None:
        self.now = START

    def __call__(self) -> datetime:
        return self.now


def test_locations_are_allowed_until_the_window_budget_is_spent() -> None:
    """SEC-07"""
    budget = WeatherBudget([PER_MINUTE], Clock())

    assert [budget.try_spend(4), budget.try_spend(6), budget.try_spend(1)] == [True, True, False]


def test_a_refused_request_spends_nothing() -> None:
    """SEC-07"""
    budget = WeatherBudget([PER_MINUTE], Clock())
    budget.try_spend(8)

    assert not budget.try_spend(3)
    assert budget.try_spend(2)


def test_the_budget_starts_again_when_its_window_has_passed() -> None:
    """SEC-07"""
    clock = Clock()
    budget = WeatherBudget([PER_MINUTE], clock)
    budget.try_spend(10)

    clock.now = START + timedelta(minutes=1)

    assert budget.try_spend(10)


def test_the_longer_window_still_limits_after_the_shorter_one_starts_again() -> None:
    """SEC-07"""
    clock = Clock()
    budget = WeatherBudget([PER_MINUTE, PER_HOUR], clock)
    budget.try_spend(10)

    clock.now = START + timedelta(minutes=2)

    assert not budget.try_spend(6)
    assert budget.try_spend(5)


def test_without_limits_everything_is_allowed() -> None:
    assert WeatherBudget([], Clock()).try_spend(1_000_000)
