# Backend Standards (Python, Django REST Framework)

Status: APPROVED by the owner on 2026-11-11 (changes need the owner's approval). Read with `docs/coding-standards.md` and `docs/architecture.md`.

| ID | Rule |
|---|---|
| BE-01 | Respect the layers: `api` -> `services` -> `domain`, `providers` beside `services` (architecture section 3). `domain` imports only the standard library. An import-boundary check in the check command fails the build on a violation. |
| BE-02 | Views are thin: parse, call one service, serialize. No business logic in views or serializers. |
| BE-03 | Each external service sits behind a `Protocol` in `providers`. Adapters translate provider data into domain types; provider JSON never reaches `domain` or `api`. |
| BE-04 | Numbers: parse provider JSON with exact decimals (`json.loads(text, parse_float=Decimal)`), no floats in `domain`, quantize once with `ROUND_HALF_UP` (`RR-02`). Distances in metres, exact (`RR-30`). |
| BE-05 | Full typing, strict static checking. Domain values are frozen dataclasses with slots. No `Any` leaking across layers. |
| BE-06 | Validate every request in DRF serializers using the limits in `RR-29` and a lower-48-states bounding box for places (named constants). Reject unknown fields. Responses are built from the contract's shapes. |
| BE-07 | Errors: domain and provider exceptions are mapped to problem responses in one handler. No bare `except`. No stack traces or provider messages to clients. A provider's "no route" answer becomes the 422 no-route response, never a fallback; only timeouts, server errors, "too many requests" and quota or key failures trigger the backup provider. |
| BE-08 | One pooled HTTP client per provider, explicit connect and read timeouts on every call, the retry policy of architecture section 10, a generic `User-Agent` with no personal information. The Valhalla adapter spaces its requests at least 1 second apart (a small limiter) because the public server allows about one request per second. A "too many requests" reply from the weather service is its own case with its own plain message. |
| BE-09 | Parallel provider calls use a bounded thread pool. The server runs gunicorn with **exactly 1 worker process and several threads** (settings documented in the README), because the weather cache, the daily provider guard, the rate-limit counters and the Valhalla limiter live in memory and must be shared; two or more workers would give each its own copy and break them silently. Shared state is guarded by locks and is reset by a restart. Set the worker count on the start command itself (`--workers 1 --threads N`, because the platform may set `WEB_CONCURRENCY`) and log it at start-up. No async code unless a measurement justifies it. |
| BE-10 | Time: all datetimes are timezone-aware UTC. The clock is injected, never read inside `domain`. |
| BE-11 | Settings come from typed environment variables. Missing required values stop the server at start-up. No secret defaults. `DEBUG` is off unless set. |
| BE-12 | Logging: structured, one request id, no secrets, no request bodies, no precise coordinates (rounded cell at most). No `print`. |
| BE-13 | Caching: the weather cache only (`SEC-08`): key = rounded cell, value = the whole fetched window stored as compact raw text and parsed into exact decimals only when used, time to live about an hour, size capped in cells (least recently used); memory is measured after the first deploy. TomTom results are never cached or stored. Routing, search and attribution responses send `Cache-Control: no-store`. |
| BE-14 | No database models. Django's built-in tables only if the framework requires them. |
| BE-15 | Tests: `pytest`; domain tests cite rule IDs and include property tests (a worse reading never lowers a rating; a heavier load never lowers a rating); API tests use fake providers with synthetic data (never recorded TomTom responses); contract tests check responses against `docs/api/openapi.yaml`. The rule-coverage check (`RR-31`) is part of `make check`. |
| BE-16 | Tooling (lead-owned configuration): `ruff` for lint and format with security (`S`), datetime (`DTZ`), Django (`DJ`), simplification (`SIM`), performance (`PERF`), print (`T20`), boolean-trap (`FBT`) and complexity (`PLR`, `C90`) rule sets, strict `mypy`, the import-boundary check. `pip-audit` runs in CI or by hand before release, not in the local check (it needs the network and fails whenever a new advisory appears). Zero warnings. |
| BE-17 | Behind Render's proxy the client address comes from the `X-Forwarded-For` header (`NUM_PROXIES` set to the real number of proxies, verified after the first deploy) and HTTPS is detected through the proxy header. Otherwise every visitor shares one throttle bucket. |

## Structure

```
backend/
  config/    settings, urls, wsgi
  trips/     api layer: views, serializers, urls
  services/  one module per use case (primary trip, compare trip)
  providers/ routing/ (port, tomtom, valhalla)  weather/ (port, open_meteo)  timezone/
  domain/    constants, levels, rating, checkpoints, miles, summary, ranking, dedupe
  tests/     mirrors the source folders
```
