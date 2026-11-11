"""RR-31: every risk rule has a test that cites its ID, and no test cites an unknown ID.

Usage, from the repository root:  python3 -I scripts/check_rule_coverage.py [--report]
Scans docs/domain/risk-rules.md, backend/tests and frontend/src. Without --report it exits 1 on any problem.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RULES_FILE = ROOT / "docs" / "domain" / "risk-rules.md"
TEST_ROOTS = (ROOT / "backend" / "tests", ROOT / "frontend" / "src")
TEST_SUFFIXES = (".py", ".ts", ".tsx")
RULE_ID = re.compile(r"RR-\d{2}")
REVIEW_ONLY = {
    "RR-16": "driving time only: a statement shown in the app and README, checked in review",
    "RR-27": "spacing can change the winner: a README statement, checked in review",
}


def rules_in_document():
    text = RULES_FILE.read_text(encoding="utf-8")
    return set(re.findall(r"\*\*(RR-\d{2})", text))


def is_test_file(path):
    name = path.name
    return path.suffix in TEST_SUFFIXES and (name.startswith("test_") or ".test." in name)


def ids_cited_by_tests():
    cited = set()
    for root in TEST_ROOTS:
        for path in root.rglob("*"):
            if path.is_file() and is_test_file(path):
                cited |= set(RULE_ID.findall(path.read_text(encoding="utf-8")))
    return cited


def problems():
    rules, cited = rules_in_document(), ids_cited_by_tests()
    found = [f"{rule} has no test citing it" for rule in sorted(rules - cited - set(REVIEW_ONLY))]
    found += [f"a test cites {rule}, which is not in the risk rules" for rule in sorted(cited - rules)]
    found += [f"{rule} is review-only but is not a rule in the document" for rule in sorted(set(REVIEW_ONLY) - rules)]
    return found


if __name__ == "__main__":
    found = problems()
    print("\n".join(found) if found else "ok: every risk rule is covered and every cited ID exists")
    sys.exit(1 if found and "--report" not in sys.argv else 0)
