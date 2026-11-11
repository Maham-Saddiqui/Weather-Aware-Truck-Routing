# Weather-Aware Truck Routing: front page for every agent

Read this page first. Then read only the documents your task needs (table below).

## What we are building

A web app. A truck driver enters origin, destination, departure time and cargo weight. The app returns up to 3 route options, a weather-risk rating at checkpoints along each route, a recommended route, a map with the routes and checkpoints, and a corridor heatmap with a 0 to 48 hour forecast slider. Details: `docs/requirements.md`.

## Non-negotiable rules

1. **`docs/domain/risk-rules.md` wins over code.** If code and that file disagree, the code is wrong. Tests cite rule IDs (`RR-nn`) in their names.
2. **Secrets:** never commit keys, `.env` files or tokens, and never print them. API keys live in server environment variables only.
3. **TomTom terms:** never cache or store TomTom results (routes, search, copyright text) on the server or in git. Route endpoints send `Cache-Control: no-store`. Test fixtures for TomTom are synthetic, never recorded real responses. Never publish speed or quality comparisons of TomTom against other providers.
4. **Numbers:** ratings and distances use exact decimals (Python `Decimal`), rounded once on the server. The screen displays the server's strings and never rounds again.
5. **Tool configuration is owned by the lead** (ESLint, TypeScript, Prettier, ruff, mypy, pytest, CI). Do not loosen or disable a rule, and do not add `eslint-disable`, `noqa` or `type: ignore` without a written reason approved by the lead.
6. **Git:** work only in your own worktree and branch. Commit small, with a message ending in the `Co-Authored-By` line. **Never push, merge, rebase, open pull requests or touch other branches** unless the lead tells you to.
7. **Stay inside your owned folders** (see `docs/architecture.md`, section 14). If you need a change elsewhere (the contract, shared types, configuration), ask the lead.
8. **Done means evidence.** Run the project's check command in a clean state and report its real output. Never claim "green" without running it.
9. **Short, simple code.** KISS and YAGNI. Deleting code beats adding code. No dead code, no speculative features.
10. **Readable without comments.** A reviewer must understand your code from names, structure and types alone (`GEN-20` to `GEN-25`). Comments only say why.
11. **Never call the real TomTom, Valhalla or Open-Meteo services from tests, scripts or loops.** Use the fake providers. This protects the free quotas, Valhalla's fair-use limit and TomTom's terms.

## Where to look

| You need | Read |
|---|---|
| What to build | `docs/requirements.md` |
| How the system fits together | `docs/architecture.md` |
| Request and response shapes | `docs/api/openapi.yaml` |
| Risk and ranking logic | `docs/domain/risk-rules.md` |
| General code rules, definition of done | `docs/coding-standards.md` |
| Server, screen, security, speed rules | `docs/standards/backend.md`, `frontend.md`, `security.md`, `performance.md` |

## Environment

- Python 3.13 through `uv`, in `backend/.venv` (see `.python-version`).
- Node 26 through nvm (see `.nvmrc`). Project-local settings put Node 26 first on `PATH`; check that `node -v` prints v26. If it prints v20, run `. "$HOME/.nvm/nvm.sh" && nvm use` first.
- Commands: `make check` (server, front end, bundle budgets, contract, rule coverage, secret scan: the definition of done), `make e2e` (browser tests with an accessibility scan, against the rehearsal server), `make rehearsal-server` and `make rehearsal-frontend` (the whole app on synthetic data, no keys).

## Unattended running (nights and long waits)

- If the same check fails three times, stop that track, write a short note of what you tried, and wait. Never work around a failing check by loosening it.
- Never edit the contract (`docs/api/openapi.yaml`), the risk rules, any other document in `docs/`, or tool configuration. Those wait for the lead and the owner.
- Need a new dependency? Put the request (name, reason, licence) in your report. Do not install it. Installing the locked dependencies from the lock files is fine.
- Write a short progress note at every milestone in `progress/<track>.local.md` (git-ignored; the lead reads it): what is done, what is next, open questions, and the check output.
- Local commits only. Never push.

## Decisions

The lead keeps a private decision log. If you think a decision is needed, or a document is wrong, say so in your report instead of working around it.
