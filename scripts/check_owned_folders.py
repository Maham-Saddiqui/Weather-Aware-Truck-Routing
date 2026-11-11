"""Refuse a merge when a track's branch changed files outside that track's folders.

Usage, from the main checkout:  python3 -I scripts/check_owned_folders.py <track>   (a, b, c or d)
Also refuses when the main checkout has uncommitted changes, because an agent that edited the
main checkout instead of its own worktree would otherwise slip past the branch comparison.
"""
import subprocess
import sys

OWNED_PREFIXES = {
    "a": (
        "backend/domain/",
        "backend/tests/domain/",
        "backend/providers/routing/valhalla.py",
        "backend/tests/providers/test_valhalla.py",
        "backend/providers/timezone/",
        "backend/tests/providers/test_timezone.py",
        "backend/services/daily_guard.py",
        "backend/tests/services/test_daily_guard.py",
    ),
    "b": (
        "backend/providers/",
        "backend/services/",
        "backend/trips/",
        "backend/config/",
        "backend/tests/providers/",
        "backend/tests/services/",
        "backend/tests/trips/",
        "backend/tests/fakes/",
        "backend/tests/contract/",
    ),
    "c": (
        "frontend/src/app/",
        "frontend/src/features/trip-form/",
        "frontend/src/features/route-results/",
        "frontend/src/shared/",
    ),
    "d": (
        "frontend/src/features/map/",
        "frontend/src/features/heatmap-slider/",
    ),
    "lead": (
        "frontend/src/shared/api/generated/",
        "backend/providers/routing/port.py",
        "backend/providers/weather/port.py",
        "backend/providers/timezone/port.py",
    ),
}
AGENT_TRACKS = ("a", "b", "c", "d")


def owner_of(path):
    """The track whose folder matches the path most specifically; anything unmatched is the lead's."""
    matches = [
        (len(prefix), track)
        for track, prefixes in OWNED_PREFIXES.items()
        for prefix in prefixes
        if path.startswith(prefix)
    ]
    return max(matches)[1] if matches else "lead"


def git_lines(*arguments):
    result = subprocess.run(["git", *arguments], capture_output=True, text=True, check=True)
    return [line for line in result.stdout.splitlines() if line]


def problems_for(track):
    uncommitted = git_lines("status", "--porcelain")
    changed = git_lines("diff", "--name-only", f"main...track/{track}")
    outside = [path for path in changed if owner_of(path) != track]
    found = [f"main checkout has uncommitted change: {line}" for line in uncommitted]
    found += [f"track {track} changed a file it does not own: {path}" for path in outside]
    return found, len(changed)


def main(track):
    if track not in AGENT_TRACKS:
        sys.exit("track must be one of: a, b, c, d")
    found, changed_count = problems_for(track)
    if found:
        print("\n".join(found))
        sys.exit(1)
    print(f"ok: track {track} changed {changed_count} file(s), all inside its own folders")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
