# Architecture

Status: APPROVED by the owner on 2026-11-11 (changes need the owner's approval). Amended during implementation with the owner's approval on 2026-11-11; see docs/changelog.md. Rule IDs: `RR-nn` risk rules, `REQ-nn` requirements, `BE/FE/SEC/PERF/GEN-nn` standards.

## 1. Purpose and scope

A server (Django REST Framework) that turns a trip request into rated routes, and a single-page app (React, Material UI, TypeScript) that shows them on a map. No database, no user accounts. All external data comes from third-party services.

## 2. System context

```
Browser (Vercel, static files)
  |  address suggestions ---------------> Photon (OpenStreetMap geocoder)   [direct from browser]
  |  map tiles -------------------------> OpenFreeMap                       [direct from browser]
  |  /api/v1/*  (JSON over HTTPS)
  v
Django server (Render)
  |-- routing provider port --> TomTom Routing (primary) | Valhalla (backup)
  |-- weather provider port --> Open-Meteo
  |-- attribution -------------> TomTom copyright service
  '-- time zone lookup (offline library)
```

The TomTom key exists only on the server. The browser never sees it.

## 3. Components and the dependency rule

Server code is layered. **Dependencies point inward only:**

```
api (views, serializers)  ->  services (orchestration)  ->  domain (pure logic)
                                   |
                                   '-> providers (ports + adapters)
```

| Layer | Responsibility | May import |
|---|---|---|
| `domain` | Risk rating, checkpoints, miles per level, route summary, ranking, route de-duplication. Pure Python, exact decimals, no Django, no network, no clock. | standard library only |
| `providers` | One interface (a `Protocol`) per external service, with adapters: routing (TomTom, Valhalla), weather (Open-Meteo), time zone. Translate provider data into domain types. | `domain` types |
| `services` | Orchestrate one request: call providers in parallel, build checkpoints, call domain, assemble the result. No HTTP, no Django objects. | `domain`, `providers` |
| `api` | Django REST Framework views and serializers. Validate input, call a service, shape output exactly as `docs/api/openapi.yaml`. Map errors to problem responses. | `services` |

Front end: `app` (shell, theme, providers) and `features/*` (trip form, route results, map, heatmap slider) over `shared` (API client, generated types, small utilities). Features do not import each other; they communicate through props and the shared store of server data.

## 4. Data flow (one trip)

1. The driver types an address. The browser asks Photon directly (after 3 characters, 300 ms pause, previous request cancelled) and the driver picks a suggestion. The browser asks the server for the origin's time zone (`GET /timezone`) so the departure picker uses it.
2. The driver submits. The browser sends **two requests at once** with the same body: `POST /trips/primary` and `POST /trips/compare`.
3. **Primary** (fast path): validate; one TomTom call (fastest, no alternatives, truck, weight); build checkpoints (RR-12 to RR-15); one batched weather call for the checkpoint and heatmap points; rate each checkpoint; summarise; return one route.
4. The browser draws the primary route with risk colours as soon as it arrives.
5. **Compare** (full result): validate; two TomTom calls in parallel (fastest with alternatives, and eco with alternatives; on long trips eco without alternatives, section 6); the server waits for the eco call only if the first returned fewer than 3 distinct routes; de-duplicate; keep up to 3 routes chosen for variety (always the fastest, then the routes that overlap least with those already kept; weather is not known yet, so "best" can only mean fastest, which would throw away the slower route around a storm); one batched weather call for all routes' checkpoint and heatmap points; rate, summarise, rank, recommend, and build the single de-duplicated heatmap.
6. The browser replaces the primary view with the full result. Routes are matched by `id` (a hash of the geometry), so the driver's selection survives. Ordering rules: a late primary response is ignored once compare has arrived; if compare fails but primary succeeded, the primary route stays and the screen says alternatives are unavailable; the compare response always wins, so if it ran in backup mode the whole view switches to backup mode (TomTom and Valhalla routes never appear side by side).
7. Heatmap data is **one list per response**, built on the server from all routes' heatmap points with duplicates removed (routes share roads near the start and end, and a heatmap adds overlapping points up, so a list per route would glow hotter on shared stretches even in calm weather). Each point carries 49 hourly risk digits (section 7). The slider only changes which hour is displayed; no network, no recomputation.

Each request is complete on its own and stores nothing afterwards.

## 5. Endpoints (full shapes in `docs/api/openapi.yaml`)

| Method and path | Purpose |
|---|---|
| `GET /api/v1/health` | Liveness for Render and the keep-warm ping. |
| `GET /api/v1/attribution` | Required credit text (TomTom copyright), fetched fresh, `no-store`. |
| `GET /api/v1/timezone?lat=&lon=` | IANA time zone of a place, for the departure picker. |
| `POST /api/v1/trips/primary` | The fast first route, rated. |
| `POST /api/v1/trips/compare` | Up to 3 routes, rated, ranked, with the recommendation. |

Errors use one problem format (RFC 9457 style). Decimals are strings (section 8). Both trip endpoints reject origins or destinations outside the lower 48 states (a simple bounding box), so a hand-made request cannot spend provider quota.

## 6. Routing strategy

- Primary route: TomTom, truck mode, vehicle weight = cargo plus 35,000 lb empty weight (converted to kg), future `departAt`, no alternatives, compressed route line, elapsed time and distance along the route.
- Alternatives: TomTom fastest with alternatives, and eco with alternatives, in parallel. Merge, drop near-duplicates (geometry overlap, not length), then keep up to 3 chosen for variety: the fastest first, then the routes that overlap least with those already kept.
- Duplicates: different provider calls draw the same road with different vertex density, so route shapes are sampled along each segment (3 samples per 0.01-degree cell) before the overlap test, and two routes with exactly equal provider distance and travel time are one route.
- Trip class: a trip is classed by the straight-line distance between origin and destination, measured before any provider call (constants in `backend/services/trip_class.py`).
  - Normal (below 1,000 miles): TomTom fastest with 2 alternatives (one attempt, 12 s read timeout) in parallel with an eco request with alternatives (also 12 s). If the fastest request fails, one single-route request (8 s, the client's normal read timeout) is tried before the backup. Trip deadline 25 s.
  - Long (1,000 miles or more): fastest with 2 alternatives (one attempt, 22 s) in parallel with an eco request without alternatives (8 s). If the alternatives request fails, ask for 1 alternative (8 s), then a single route (6 s), then the backup. Trip deadline 40 s.
  - Why: TomTom's compute time grows with route length and with the number of alternatives (its own FAQ says it cancels a request at about 30 s). Live logs showed 8 s read timeouts on 3 alternatives plus eco for trips above about 1,200 road miles, and 4.5 to 5.3 s for one alternative on a 1,340-mile trip. When only one route comes back, the screen says "Only one route could be found for this trip."
- Backup: Valhalla, used only when TomTom fails or the daily call guard trips (SEC-07). Its routes are never mixed into a TomTom comparison. The public Valhalla server refuses truck routes over 1,500 km (its error 154, seen on the live server), so the backup works only for shorter trips; a longer trip in backup mode ends in the plain "routing unavailable" message. Valhalla's public server allows about one request per second, so its adapter spaces requests at least one second apart (primary and compare may both fall back at the same moment). The response says which provider was used, and the screen shows a "backup mode" notice (REQ-12).
- ETAs come from the provider's elapsed-time table (RR-14, RR-15). TomTom returns `progress` entries (point index, elapsed seconds, distance in metres) when asked for the distance and travel-time extended representations (confirmed by a test call). The entries are sparse, so the time at a checkpoint distance is read by linear interpolation between neighbouring entries. A provider without one fills the table by distance-proportional interpolation in one place, so the rest of the code has a single path.
- The route line is passed to the browser as TomTom sent it (compressed polyline, precision 5, confirmed; no extra simplification). The response states the precision so the browser decodes any provider's line correctly.

## 7. Weather strategy

- Points: the checkpoints at the chosen spacing (RR-13) for ratings, plus a fixed heatmap grid every 25 miles (named constant) for the heatmap. Weather is fetched for the union, de-duplicated by rounding to a cell (named constant, start at 0.05 degrees). At the default spacing of 25 the two sets are the same points; at 50 the grid is denser than the checkpoints; at 10 it adds about 18 points per 880-mile route (every second grid point already coincides with a checkpoint). The heatmap is built once per response from all routes' points, de-duplicated by cell. The contract keeps heatmap points as their own list, so the density can change without breaking it.
- Window: one fixed window per cell, from the start of the current hour to 10 days ahead (a departure up to 7 days away, the 48-hour slider and a long trip all fit; the provider allows 16 days), so any trip reads the hours it needs from the same cached data (RR-29). One batched request per trip request (split into chunks of 200 locations when a trip needs more).
- Variables (10 or fewer): sustained wind, rain, showers, snowfall, plus gusts for display. Units requested as mph and inches. Rain is rain plus showers added in exact decimals (RR-02).
- Parsed straight into exact decimals; no float at any step. The cached window is parsed lazily: exact decimals are built only for the hours a request reads.
- Budget: a global weather budget (550 locations per minute, 4,500 per hour, 9,000 per day, just under the free allowance, counted for all visitors) sits in front of the provider; over budget answers weather "busy" (`backend/providers/weather/budget.py`).
- Deadline: the weather fetch has a 12 s total deadline, checked before each chunk of up to 200 locations (a chunk starts only if at least one read timeout, 5 s, remains). Cells fetched before the deadline are kept (partial data, the rest shows "No data"); if no chunk could start the weather is unavailable.
- Cache: in-memory, key = cell, value = the whole window kept as compact raw text and parsed into exact decimals only when used (240 hours of 5 values as Python decimal objects would take about 100 KB per cell, and the free server has 512 MB), time to live about one hour, size capped in cells (least recently used). Memory use and download size (a 10-day window is about 4 times a 2 to 3 day one) are measured after the first deploy. Repeat trips and the example trips then cost no provider calls. Weather only (SEC-08).
- Quota: the free allowance is 600 calls a minute, 5,000 an hour and 10,000 a day (confirmed on the provider's pricing page). A multi-location request is assumed to cost one call per location, up to 1,000 locations per request (reported by the provider's maintainer, not stated on the pricing page, so we design for it). Rough cost of an uncached 880-mile trip (primary plus compare): about 150 calls at 25-mile spacing and about 370 at 10-mile spacing, so two long trips at 10-mile spacing inside one minute would hit the per-minute limit. The limits are reported to be per IP address, and Render's free servers share outgoing addresses with other customers, so others can use up the allowance. Mitigations: the cache, a modest default spacing, and the plain error message below.
- Failure: the route is still returned with "No data" checkpoints and `weather.status` set accordingly (RR-11, RR-23). A "too many requests" reply from the weather service is its own case (`weather.status` = busy) with the plain message "Weather service busy, try again in a few minutes, or later if it stays busy", never a generic failure.

## 8. Data representation

- Measurements, miles and averages are decimal **strings** already rounded as the rules require. The browser displays them as they are.
- Times are exact instants (UTC) with an IANA time-zone name; the browser formats them with the zone abbreviation (RR-18).
- Risk digits for the heatmap: `0` to `4` for Low to No Travel, `x` for no data.

## 9. TomTom compliance design

Nothing derived from TomTom is stored: no server cache, `Cache-Control: no-store` on routing, search and attribution responses, no recorded real responses in tests (synthetic data only), no comparison figures in any public file. The copyright text is fetched through the server on each page load and kept in browser memory for the session. Credits are always reachable (REQ-13). The free key is for evaluation use; the app stays non-commercial.

## 10. Failure and resilience

| Failure | Behaviour |
|---|---|
| TomTom timeout, server error, "too many requests", or quota or key failure | Fall back to Valhalla, flag backup mode. |
| TomTom says no route exists | Not a failure: answer 422 "no route found". No backup route is tried. |
| Valhalla also fails | Problem response; the screen shows a plain message and the examples stay usable. |
| Weather unavailable | Routes returned without ratings, no recommendation (RR-23), plain message. |
| Weather service busy (too many requests) | Same as unavailable, with the message "Weather service busy, try again in a few minutes, or later if it stays busy" and a Try again button. |
| Photon down or throttled | Plain "suggestions unavailable" message; the one-click examples still work. |
| Trip cap reached (4 trips in flight) | After a 1 s wait, 429 with `Retry-After`. |
| Trip deadline exceeded (25 s, long trips 40 s) | 503 "routing unavailable". |
| Request body above 8 KB | 413 problem response, refused unread. |
| Weather budget exceeded | Weather "busy" (same screen message as a busy weather service). |
| TomTom answers only one route (alternatives timed out) | One TomTom route with the notice "Only one route could be found for this trip". |
| Render asleep | Static screen loads at once; a "waking the server" state is shown; a free scheduled ping keeps the server awake where possible. |

Every outbound call has a timeout. Retries: one retry with jitter for network errors on idempotent calls, never on 4xx.

## 11. Performance and security

Budgets and mechanisms: `docs/standards/performance.md`. Rules and checklist: `docs/standards/security.md`. Both are enforced in review and measured, not assumed.

## 12. Configuration

Server (environment variables, typed, no secret defaults): `DJANGO_SECRET_KEY`, `DJANGO_DEBUG` (false), `DJANGO_ALLOWED_HOSTS`, `ALLOWED_ORIGINS` (CORS allowlist), `TOMTOM_API_KEY`, `VALHALLA_BASE_URL`, `OPEN_METEO_BASE_URL`, throttle and guard limits. Front end: `VITE_API_BASE_URL`. Hosts and addresses are never hard-coded, so the Vercel account or domain can change by editing two settings.

## 13. Deployment

Server on Render (Python runtime, gunicorn with **exactly 1 worker process and several threads**, `PYTHON_VERSION` pinned). One process is required: the weather cache, the "identical requests share one call" rule, the daily TomTom guard (SEC-07), the rate-limit counters and Valhalla's one-per-second limiter all live in memory and must be shared. With two or more worker processes each would get its own copy and the guard and limiters would break silently. Shared state is guarded by locks, and a restart resets it. The worker count is set on the start command itself (`--workers 1 --threads N`), because gunicorn reads a `WEB_CONCURRENCY` setting from the hosting platform unless the command line overrides it, and the server logs its worker count at start-up so it can be confirmed once deployed; front end on Vercel (Node 26.x); both deploy from the GitHub repository after merge. Only the main branch is deployed; Vercel branch previews get no API access because the CORS allowlist holds the production address only. An empty app is deployed early to prove the pipeline. `NUM_PROXIES=3` on Render: the `X-Forwarded-For` chain is `<visitor>, <Cloudflare edge>, <Render internal>`, so the visitor is the third entry from the right and forged entries can only be prepended.

## 14. Repository layout and ownership

```
backend/    config/ (settings, urls)   trips/ (api layer)   services/   providers/   domain/   tests/
frontend/   src/app/   src/features/{trip-form,route-results,share-trip,map,heatmap-slider}/   src/shared/   (tests sit beside the code; browser tests are in frontend/e2e/)
docs/       requirements, architecture, standards/, domain/, api/
scripts/    checks (rule coverage), helpers
```

Parallel work is split by folder. An agent edits only its own folders:

| Track | Owns |
|---|---|
| A. Risk logic | `backend/domain/`, its tests |
| B. Providers and orchestration | `backend/providers/`, `backend/services/`, `backend/trips/`, `backend/config/`, their tests |
| C. Shell, form, theme, results, sharing | `frontend/src/app/`, `features/trip-form/`, `features/route-results/`, `features/share-trip/`, `shared/` (except `shared/api/generated/`) |
| D. Map and heatmap | `frontend/src/features/map/`, `features/heatmap-slider/` |

The contract (`docs/api/openapi.yaml`), the generated API types (`frontend/src/shared/api/generated/`, committed on purpose and kept in sync with the contract by a check that regenerates them and fails on any difference), tool configuration, CI and `docs/` belong to the lead.

## 15. Open items to verify during implementation

1. Open-Meteo quota: confirm in the first real runs how many calls a multi-location request really uses and whether limits are per outgoing address (section 7 plans for the worst case). Decides how dense the heatmap grid can be.
2. Closed: TomTom's route line is precision 5 and the `progress` entries give elapsed time and distance (confirmed by a test call).
3. Which time-zone lookup library to use (small, offline).
4. Real latency from Render to each provider; adjust the budgets after the first deploy.
5. Whether a stateless route `id` (geometry hash) is stable enough between the primary and compare calls; fallback is to match by start and end positions plus distance.
6. After the first deploy: confirm which client address the server sees behind Render's proxy (the rate-limit setting depends on it, SEC-05) and that CORS and the security headers work with the real Vercel address.

## 16. Testing summary

Pure unit tests for the domain (every rule ID cited, property tests for monotonicity), integration tests of the API with fake providers (synthetic data), contract tests against the OpenAPI file, front-end component tests with a mocked API, a handful of end-to-end tests with fakes, performance and accessibility checks, and a hand-checked correctness pass. The rule-coverage check (RR-31) runs inside the normal test command.
