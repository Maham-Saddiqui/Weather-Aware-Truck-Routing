# Changes since approval

These documents were approved before implementation began. Where building and testing taught us something, the document was amended with the owner's approval on 2026-11-11 and the reason is recorded here. No risk rule (RR-01 to RR-31), band, threshold or number was changed; only assumptions the code had to make were written down.

A later batch (the heatmap `worst_level_by_hour` field) is listed at the end.

## docs/architecture.md

| Date | Section | What changed | Why (evidence) | Code |
|---|---|---|---|---|
| 2026-11-11 | 6 Routing strategy | Trips are classed by straight-line distance (below or at/above 1,000 miles). Normal: 2 alternatives, 12 s, one attempt, 25 s deadline. Long: 2 alternatives (22 s) plus an eco request without alternatives, stepped fallback (1 alternative, single route, backup), 40 s deadline. | A live comparison of Seattle to Miami and Dallas to New York failed after about 17 s: the server log showed TomTom read timeouts of about 8.1 s on both alternatives requests (3 alternatives plus eco), while one alternative on a 1,340-mile trip answered in 4.5 to 5.3 s. TomTom's own FAQ says compute time grows with route length and requests are cancelled at about 30 s. | `backend/services/trip_class.py`, `routing_choice.py`, `trip_runner.py` |
| 2026-11-11 | 6 Routing strategy | Route duplicates: shapes are sampled along segments and equal provider distance and travel time means the same route. | A live Seattle to Miami comparison returned two identical 3,556.3-mile routes from different TomTom calls with different vertex density. | `backend/domain/dedupe.py` |
| 2026-11-11 | 6 Backup | The public Valhalla server refuses truck routes over 1,500 km (error 154), so the backup only works for shorter trips. | One manual call against the public server returned HTTP 400 with error code 154. | `backend/providers/routing/valhalla.py` |
| 2026-11-11 | 7 Weather | Global weather budget; weather fetch chunks of 200 locations with a 12 s deadline checked before each chunk and partial results kept; exact decimals built lazily for the hours read. | Security and speed review: one trip expanded every cell to 240 hours of decimals (about 125 MB for a coast-to-coast trip) and nothing limited the quota use. A reviewer measured 9.4 MB for 1,000 cells after the lazy parse. | `backend/providers/weather/budget.py`, `open_meteo.py`, `series.py` |
| 2026-11-11 | 10 Failure table | Rows for the trip cap, trip deadline, oversized body, weather budget and the single-route notice. | These protections were added after review and each has its own plain behaviour. | `services/trip_runner.py`, `trips/body_limit.py` |
| 2026-11-11 | 13 Deployment | `NUM_PROXIES=3` on Render. | A diagnostic log showed Render's chain is `<visitor>, <Cloudflare edge>, <Render internal>`; with 1 the server counted visitors under Render's changing internal address. After the change, 90 requests with forged addresses were cut off at about 60. | `render.yaml`, `config/settings.py` |

## docs/standards/backend.md

| Date | Section | What changed | Why | Code |
|---|---|---|---|---|
| 2026-11-11 | Structure | The domain module list (the listed `miles` module never existed). | Review finding: the document listed a module the code does not have. | `backend/domain/` |
| 2026-11-11 | BE-09 | The trip runner and weather budget are shared in-memory items. | They live in memory and need the single process like the others. | `trip_runner.py`, `budget.py` |
| 2026-11-11 | BE-12 | Structured logging contract: one summary line per trip, one line per provider failure, fixed-name events, request id exposed to the browser, no provider URLs. | A reported failure could not be diagnosed from the logs alone (a 503 hid whether TomTom timed out); the new lines found the long-trip cause in minutes. | `config/request_logging.py`, `trips/trip_summary.py`, `providers/provider_call.py` |
| 2026-11-11 | BE-17 | Production value `NUM_PROXIES=3`. | See architecture section 13. | `render.yaml` |

## docs/standards/performance.md

| Date | Section | What changed | Why | Code |
|---|---|---|---|---|
| 2026-11-11 | 1 Budgets | Map chunk budget 300 KB to 350 KB; note on the shell size. | MapLibre alone is about 299 KB gzip (measured 298.84 KB) and its worker about 147 KB; it cannot be reduced without dropping the library. The eager shell was brought to about 193 KB. | `frontend/src/features/map/` |
| 2026-11-11 | 1a Measured | Timings measured on the live free instance. | The standard said budgets are adjusted with measurements after the first deploy. | live runs |

## docs/standards/frontend.md

| Date | Section | What changed | Why | Code |
|---|---|---|---|---|
| 2026-11-11 | FE-09 | Records that MapLibre's own heatmap layer failed the colour-shows-risk rule and that one layer of blurred circles is used. | The throw-away experiment (PERF-10) rendered 60 packed Moderate points as No Travel purple and a lone No Travel point as yellow. | `features/map/HeatmapLayer.tsx` |

## docs/requirements.md

| Date | Section | What changed | Why | Code |
|---|---|---|---|---|
| 2026-11-11 | REQ-02 | Suggestions show the kind of place. | A live test routed "New York" to the centre of New York State instead of the city. | `features/trip-form/placeLabel.ts` |
| 2026-11-11 | REQ-03 | Long trips get more time and fewer alternatives per request; the screen says when only one or two routes exist. | See architecture section 6. | `services/trip_class.py` |
| 2026-11-11 | REQ-16 (new) | A share/copy link control. | The trip was in the address bar (REQ-14) but nothing on the screen let a driver share it. | `features/share-trip/` |

## docs/domain/risk-rules.md

| Date | Section | What changed | Why |
|---|---|---|---|
| 2026-11-11 | 13 Assumptions | Assumptions 13 to 20 added (no rule text changed). | An independent checker derived 199 expected answers from the rules alone and the code matched all of them; the places where the rules are silent and the code made a choice are written down here and confirmed by the owner. |

## docs/api/openapi.yaml

| Date | Section | What changed | Why | Code |
|---|---|---|---|---|
| 2026-11-11 | trip endpoints, components | 413 and 415 problem responses and the `X-Request-ID` response header. | The server refuses bodies above 8 KB and non-JSON bodies, and returns a request id on every response so a visitor can quote it. | `trips/body_limit.py`, `config/request_logging.py` |

## Deviations recorded after the standards audit (2026-11-11)

An independent audit checked every rule against the code (139 rows). Where the code or tooling deliberately differs from a document, the reason is recorded here; items still to be done are marked.

| Document / rule | What differs | Why it is accepted | Status |
|---|---|---|---|
| SEC-01 (gitleaks) | The check uses a small in-house scanner (`scripts/secret_scan.py`: key-like assignments in the tree and history, plus any value from a local `.env`); gitleaks also runs in CI as a report-only step. | No tool installation is allowed for the build agents, and the in-house scanner also checks the owner's local `.env` values, which gitleaks cannot know. | accepted |
| NFR-06 (no hard-coded addresses) | The API host appears in the `connect-src` of `frontend/vercel.json` and as the default of the keep-warm workflow. | A Content-Security-Policy header cannot read environment variables; naming one host is safer than allowing every `onrender.com` host. The keep-warm default can be overridden by the repository variable `API_HEALTH_URL`. Documented in the README. | accepted |
| SEC-04 (only the production front-end address) | `render.yaml` allows two origins: the short and the long Vercel address of the same project. | They are two aliases of the one production deployment. | accepted |
| FE-08, PERF-07 (no React re-render per slider tick) | The forecast hour is held in React state (`app/MapWithSlider.tsx`), so the map pane, status line and slider re-render per tick; the heatmap colour itself changes through the map API, the form and results are isolated from the tick (tested), and the routes are not redrawn. | Measured on the live site by an independent assessor on 2026-11-11: Play ran at about 60 frames per second with a 99th-percentile frame gap of 19 ms and no gap over 34 ms; dragging the slider, panning and zooming were equally smooth. The re-render per tick is real but costs less than one frame, so the budget holds. | measured, accepted; the slider hour is still held in React state by design |
| FE-13, FE-07, NFR-03 (end-to-end tests, automated accessibility scan) | Done: Playwright browser tests run against the built app and the rehearsal server (synthetic data, no network) with an axe accessibility scan on the first screen and the results; `make e2e` locally and a separate `e2e` job in CI so a browser flake cannot hide the main check. | The owner approved the three developer-only packages on 2026-11-11 and installed them. | done |
| GEN-15 (coverage floors) | Enforced on both sides since 2026-11-11. Server: 85 percent overall, 100 percent branch on the risk rules (measured 99 and 100). Front end: floors of 90 percent statements, lines and functions and 85 percent branches, enforced by `npm run check` (measured 97, 97, 97 and 91); the standard's 80 percent is the minimum, these are stricter. | The front-end coverage tool is a developer-only package the owner approved. | done |
| PERF-09 (bundle-size check in the check command) | Added: `scripts/check_bundle_size.py` builds the front end and fails past 200 KB (first load) or 350 KB (map chunk), gzip. | Closes the audit finding. | done |
| GEN-03 (rules duplicated in the browser) | The "How risk works" dialog repeats the band edges and limits by hand. | It is explanatory text; a test cites RR-03 to RR-08 and RR-22 to RR-24 against its numbers. A test tying it to the server constants is still to be written. | to do |

## Developer-only packages added (owner approved and installed, 2026-11-11)

None of these reaches visitors; they run in the check, in CI or on a developer's machine.

| Package | Reason | Licence |
|---|---|---|
| `@vitest/coverage-v8` | Measures front-end coverage so the floors in GEN-15 are enforced. | MIT |
| `@playwright/test` | Drives a real browser through the built app for the end-to-end tests (FE-13). | Apache-2.0 |
| `@axe-core/playwright` | Automated accessibility scan inside those tests (NFR-03, FE-07). | MPL-2.0 (unmodified, dev only) |

`npm audit --omit=dev` reports 0 vulnerabilities in what ships. `npm audit` for the whole tree reports 7 moderate findings, all in the developer-only lint chain (`minimatch` inside `typescript-eslint`), none in shipped code.

## Documents brought in line with the final code (2026-11-11)

An independent read of the documents against the code found places where a document described the solution as it was first designed and the code had moved on to a better solution. The rule applied: a change in how the solution works updates the document and is recorded here; a change that would loosen a coding, quality, security or performance standard is discussed with the owner first and is not listed here.

| Document | What changed | Why | Code |
|---|---|---|---|
| `README.md`, "Run it locally" | The recipe for the real providers now sets the secret key, debug, hosts and origins and starts the server with `uv run --env-file ../.env`. | The server never read `.env` by itself, and `.env.example` leaves the required values empty, so the old recipe stopped at start-up. | `backend/config/settings.py`, `backend/config/startup.py` |
| `README.md` | `make check` line lists coverage floors and bundle budgets; `make e2e` added; a paragraph on required and optional environment variables; the slider sentence says what updates per tick; the code tour lists the panel layout, the share control, the long-trip code and the start-up check. | The check grew (coverage floors, bundle budgets, browser tests) and the slider now also updates the status line, the truck pin and the checkpoint dots. | `Makefile`, `frontend/src/app/`, `backend/config/startup.py` |
| `docs/standards/performance.md`, section 1 | Measured sizes: shell about 198 KB (197.9 KB), map library about 294 KB, whole map chunk about 319 KB. | Numbers measured after the final front-end round. | `scripts/check_bundle_size.py` |
| `docs/architecture.md` | Busy-weather message and Try again button; the front-end layout line and the ownership table include `share-trip`; the compare step says long trips ask for eco without alternatives. | The wording was changed after a real rate-limit stall; the share control and the long-trip handling were added during the build. | `frontend/src/features/route-results/`, `frontend/src/features/share-trip/`, `backend/services/routing_choice.py` |
| `docs/standards/frontend.md`, `docs/standards/backend.md` | Structure lists include `share-trip/` and the start-up, request-logging and container modules of `config/`. | Modules added during the build. | `frontend/src/features/share-trip/`, `backend/config/` |
| `docs/api/openapi.yaml` (description only) | The busy-weather description says "a few minutes"; generated types regenerated. | Same wording change as the screen. | `frontend/src/features/route-results/ResultNotices.tsx` |
| `CLAUDE.md` | The commands line lists `make check`, `make e2e` and the two rehearsal commands. | The scaffolding now defines them. | `Makefile` |

## Standards audit follow-ups done (2026-11-11)

| Rule | What was done | Why it looks different from the document | Code |
|---|---|---|---|
| BE-11 | With DEBUG off, a missing or empty `DJANGO_ALLOWED_HOSTS` or `ALLOWED_ORIGINS` stops the server at start-up with "Missing required environment variable: NAME". | The check runs when the web application loads (`config/wsgi.py` calling `config/startup.py`), not while `settings.py` is read, because the type checker's Django plugin imports the settings with DEBUG off and a required-variable error there crashed it. The behaviour a deployment sees is the same: the server does not start. | `backend/config/startup.py`, `backend/config/wsgi.py` |
| GEN-23 | The long-trip fallback steps (two alternatives, one, none) are a closed `StrEnum` instead of loose strings; logged values are unchanged. | Wrong states can no longer be written. | `backend/providers/trip_notes.py`, `backend/services/routing_choice.py` |
| GEN-04 | The three backend test files over 300 lines were split by topic; the test count did not drop (811 collected, 4 of them new). | Keeps files short and focused. | `backend/tests/` |
| SEC (dependencies) | The server's production dependencies were scanned with pip-audit on 2026-11-11: "No known vulnerabilities found". The CI job repeats this as a report-only step. | Recorded for the audit trail. | `.github/workflows/ci.yml` |

## Applied after the first batch (owner approved on 2026-11-11)

| Date | Section | What changed | Why | Code |
|---|---|---|---|---|
| 2026-11-11 | openapi `RouteSummary` | New required string `travel_time_text` ("14 h 4 min"). | The standards audit found the browser converting and rounding travel time to minutes (CLAUDE.md rule 4, FE-05). The server already rounds travel time to whole minutes half up (RR-25), so it now also sends the display text. | `backend/domain/units.py`, `backend/trips/presenters.py`, `frontend/src/features/route-results/RouteStats.tsx` |
| 2026-11-11 | risk-rules RR-26 (wording only) | The recommendation sentence names the routes and uses hours and minutes, for example "Route 1 is quicker: 14 h 4 min against 16 h 32 min for Route 2", instead of "844 against 992 minutes". The rule is unchanged: one plain sentence naming the first criterion that separated the winner. | A UX review found the sentence in minutes above route cards in hours; the reader had to convert. | `backend/domain/ranking.py` |
| 2026-11-11 | frontend FE-09 (wording) | Low risk is drawn as a very faint green (about 12 percent) instead of nothing, so the corridor is visible on an all-clear trip; the legend says so. Still "near-transparent so only risky stretches glow". | On a calm day every test trip looked like a plain dark map and the heatmap, the headline feature, seemed absent. | `frontend/src/features/map/heatmapPaint.ts` |

## Applied after the owner's second round of decisions (2026-11-11)

| Date | Section | What changed | Why | Code |
|---|---|---|---|---|
| 2026-11-11 | openapi `RouteSummary` | New required nullable string `travel_time_difference_text` ("3 h 1 min quicker than Route 1", "2 h 31 min slower than Route 1", "Same travel time as Route 1"; null for the first route). Made on the server from the two whole-minute travel times (RR-25). | A live Seattle to Salt Lake City trip showed Route 3 (12 h 5 min) faster than the recommended Route 1 (15 h 6 min) with no explanation on the cards; the UX re-review also listed the missing "x slower" line. The owner approved it on 2026-11-11. | `backend/domain/units.py`, `backend/trips/presenters.py`, `frontend/src/features/route-results/RouteStats.tsx` |

## Applied after the first batch

| Date | Section | What changed | Why | Code |
|---|---|---|---|---|
| 2026-11-11 | openapi `Heatmap` | New required string `worst_level_by_hour` (one character per hour: the highest risk digit over all points, or x). | The status line under the map ("All clear along these routes at this time" / "Worst along these routes: High") was computed in the browser from the server's risk digits. It only read server strings, but a derived aggregate belongs on the server (GEN-03), and the line is the text equivalent of the heatmap. | `backend/domain/heatmap.py`, `backend/trips/presenters.py`, `frontend/src/features/map/` |
