# Weather-Aware Truck Routing

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
- Where the brief's bands touch, the higher (more cautious) band applies.
- Changing the checkpoint spacing can change which route wins, because the miles per level are measured at the checkpoints.
- Trips are limited to the lower 48 states, a departure within 7 days, and a load of 0 to 80,000 lb.
- Per-level miles are each rounded once to 0.1 mile, so they can differ from the total in the last digit.

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

The server runs on Render (gunicorn with exactly one worker process and eight threads) and the front end on Vercel; both deploy from this repository's `main` branch. No address is hard-coded: the front end reads the server address and the server reads the allowed front-end addresses from settings.

## Trade-offs and limits

- The free server tiers are small (a tenth of a processor, 512 MB, sleep after 15 minutes idle). The page shows a "waking the server" state, and the design keeps work per request small.
- Weather comes from a free service with per-minute and per-day limits; weather is fetched in one batched call per request and cached per map cell for about an hour. When the service is busy the routes are still shown, without ratings, with a plain message.
- TomTom's free key is for evaluation. Nothing from TomTom is cached or stored, its credit text is shown in the app, and no comparison with other providers is published.
- The weather service gives hourly values, so ratings reflect the hour, not minute-level weather.

## Credits

Routing: TomTom. Map data: OpenStreetMap contributors, tiles by OpenFreeMap and OpenMapTiles. Weather data by Open-Meteo.com. Address search: Photon (komoot) on OpenStreetMap data. The same credits are in the app under "Credits".
