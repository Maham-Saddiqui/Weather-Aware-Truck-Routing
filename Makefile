.PHONY: rehearsal-server rehearsal-frontend check backend-check frontend-check merge-check secret-scan contract-sync rule-coverage

# Use the project's Node (see .nvmrc) even when the shell starts on another version.
NODE26 := $(lastword $(sort $(wildcard $(HOME)/.nvm/versions/node/v26.*)))
ifneq ($(NODE26),)
export PATH := $(NODE26)/bin:$(PATH)
endif

check: backend-check frontend-check contract-sync rule-coverage secret-scan

backend-check:
	cd backend && uv run ruff check . && uv run ruff format --check . \
		&& DJANGO_SECRET_KEY=type-check-only uv run mypy . && uv run lint-imports && uv run pytest -q

frontend-check:
	cd frontend && npm run check

secret-scan:
	python3 -I scripts/secret_scan.py

# Run the COMMITTED copy of the check, so an edit in the working copy cannot switch it off.
merge-check:
	git show main:scripts/check_owned_folders.py | python3 -I - $(TRACK)

contract-sync:
	python3 -I scripts/check_contract_sync.py

rule-coverage:
	python3 -I scripts/check_rule_coverage.py

# Local end-to-end rehearsal with synthetic providers (no network): run both, then open http://localhost:5173
rehearsal-server:
	cd backend && uv run python ../scripts/run_fake_server.py

rehearsal-frontend:
	cd frontend && VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
