from collections.abc import Callable

import pytest

from config.container import Providers
from tests.fakes.bundle import default_fakes, install_fakes


@pytest.fixture
def use_fakes(monkeypatch: pytest.MonkeyPatch) -> Callable[[Providers], Providers]:
    install_fakes(monkeypatch, default_fakes())
    return lambda bundle: install_fakes(monkeypatch, bundle)
