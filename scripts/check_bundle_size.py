"""PERF-09: build the front end and fail when its first-load or map code grows past the budget.

Usage, from the repository root:  python3 -I scripts/check_bundle_size.py
The first-load shell is the entry script, its preloaded scripts and the style sheet; the map chunk is the
map library and the map canvas. Sizes are gzip, in kB of 1,000 bytes, as docs/standards/performance.md states them.
"""
import gzip
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
DIST = FRONTEND / "dist"
SHELL_BUDGET_KB = 200
MAP_BUDGET_KB = 350
BYTES_PER_KB = 1000
MAP_CHUNK_FILE = re.compile(r"^(maplibre-gl|RouteMapCanvas)-(?!worker)")
SHELL_REFERENCE = re.compile(r'(?:src|href)="/(assets/[^"]+)"')


def build():
    subprocess.run(["npm", "run", "build"], cwd=FRONTEND, check=True, capture_output=True)


def gzip_kb(path):
    return len(gzip.compress(path.read_bytes(), compresslevel=9)) / BYTES_PER_KB


def shell_files():
    names = SHELL_REFERENCE.findall((DIST / "index.html").read_text(encoding="utf-8"))
    return [DIST / name for name in names if name.endswith((".js", ".css"))]


def map_files():
    return [path for path in (DIST / "assets").iterdir() if MAP_CHUNK_FILE.match(path.name)]


def main():
    build()
    shell, map_chunk = sum(map(gzip_kb, shell_files())), sum(map(gzip_kb, map_files()))
    print(f"first-load shell {shell:.1f} kB of {SHELL_BUDGET_KB}; map chunk {map_chunk:.1f} kB of {MAP_BUDGET_KB}")
    if shell > SHELL_BUDGET_KB or map_chunk > MAP_BUDGET_KB:
        sys.exit("a bundle is over its budget (docs/standards/performance.md section 1)")


if __name__ == "__main__":
    main()
