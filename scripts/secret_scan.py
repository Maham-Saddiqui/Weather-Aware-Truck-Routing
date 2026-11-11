"""Refuse to push when a secret could be in the repository.

Checks every tracked file, and the whole history, for (1) any value stored in the local .env file
and (2) key-like assignments with a long value. It never prints a secret, only where it matched.
Run from the repository root: python3 -I scripts/secret_scan.py
"""
import re
import subprocess
import sys
from pathlib import Path

MIN_SECRET_LENGTH = 12
KEY_LIKE_ASSIGNMENT = re.compile(
    r"""(?i)\b[\w-]*(api[_-]?key|secret|token|passw(or)?d)\b["']?\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,}"""
)


def env_values():
    """The non-trivial values in .env, which must never appear anywhere in the repository."""
    env_file = Path(".env")
    if not env_file.exists():
        return []
    values = []
    for line in env_file.read_text().splitlines():
        _, _, value = line.partition("=")
        value = value.strip().strip("'\"")
        if len(value) >= MIN_SECRET_LENGTH:
            values.append(value)
    return values


def run_git(*arguments, stdin=None):
    result = subprocess.run(["git", *arguments], input=stdin, capture_output=True, text=True)
    return result.stdout


def env_value_locations(values):
    patterns = "\n".join(values) + "\n"
    in_tree = run_git("grep", "-F", "-l", "-f", "-", stdin=patterns).splitlines()
    revisions = run_git("rev-list", "--all").split()
    in_history = run_git("grep", "-F", "-l", "-f", "-", *revisions, stdin=patterns).splitlines() if revisions else []
    return sorted(set(in_tree + in_history))


def key_like_locations():
    found = []
    for path in run_git("ls-files").splitlines():
        try:
            text = Path(path).read_text()
        except (OSError, UnicodeDecodeError):
            continue
        found += [f"{path}:{number}" for number, line in enumerate(text.splitlines(), 1) if KEY_LIKE_ASSIGNMENT.search(line)]
    return found


def main():
    values = env_values()
    problems = [f"a value from .env appears in: {where}" for where in env_value_locations(values)] if values else []
    problems += [f"key-like assignment at {where}" for where in key_like_locations()]
    if problems:
        print("\n".join(problems))
        sys.exit(1)
    print("secret scan: clean")


main()
