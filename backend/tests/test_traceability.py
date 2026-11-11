import importlib.util
from pathlib import Path
from types import ModuleType

CHECK_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "check_rule_coverage.py"


def load_check_script() -> ModuleType:
    spec = importlib.util.spec_from_file_location("check_rule_coverage", CHECK_SCRIPT)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_every_risk_rule_is_cited_by_a_test_and_every_cited_rule_exists() -> None:
    """RR-31: the traceability check finds no uncovered rule and no unknown rule ID."""
    assert load_check_script().problems() == []
