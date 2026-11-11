# Requirements

Status: APPROVED by the owner on 2026-11-11 (changes need the owner's approval). Requirement IDs (`REQ-nn`) are stable. Risk behaviour lives in `docs/domain/risk-rules.md` (rules `RR-nn`) and is not repeated here.

## 1. Goal

Help a truck driver choose the safest route for a trip, balancing weather risk, load weight and travel time. Quality over quantity: correctness and clarity beat extra features.

## 2. Functional requirements

| ID | Requirement |
|---|---|
| REQ-01 | The driver enters origin, destination, departure date and time, and cargo weight in pounds, and chooses a checkpoint spacing of 10, 25 or 50 miles (default 25). Limits are in RR-29. |
| REQ-02 | Origin and destination are chosen from address suggestions that appear while typing (after 3 characters, US results only; the server also rejects places outside the lower 48 states). Free text without a chosen suggestion is not accepted. |
| REQ-03 | The app produces up to 3 distinct truck route options for the trip, chosen for variety (the fastest, then the routes that overlap least), so the weather ranking has real alternatives to compare. If fewer exist, it shows what exists. |
| REQ-04 | For every route, weather is sampled at the checkpoints (RR-12, RR-13) at the truck's estimated arrival time (RR-15, RR-17). |
| REQ-05 | Every checkpoint gets a risk rating exactly as defined in RR-01 to RR-11. |
| REQ-06 | Every route gets a summary (RR-19 to RR-21): distance, travel time, arrival time, miles at each risk level, average risk, worst level. |
| REQ-07 | The app recommends one route using RR-22 to RR-25, explains the choice in one plain sentence (RR-26), and handles "no eligible route" as in RR-23. |
| REQ-08 | A map shows all routes, the checkpoints coloured by risk with their ETAs, and the route summaries. The driver can select a route and click a checkpoint to see wind, rain, snow, rating, driving factor and ETA. |
| REQ-09 | A corridor heatmap shows weather risk along the trip, with a slider from 0 to 48 hours after departure (RR-28). Moving the slider updates the map immediately without waiting for the network. |
| REQ-10 | Results appear progressively: the main route first, then alternatives and the recommendation, with placeholders while waiting. |
| REQ-11 | Three or four one-click example trips fill the form. They call the services live. Their departure is relative (for example tomorrow at 08:00 in the origin's time zone), so they never fall into the past. |
| REQ-12 | Clear states for: unknown address, no route found, a service unavailable, backup routing mode (possibly fewer routes), weather without data, no recommended route, a sleeping server waking up. Messages are plain language. |
| REQ-13 | Required credits are always reachable: (c) TomTom, OpenStreetMap and OpenMapTiles, and "Weather data by Open-Meteo.com". |
| REQ-14 | The trip is kept in the page address so a refresh or a shared link restores it. |
| REQ-15 | A short "how risk is calculated" explanation is available in the app, and the app states that ETAs are driving time only (RR-16). |

## 2a. Out of scope

User accounts, saved trips, rest-break and driving-hour modelling, computed "better departure time" suggestions, multi-stop trips, hazmat routing, metric units, languages other than English, a light theme (dark first), native mobile apps.

## 3. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | Performance budgets in `docs/standards/performance.md` are met and measured. |
| NFR-02 | Security rules in `docs/standards/security.md` are met. |
| NFR-03 | Accessibility: keyboard operable, readable contrast, risk never shown by colour alone, meaningful labels, reduced-motion respected. |
| NFR-04 | The layout works from phone width to desktop. |
| NFR-05 | Code follows the standards documents, passes the automatic checks with zero warnings, and is readable with the comments removed (GEN-20 to GEN-25). |
| NFR-06 | The app is deployed (server on Render, front end on Vercel) and deployments use settings, not hard-coded addresses. |
| NFR-07 | Provider terms are respected (no storing TomTom results, credits shown, no published provider comparisons). |

## 4. Deliverables

1. Public GitHub repository with a README (what it does, how to run, how risk works, assumptions, trade-offs, and a short "where to start reading" code tour for reviewers).
2. Hosted application.
3. A 5 to 10 minute walkthrough video (recorded by the owner).

## 5. Acceptance

The risk rules are covered by tests that cite their IDs (RR-31). Every requirement above has at least one automated test or a checklist item in the final review. The walkthrough can be followed using only the one-click examples.

## 6. Assumptions

See section 13 of `docs/domain/risk-rules.md` for the domain assumptions. Additional: cargo weight is what the driver types; US trips only; the free tiers of the routing and weather providers are enough for a review-sized load.
