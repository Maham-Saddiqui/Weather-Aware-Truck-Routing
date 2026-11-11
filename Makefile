.PHONY: check backend-check frontend-check merge-check secret-scan

# Use the project's Node (see .nvmrc) even when the shell starts on another version.
NODE26 := $(lastword $(sort $(wildcard $(HOME)/.nvm/versions/node/v26.*)))
ifneq ($(NODE26),)
export PATH := $(NODE26)/bin:$(PATH)
endif

check: backend-check frontend-check secret-scan

backend-check:
	cd backend && uv run ruff check . && uv run ruff format --check . \
		&& DJANGO_SECRET_KEY=type-check-only uv run mypy . && uv run pytest -q

frontend-check:
	cd frontend && npm run check

secret-scan:
	python3 -I scripts/secret_scan.py

# Run the COMMITTED copy of the check, so an edit in the working copy cannot switch it off.
merge-check:
	git show main:scripts/check_owned_folders.py | python3 -I - $(TRACK)
