# Changes since approval

These documents were approved before implementation began. Where building and testing taught us something, the document was amended with the owner's approval on 2026-11-11 and the reason is recorded here. No risk rule (RR-01 to RR-31), band, threshold or number was changed; only assumptions the code had to make were written down.

One proposed change is deliberately not applied yet: adding a `worst_level_by_hour` field to the heatmap schema so the "Heatmap now: worst X" line is computed on the server instead of read from the server's risk digits in the browser (decision pending; see "Pending" at the end).

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

## Pending

- Heatmap `worst_level_by_hour`: not applied. Proposed so that every rating stays on the server (GEN-03); until decided, the browser takes the highest risk digit of the server's strings for the current hour (display only).
