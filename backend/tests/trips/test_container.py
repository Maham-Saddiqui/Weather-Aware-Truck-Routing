from config import container
from providers.routing.port import RoutingProviderName
from providers.timezone.offline import OfflineTimeZoneLookup
from services.daily_guard import DailyCallGuard


def test_the_real_providers_are_built_once_and_shared_by_primary_and_compare() -> None:
    container.providers.cache_clear()

    first, second = container.providers(), container.providers()

    assert first is second
    assert first.trips.routing.name is RoutingProviderName.TOMTOM
    assert first.trips.backup_routing.name is RoutingProviderName.VALHALLA
    assert isinstance(first.trips.call_guard, DailyCallGuard)
    assert isinstance(first.trips.timezone, OfflineTimeZoneLookup)
    container.providers.cache_clear()
