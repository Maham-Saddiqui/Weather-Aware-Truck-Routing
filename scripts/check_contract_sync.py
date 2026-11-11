"""Fail when the committed API types differ from what the contract generates (FE-01, GEN-16).

Usage, from the repository root:  python3 -I scripts/check_contract_sync.py
"""
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTRACT = ROOT / "docs" / "api" / "openapi.yaml"
COMMITTED = ROOT / "frontend" / "src" / "shared" / "api" / "generated" / "schema.ts"


def regenerate(target):
    command = ["npx", "--no-install", "openapi-typescript", str(CONTRACT), "-o", str(target)]
    subprocess.run(command, cwd=ROOT / "frontend", capture_output=True, text=True, check=True)


def main():
    with tempfile.TemporaryDirectory() as folder:
        fresh = Path(folder) / "schema.ts"
        regenerate(fresh)
        if fresh.read_bytes() != COMMITTED.read_bytes():
            sys.exit("the generated API types are out of date: run `npm run types` in frontend/ and commit")
    print("ok: generated API types match the contract")


if __name__ == "__main__":
    main()
