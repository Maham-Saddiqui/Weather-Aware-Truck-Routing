# Performance Standards

Status: APPROVED by the owner on 2026-11-11 (changes need the owner's approval). Amended during implementation with the owner's approval on 2026-11-11; see docs/changelog.md. The numbers below are **proposed budgets, not measurements**. They are measured from the first deployment and adjusted with a written reason. Rule: no optimisation without a measurement.

## 1. Budgets (proposed)

| Area | Budget |
|---|---|
| Primary trip response, weather not cached | 95th percentile 4 s or less (provider time included) |
| Compare response, weather not cached | 95th percentile 12 s or less; the screen is never blocked while waiting |
| Weather already cached | server overhead 0.5 s or less |
| Server overhead without provider time | 150 ms or less for 3 routes |
| Response size (compressed) | primary 150 KB or less, compare 400 KB or less |
| First page load (app shell, compressed JavaScript, without the map chunk) | 200 KB or less |
| Map chunk (lazy) | 350 KB or less compressed |
| Largest contentful paint | 2.5 s or less on a throttled mobile connection |
| Layout shift | 0.1 or less |
| Lighthouse (desktop) | performance 90 or more, accessibility 95 or more |
| Heatmap slider | each change drawn within one frame (16 ms), 3 routes, no network |
| Map pan and zoom | 60 frames per second |
| Address suggestions | at most one request per 300 ms pause, first suggestion within 0.5 s median |

The map library alone is about 294 KB gzip (the whole map chunk, library plus map screen, is about 319 KB against its 350 KB budget; its worker, about 147 KB gzip, loads separately) and cannot be made smaller without dropping it; the eager first-load shell is about 198 KB against its 200 KB budget (measured 197.9 KB gzip after the final front-end round; about 2 KB of headroom is left).

## 1a. Measured on the live free instance (2026-11-11)

First route 1.6 s (786 miles); full comparison 5 to 6 s (786 miles), 10.4 s (about 1,570 miles), 15 to 19 s (about 3,300 miles, three routes, 670 KB uncompressed). These are single manual runs on the live server. The compare budget of 12 s (95th percentile) is exceeded only by the longest trips, which get the long-trip deadline of 40 s (architecture section 6); the first route is on screen within seconds because it comes from the separate primary request.

Measured on the live page by an independent assessor: first contentful paint about 0.4 to 0.5 s on a warm load; Play, slider drag, pan and zoom at about 60 frames per second (99th-percentile frame gap 19 ms, no gap over 34 ms); first-load shell about 198 KB and map chunk about 319 KB gzip. Not measured: a Lighthouse score, layout shift, the compare endpoint's 95th percentile under many concurrent visitors, and compressed response sizes. The budgets above are therefore met where a number is given here, and unmeasured otherwise.

## 2. Rules

| ID | Rule |
|---|---|
| PERF-01 | Provider calls that do not depend on each other run in parallel; the weather request is one batched call per trip request. |
| PERF-02 | Ask providers for compressed route lines and send `Accept-Encoding: gzip`. Compress API responses. |
| PERF-03 | The heatmap risk strings are computed on the server in the same pass as the ratings; the slider needs no network and no recomputation. |
| PERF-04 | The weather cache stores one whole fetched window per cell, time to live about an hour, size capped (`BE-13`), so repeat and example trips cost no provider calls. Concurrent identical requests share one provider call. The weather service's free allowance (600 calls a minute, 5,000 an hour, 10,000 a day; a multi-location request is assumed to cost one call per location) is a budget to design for: about 150 calls for an uncached 880-mile trip at 25-mile spacing, about 370 at 10-mile spacing. |
| PERF-05 | Every outbound call has a timeout; slow providers never hold a thread indefinitely. |
| PERF-06 | Front end: split code so the app shell loads first; lazy-load the map; self-host and preload the font; hashed assets are cached for a long time; API responses are never cached by the host. |
| PERF-07 | No React re-render per slider tick; map layers update through the map API (`FE-08`). |
| PERF-08 | No database in the request path. If one is ever added, every query is reviewed for count and indexes. |
| PERF-09 | Measure, then adjust: one manual Lighthouse run and a manual API timing check (browser network panel or a small timing script) after the first deploy and again before submitting, and a bundle-size check in the check command. Load-test and frame-time scripts are optional extras if time remains. |
| PERF-10 | An early throw-away spike proves the heatmap and slider with a realistic load (about 40 to 110 points per response after de-duplication, from the heatmap grid of the architecture) plus a stress case of about 1,000 points per route. It must also show that the colour reflects the risk level, not how closely points are packed (nearby points add up when zoomed out), and that stretches shared by several routes do not glow hotter; if it fails, the heatmap uses a non-additive layer. All of this is settled before the map track builds on it. |

## 3. Review checklist (performance reviewer)

1. Any new sequential provider calls that could be parallel?
2. Any work repeated per request that could be done once?
3. Any new dependency that grows the bundle? Compare against the budget.
4. Any change that makes the slider or map re-render React?
5. Are the budgets still met on the latest measurements?
