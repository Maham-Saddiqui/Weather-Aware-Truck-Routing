# Coding Standards (all code)

Status: APPROVED by the owner on 2026-11-11 (changes need the owner's approval). Area rules: `docs/standards/backend.md`, `frontend.md`, `security.md`, `performance.md`. What tools enforce is in their configuration files, not repeated here; this page holds the judgement rules and the process. Rule IDs are stable.

## 1. Principles

Correct first. Simple over clever (KISS). Build only what a requirement needs (YAGNI). Short code that does the same job beats long code. When unsure, delete.

## 2. Rules

| ID | Rule |
|---|---|
| GEN-01 | Every piece of code serves a requirement (`REQ-nn`) or a standards rule. If it does not, delete it. |
| GEN-02 | No abstraction before the third real use. Exception: the provider ports in the architecture, because a real second implementation exists. |
| GEN-03 | A business rule exists exactly once, in `domain`. The front end never re-implements ratings, ranking or rounding. |
| GEN-04 | Functions do one thing. Target 20 lines or fewer, hard limit 40. Cyclomatic complexity 10 or less, nesting 3 or less, 4 parameters or fewer (otherwise one typed object). Files 300 lines or fewer, components 150 or fewer. |
| GEN-05 | Names say what, not how. Full words. Units in names of quantities (`distance_m`, `wind_mph`). Booleans read as questions (`is_eligible`). |
| GEN-06 | Comments explain why, never what. Code that implements a rule names its ID (`RR-nn`). |
| GEN-07 | No magic numbers. Named constants in one place per half (`backend/domain/constants.py`, `frontend/src/shared/constants.ts`), each with its unit and reason. |
| GEN-08 | No dead code, no commented-out code, no `TODO` in committed code. |
| GEN-09 | Fail loudly at boundaries, never swallow errors, catch only what you handle. Messages say what happened and what to do next. Anything a user can see is plain English. |
| GEN-10 | Immutable by default. No shared mutable state, except the in-memory items listed in `BE-09` (weather cache, daily provider guard, rate-limit counters, Valhalla limiter), each guarded by a lock. |
| GEN-11 | Types everywhere. No `any`, no untyped function definitions. |
| GEN-12 | A new dependency needs a stated reason, a permissive licence and the lead's approval. Prefer the standard library. Pin versions. |
| GEN-13 | Domain numbers use exact arithmetic (`RR-02`, `RR-30`). Never binary floats for ratings, distances or comparisons. |
| GEN-14 | Every behaviour change ships with a test. Test names state behaviour and cite `RR-nn` or `REQ-nn`. No network in tests: never call the real TomTom, Valhalla or Open-Meteo from tests, scripts or loops (use the fakes). Tests are deterministic (inject the clock). |
| GEN-15 | Coverage floors: `domain` 100% branch, backend 85%, front-end logic 80%. Floors are a safety net, not a goal. |
| GEN-16 | Git: one idea per commit; subject up to 72 characters, imperative; body says why; ends with the `Co-Authored-By` line. Branch `track/<name>`. Never commit secrets or build output, nor generated files, except the generated API types in `frontend/src/shared/api/generated/`, which are committed on purpose: the check command regenerates them from the contract and fails if they differ. |
| GEN-17 | Style is decided by the formatter and linter configuration, never by debate. Config files are lead-owned (GEN-19). |
| GEN-18 | When behaviour or a rule changes, the matching document changes in the same commit. Code and documents never disagree. |
| GEN-19 | No rule may be loosened, disabled or bypassed (`eslint-disable`, `noqa`, `type: ignore`, test skips) without a written reason approved by the lead. |
| GEN-20 | **Readable with the comments removed.** A reviewer must understand what code does from names, structure and types alone. Comments only add the why. If code needs a comment to be understood, rename it or split it instead. |
| GEN-21 | One level of detail per function, and files read top-down: public entry points first, helpers below. A function reads like a short story of named steps (`rate_checkpoint` calls `rate_wind`, `rate_rain` and `rate_snow`, then takes the worst). |
| GEN-22 | Use the domain's own words exactly as in `docs/domain/risk-rules.md`: checkpoint, driving factor, covered miles, no data, eligible, least-bad. One name per concept, no synonyms, no abbreviations. |
| GEN-23 | Make wrong states impossible to express: enums or literal types for levels and statuses, small typed values instead of loose strings and numbers, no boolean flag parameters (split into two functions), early returns instead of deep nesting, no nested ternaries, no chained one-liners that need decoding. |
| GEN-24 | Tests are the examples: a test name is a sentence about behaviour ("wind of 45 mph with a 30,001 lb load is No Travel"), arranged as setup, action, check, with examples taken from the worked examples in the risk rules. |
| GEN-25 | The README has a short code tour: where to start reading and the dozen files that matter, in reading order, so a reviewer finds the core in minutes. No per-folder READMEs. |

## 3. Definition of done (every change)

1. Meets the requirement and cites it.
2. Tests written and passing; rule IDs cited where relevant.
3. The project check command passes with zero warnings, run in a clean state, output reported.
4. No new dependency, magic number, dead code or duplicated rule.
5. Relevant documents updated.
6. Reviewed (section 4) with no open must-fix finding.

## 4. Review protocol

Two independent reviewers, each with its own checklist, and they do not comment on what a tool already catches.

1. **Quality reviewer:** correctness against `RR-nn` and `REQ-nn`; simplicity (could it be shorter?); naming; test meaning (would the test fail if the code were wrong?); layering; duplication; and the **comment-free read** (`GEN-20`): read the diff ignoring every comment. Anything still confusing gets renamed or split, not explained with a comment.
2. **Speed and security reviewer:** `docs/standards/performance.md` budgets and `docs/standards/security.md` checklist; provider terms; secrets; input validation.

Findings are listed by severity (must-fix, should-fix, note) with file, line and a concrete fix. The author fixes, then the reviewer re-checks. Repeat until no must-fix remains. Several rounds are expected. Cadence for the 24-hour build: each reviewer runs at every track milestone and once more on the integrated system, not on every commit; the automatic checks run on every change.

## 5. Agent protocol

Work only in your owned folders and your own branch. Ask the lead before touching the contract, shared types, tool configuration or another track's files. Report: what changed, the check command output, open questions. Do not claim success without evidence. Never push, merge or rebase.
