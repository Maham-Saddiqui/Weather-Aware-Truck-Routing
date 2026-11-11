# Weather-Aware Truck Routing

[![ci](https://github.com/Maham-Saddiqui/Weather-Aware-Truck-Routing/actions/workflows/ci.yml/badge.svg)](https://github.com/Maham-Saddiqui/Weather-Aware-Truck-Routing/actions/workflows/ci.yml)

A truck driver enters an origin, a destination, a departure time and a cargo weight. The app returns up to three truck routes, rates the weather at checkpoints along each route **at the time the truck will be there**, recommends the safest route in one plain sentence, and shows everything on a map with a corridor heatmap and a 0 to 48 hour forecast slider.

- Live app: https://maham-spotter.vercel.app (the server sleeps when idle, so the first request can take up to a minute)
- Four one-click example trips fill the form; everything works from them alone.

## How risk is calculated

The single source of truth is [`docs/domain/risk-rules.md`](docs/domain/risk-rules.md) (rules `RR-01` to `RR-31`). Every rule is cited by at least one automated test, and the build fails if a rule loses its test.

| Measurement | Low | Moderate | High | Severe | No Travel |
|---|---|---|---|---|---|
| Wind (mph) | below 25 | 25 to 34 | 35 to 44 | 45 to 54 | 55 or more |
| Rain (in/hr) | below 0.10 | 0.10 to below 0.25 | 0.25 to below 0.50 | 0.50 to 1.00 | above 1.00 |
| Snow (in/hr) | below 0.5 | 0.5 to below 1.0 | 1.0 to below 2.0 | 2.0 to 3.0 | above 3.0 |

- **Load only affects wind:** wind of 45 to 54 mph with a load over 30,000 lb is No Travel; wind of 35 to 44 mph with a load over 40,000 lb is Severe.
- A checkpoint's rating is the worst of its wind, rain and snow ratings. Missing readings never count as safe: a checkpoint is "No data" unless the readings present already reach No Travel.
- Checkpoints sit at 0 miles, every 10, 25 or 50 miles (the driver's choice), and at the destination. Each checkpoint covers the stretch of road from halfway back to halfway forward, so the covered stretches add up exactly to the route length.
- **Which weather hour:** wind uses the nearest hour to the truck's arrival; rain and snow use the hour that contains the arrival.
- **Recommendation:** a route with any No Travel checkpoint, or with more than 10% of its miles lacking weather data, is not eligible. Eligible routes are ranked by fewest Severe miles, fewest High miles, lowest average risk, then shortest travel time. If none is eligible the app says so, shows the least-bad route greyed out, and suggests leaving later.
- Numbers are exact decimals, rounded once on the server (halves round up). The browser shows the server's strings and never rounds, ranks or rates anything.

## Assumptions

- Cargo weight is what the driver types; the routing provider is sent cargo plus an assumed 35,000 lb empty tractor-trailer.
- Sustained wind decides the rating; gusts are shown for information only.
- ETAs are **driving time only**: no rest breaks or hours-of-service rules.
- The departure time is read in the origin's time zone; every time shown carries its zone.
- Changing the checkpoint spacing can change which route wins, because the miles per level are measured at the checkpoints.
- Trips are limited to the lower 48 states, a departure within 7 days, and a load of 0 to 80,000 lb. The limits keep a hand-made request from spending the free provider quotas.
- Per-level miles are each rounded once to 0.1 mile, so they can differ from the total in the last digit.

### Where the brief can be read two ways, and what we chose

Each choice is a numbered rule in [`docs/domain/risk-rules.md`](docs/domain/risk-rules.md) with tests, so it can be changed in one place.

| The brief says | Other reading | What the app does | Effect |
|---|---|---|---|
| Wind "below 25 mph" is Low, and rain and snow have limits to two decimals or fewer | Compare the raw reading, for example 24.6 mph | Rounds each reading **once, on the server, to the precision shown on screen** (wind to a whole mph, rain and snow to 2 decimals; halves round up), then rates the rounded number (`RR-02`) | The number on screen and its rating can never disagree. A reading within half a unit below a limit rates one level higher (wind 24.6 mph shows as 25 and is Moderate). Rain just above 1.00 (up to 1.004) or snow just above 3.0 (up to 3.004) rounds back into the band below, the one case that is less cautious. At whole-number values the two readings agree. |
| Bands that touch, such as 0.25 in/hr in both "0.10 to 0.25" and "0.25 to 0.50" | Either band | The higher (more cautious) band applies, so 0.25 is High and 1.00 is Severe (`RR-03` to `RR-05`) | Exactly on a limit is never rated safer than the table suggests. |
| Weather "at the truck's ETA" | Any of the hourly values near the arrival | Wind uses the hour nearest to the arrival; rain and snow use the hour that contains it, because the service reports those as totals over the hour (`RR-17`) | Each checkpoint reads the forecast for the moment the truck is there, not for the departure. |
| Load weight | Add the empty truck | The wind rules use the cargo weight the driver types; the routing provider is told cargo plus an assumed 35,000 lb tractor-trailer (`RR-06` to `RR-08`, and the definitions in section 2 of the rules) | The load thresholds are applied to the cargo figures as the brief states them. |
| "Recommend the best route" by fewest Severe miles, fewest High miles, lowest average risk, shortest time | Rank every route | A route with any No Travel checkpoint, or with more than 10% of its miles lacking weather data, is **not eligible**; the rest are ranked in the brief's order (`RR-22`). If none is eligible the app says so and shows the least-bad route greyed out (`RR-23`) | Missing data is never treated as safe, and a route cannot win by having gaps in its forecast. |
| A tie in the ranking | Any tie-break | Miles are compared to 0.1, average risk to 0.01 and travel time to whole minutes; then the shorter distance wins, then the order the routing provider returned (`RR-25`) | Rounding noise cannot decide a close call. Two routes within the same whole minute are a tie on time. |
| The departure date and time | Browser time or UTC | Read in the origin's time zone; every time on screen carries its zone letters (`RR-18`) | A driver in Seattle planning a trip to Salt Lake City sees the departure in Pacific time and the arrival in Mountain time. |

## How it is built

```
Browser (React, Material UI, TypeScript, Vite)  ->  Django REST Framework server  ->  routing, weather, time-zone providers
```

- **Server layers** (dependencies point inward, enforced by an import check): `trips` (HTTP, validation) -> `services` (one use case per request) -> `providers` (ports and adapters) -> `domain` (pure rules, exact decimals, no I/O).
- **Providers:** TomTom Routing for truck routes (the key lives only on the server); Valhalla as a backup routing service, used only when TomTom times out, errors, rate-limits or the daily call guard trips (never mixed into one comparison); Open-Meteo for weather; an offline library for time zones; OpenFreeMap for map tiles; Photon for address suggestions.
- **Two requests at once:** the browser asks for the fast first route and the full comparison in parallel, so the first route appears while alternatives are still being rated.
- **One heatmap per response**, built on the server from all routes' points with duplicates removed. Each point carries 49 hourly risk digits, so the slider only changes which hour is drawn: no network and no re-rendering per tick.
- **Why not MapLibre's built-in heatmap layer:** its colour follows how densely points are packed, so a crowd of Moderate points looked worse than a lone Severe one. The app uses one layer of soft circles whose colour is the risk level itself.
- **No database, no accounts.** Each request is complete on its own. The only server state is a small in-memory weather cache, the rate-limit counters and the daily provider guard, which is why the server runs exactly one process with several threads.

## Code tour (reading order)

1. [`docs/domain/risk-rules.md`](docs/domain/risk-rules.md): the rules everything else follows.
2. `backend/domain/rating.py`, `checkpoints.py`, `summary.py`, `ranking.py`: weather to rating, checkpoints and miles, route summary, ranking and recommendation.
3. `backend/domain/dedupe.py`, `heatmap.py`: choosing three distinct routes, and the heatmap digits.
4. `backend/services/trip_rating.py`, `primary_trip.py`, `compare_trip.py`, `routing_choice.py`: one request from start to finish, including the backup rule.
5. `backend/providers/routing/tomtom.py`, `valhalla.py`, `providers/weather/open_meteo.py`, `cache.py`: the adapters.
6. `backend/trips/views.py`, `serializers.py`, `presenters.py`, `problems.py`: the HTTP layer; [`docs/api/openapi.yaml`](docs/api/openapi.yaml) is the contract, and the front-end types are generated from it.
7. `frontend/src/app/useTripPlanner.ts` and `features/route-results/tripResults.ts`: how the two parallel requests are combined.
8. `frontend/src/features/map/` and `features/heatmap-slider/`: the map, the heatmap layer and the slider.
9. `frontend/src/features/trip-form/`, `features/route-results/`: the form and the results.
10. [`docs/architecture.md`](docs/architecture.md) and `docs/standards/`: the design and the coding standards the code is held to.

## Growing the system

The server is a deliberate modular monolith: one process, because the weather cache, the daily provider counter, the rate limits and the backup router's limiter live in memory and must be shared. The layer boundaries are already the cut lines if it ever has to be split: the risk rules in `backend/domain/` are pure and could become a shared library, and each outside service sits behind a small interface in `backend/providers/*/port.py`, so it could move behind its own service by replacing the code behind that interface with a network call. The first candidates would be a weather service (cache and budget together), then a routing gateway (TomTom, Valhalla and the daily counter). The shared in-memory state would have to move to a shared store first, and every in-process call that becomes a network call needs timeouts, retries and request-id propagation. Splitting before there is a scaling or ownership reason would make each trip slower and the free hosting insufficient, so it is deferred on purpose.

## Very long trips

Routing providers do more work the longer a route is, and asking for alternatives adds more. TomTom's documentation says computing time depends mostly on route length and that any request is cancelled after an internal limit of about 30 seconds. In testing, a 1,000-mile trip returned three routes in about 6 seconds, but trips of about 1,500 miles and more timed out when alternatives were requested. This is a limit of the routing provider's computation, not of our server, so a faster server would not change it.

The server therefore adapts to the trip's size, which it measures before calling anyone from the straight-line distance between the two places (the cut-off is 1,000 straight-line miles, roughly 1,200 road miles):

- **Normal trips:** ask for two alternatives (and an economy route in parallel) and wait up to about 12 seconds.
- **Long trips:** ask for two alternatives and wait up to about 22 seconds, with a separate economy route requested in parallel, and allow the whole request up to 40 seconds. Live, a 1,570-mile and a 3,300-mile trip each returned three distinct routes.
- **If alternatives still do not arrive:** a long trip steps down to one alternative, then to a single route without alternatives (shown with the note "Only one route could be found for this trip"). The backup router is tried only after that, and only works for shorter trips.

The first route is always on screen within a few seconds, because the page asks for it separately and in parallel, so the longer wait for alternatives does not hold the driver up. The cut-off and the timeouts are named constants, and the request log records the trip's size class and how long the alternatives call really took, so they can be tuned from real data.

## Run it locally

Requirements: Python 3.13 with [uv](https://docs.astral.sh/uv/), Node 26 (see `.nvmrc`).

```bash
make rehearsal-server      # terminal 1: the real server with synthetic routes and weather, no network
make rehearsal-frontend    # terminal 2: the app at http://localhost:5173
```

That runs the whole product without any key or external service. To use the real providers, copy `.env.example` to `.env`, add your own `TOMTOM_API_KEY`, and run `cd backend && uv run python manage.py runserver` and `cd frontend && VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev`.

```bash
make check    # backend lint, types and tests; front-end lint, types and tests; contract sync; rule coverage; secret scan
```

Server configuration (environment variables): `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `ALLOWED_ORIGINS`, `TOMTOM_API_KEY`, `VALHALLA_BASE_URL`, `OPEN_METEO_BASE_URL`, `NUM_PROXIES`. Front end: `VITE_API_BASE_URL`.

## Deployment

The server runs on Render (gunicorn with exactly one worker process and eight threads) and the front end on Vercel; both deploy from this repository's `main` branch. No address is hard-coded in code: the front end reads the server address (`VITE_API_BASE_URL`) and the server reads the allowed front-end addresses (`ALLOWED_ORIGINS`) from settings. The one place an address is written down is the `connect-src` entry of the Content-Security-Policy in `frontend/vercel.json`, which names the API host on purpose instead of allowing every `onrender.com` host; change it together with `VITE_API_BASE_URL` if the server's address ever changes.

## Trade-offs and limits

- The free server tiers are small (a tenth of a processor, 512 MB, sleep after 15 minutes idle). The page shows a "waking the server" state, and the design keeps work per request small.
- The backup router (Valhalla's public server) refuses truck routes longer than about 930 miles, so if TomTom is down, longer trips show a plain "routing unavailable" message instead of a backup route.
- Weather comes from a free service with per-minute and per-day limits; weather is fetched in one batched call per request and cached per map cell for about an hour. When the service is busy the routes are still shown, without ratings, with a plain message.
- TomTom's free key is for evaluation. Nothing from TomTom is cached or stored, its credit text is shown in the app, and no comparison with other providers is published.
- The weather service gives hourly values, so ratings reflect the hour, not minute-level weather.

## Credits

Routing: TomTom. Map data: OpenStreetMap contributors, tiles by OpenFreeMap and OpenMapTiles. Weather data by Open-Meteo.com. Address search: Photon (komoot) on OpenStreetMap data. The same credits are in the app under "Credits".
