# Risk Rules

**Status: APPROVED by the owner on 2026-11-11 (draft 6). Any change needs the owner's approval.** Amended during implementation with the owner's approval on 2026-11-11 (assumptions 13 to 20 in section 13 only; no rule text changed); see docs/changelog.md. This file is the single source of truth for how weather becomes a risk rating and how routes are ranked. Code, tests and the UI must follow it; if code and this file disagree, this file wins and the code is a bug. Rules have stable IDs (`RR-nn`) that tests cite.

Source: the assessment brief (thresholds, load rules, ranking order). Everything marked **Assumption** is our reading where the brief is silent. Assumptions are listed again in section 13.

## 1. Risk levels

Five levels, safest to most dangerous. The number is used only for averaging and for the heatmap weight.

| Level | Value | Meaning |
|---|---|---|
| Low | 0 | Normal driving |
| Moderate | 1 | Take care |
| High | 2 | Hazardous |
| Severe | 3 | Very hazardous |
| No Travel | 4 | Do not drive |

**RR-01** A larger value is always a worse level. "Worst of" means the maximum. "No data" (RR-11) is not a level and never counts as Low.

## 2. Measurements per checkpoint

| Measurement | Unit | Meaning |
|---|---|---|
| Wind | mph | Sustained wind speed at that moment. Gusts are shown for information only and never change a rating. (Assumption) |
| Rain | in/hr | Rain rate (rain plus showers), never including snow. |
| Snow | in/hr | Snowfall rate. |
| Load | lb | **Cargo weight** as entered by the driver. The brief's 30,000 and 40,000 lb thresholds are read as cargo figures. (Assumption) |

For the routing provider only, the truck weight sent is the load plus an assumed empty tractor-trailer weight of 35,000 lb. (Assumption; one named constant.)

## 3. Rounding

**RR-02** Before rating, round each measurement to the precision shown on screen: wind to a whole mph, rain and snow to 2 decimals. Halves always round **up**. This is done **once, on the server only**, with exact decimal arithmetic (never binary floating point, never a language's default `round`), reading the numbers from the weather service's text (for example `json.loads(text, parse_float=Decimal)`). Rain is the service's rain plus showers, added together in exact decimals **before** rounding. The page displays the server's rounded numbers and never rounds again, so the number shown and the rating cannot disagree.

Why: Python's `round(34.5)` gives 34 (halves go to the nearest even number) and `round(0.245, 2)` gives 0.24 because 0.245 cannot be stored exactly. Both would break RR-03 and RR-04.

## 4. Rating each measurement

The brief's bands touch at their edges (for example 0.25 appears in both Moderate and High). Where they touch we use the higher, more cautious band. Every band includes its lower edge; only "No Travel" for rain and snow is strictly above its edge, as the brief says.

**RR-03 Wind** (after rounding)

| Level | Wind (mph) |
|---|---|
| Low | below 25 |
| Moderate | 25 to 34 |
| High | 35 to 44 |
| Severe | 45 to 54 |
| No Travel | 55 or more |

**RR-04 Rain** (after rounding)

| Level | Rain (in/hr) |
|---|---|
| Low | below 0.10 |
| Moderate | 0.10 up to below 0.25 |
| High | 0.25 up to below 0.50 |
| Severe | 0.50 up to and including 1.00 |
| No Travel | above 1.00 |

**RR-05 Snow** (after rounding)

| Level | Snow (in/hr) |
|---|---|
| Low | below 0.5 |
| Moderate | 0.5 up to below 1.0 |
| High | 1.0 up to below 2.0 |
| Severe | 2.0 up to and including 3.0 |
| No Travel | above 3.0 |

## 5. Load rules (wind only)

Load never changes the rain or snow rating. These rules apply to the wind rating and can only make it worse.

**RR-06** Wind 55 mph or more is No Travel for any load (including 0 lb).
**RR-07** Wind 45 to 54 mph with load **more than** 30,000 lb is No Travel (instead of Severe).
**RR-08** Wind 35 to 44 mph with load **more than** 40,000 lb is Severe (instead of High).

Exactly 30,000 lb or exactly 40,000 lb does not trigger the rule ("more than").

## 6. Checkpoint rating

**RR-09** Checkpoint rating = worst of (wind rating after load rules, rain rating, snow rating).
**RR-10** Every checkpoint reports its *driving factor(s)*: the measurement(s) that produced the final rating, and whether a load rule raised it. The UI shows this in plain words, for example "Heavy load raises 38 mph wind from High to Severe".
**RR-11 Missing readings:** rate the checkpoint with the readings that are present. If those already reach No Travel (for example wind 60 with rain missing), the checkpoint is No Travel, because a missing reading cannot lower it. Otherwise, if any reading is missing, the checkpoint is "No data". It is never treated as Low and never guessed, and it is shown as "No data" on the map and in the panel.

## 7. Checkpoints along a route

**RR-12** The driver chooses a spacing of 10, 25 or 50 miles (default 25).
**RR-13** Checkpoints sit at 0 miles (origin), at every multiple of the spacing, and at the full route length (destination). If the length is an exact multiple, the last multiple and the destination are one checkpoint (no duplicate).
**RR-14** Distances along the route are the ones returned by the routing provider, not our own calculation.
**RR-15 ETA:** the estimated arrival time at a checkpoint is the departure time plus the provider's travel time to that distance.
**RR-16 Driving time only:** ETAs do not include rest breaks or the federal driving-hour rules (Hours of Service). The UI and README say so. (Assumption: the brief does not ask for them; an optional "include mandated breaks" mode is out of scope.) *(review-only)*
**RR-17 Which forecast hour:** the weather service reports rain and snow as the total of the hour *ending* at the timestamp, and wind as a reading *at* the timestamp. So for an arrival at 13:20:
- wind uses the nearest hour (13:00; halves round up);
- rain and snow use the hour that contains the arrival time, which is the first timestamp strictly after it (14:00, covering 13:00 to 14:00).
**RR-18 Time zones:** the departure time is read in the **origin's** local time zone (once the origin is chosen the departure picker uses that zone, not the browser's). All times are stored as exact instants (UTC). Every local time shown carries its zone abbreviation, for example "14:05 MT".

## 8. Miles per risk level (midpoint rule)

**RR-19** Each checkpoint covers the stretch of road from halfway back to the previous checkpoint to halfway forward to the next one. The origin covers from mile 0, the destination up to the full length. The covered stretches add up exactly to the route length.
**RR-20** Miles at each level = sum of the stretches covered by checkpoints with that level. Miles covered by "No data" checkpoints are counted separately.

Worked example, route of 60 miles, spacing 25: checkpoints at 0, 25, 50, 60 cover 12.5, 25, 17.5 and 5 miles (total 60). Route of 8 miles, spacing 10: checkpoints at 0 and 8 cover 4 and 4 miles.

## 9. Route summary

**RR-21** For each route report: distance, travel time, arrival time, miles at each level, miles with no data, mile-weighted average risk (sum of level value x covered miles, divided by the miles that have data; shown as "—" when no mile has data), and the worst level reached.

## 10. Recommendation

**RR-22 Eligibility:** a route is not eligible if it contains any No Travel checkpoint, or if more than 10% of its miles have no data (one named constant, tested with exact miles, not rounded ones, so exactly 10% is still eligible). Such a route is still shown, marked "not enough weather data", and can never be recommended. Without this cap a route with gaps would get an unfair edge on the first two criteria, because "no data" miles are not counted as Severe or High.
**RR-23 No eligible route:** there is no recommendation. The app says so clearly, shows which checkpoint(s) and why, shows the **least-bad route** greyed out for information only (fewest No Travel miles plus No data miles, then the ranking in RR-24; unknown miles are never treated as safe), and suggests leaving later in plain words. It does not compute a better departure time. The same applies if no checkpoint on any route has weather data: routes are shown without ratings and without a recommendation. If the reason is missing weather data, the message says so.
**RR-24 Ranking** among eligible routes, in the brief's order:
1. fewest Severe miles
2. fewest High miles
3. lowest average risk
4. shortest travel time
**RR-25 Comparison precision** (so rounding noise cannot decide a tie): miles are compared rounded to 0.1 mile, average risk to 0.01, travel time to whole minutes. If still tied: shorter distance wins, then the order the provider returned the routes.
**RR-26** The app explains the recommendation in one plain sentence naming the first criterion that separated the winner from the runner-up, and says how many miles the rating is based on if any route has "No data" miles.
**RR-27** Changing the spacing can change which route wins. This is expected and is stated in the README. *(review-only)*
**RR-30 Exact arithmetic:** distances are in metres. The provider's distances are whole metres; checkpoint positions and midpoints are exact decimals (spacing in miles x 1,609.344 m, which is exact by definition, so a 25-mile checkpoint sits at 40,233.6 m and a 12.5-mile midpoint at 20,116.8 m). They are never rounded, so the covered stretches add up exactly to the route length (RR-19). All sums and comparisons use exact decimals, never binary floating point. Convert to miles only for display and for the 0.1-mile comparison in RR-25, also with exact decimals. The 10% test is written as: no-data distance x 10 is less than or equal to route distance. (The 100-mile examples are hand-built test cases, 160,934.4 m.)

## 11. Heatmap and validation

**RR-28 Heatmap:** the heatmap uses exactly the same rating function, rounding, hour rule (RR-17) and load. For slider position *h* (0 to 48 hours after departure), every corridor point uses the forecast for the moment departure + *h* hours. The slider shows the real clock time with its zone, for example "Thu 22:00 MT, +6 h".
**RR-29 Validation:**
- departure must not be in the past (the current hour is accepted) and at most 7 days ahead;
- the forecast must cover departure plus the longer of the trip time or 48 hours, plus one hour for the rain and snow rule;
- load is a number from 0 to 80,000 lb (our limit; the brief gives none; 0 is allowed for an empty trailer). The form shows a gentle, non-blocking note above 45,000 lb ("above typical legal cargo") but accepts the value;
- origin and destination must be different places.

**RR-31 Traceability:** every rule in this file has at least one test that cites its ID in its name or description, except rules marked *(review-only)*. A build check fails if a rule has no citing test, if a test cites an ID that does not exist, or if a rule is marked review-only without being listed in the check's allowlist with a reason. The check scans **both the Python tests and the front-end tests** (several rules are verified in the browser, such as the driving-factor wording RR-10, the heatmap using the same rating RR-28 and the slider label), and it is part of the normal test command, never a separate step. This is what makes "this file wins" enforceable: a test cannot quietly disappear and a rule cannot quietly change without a test noticing.

## 12. Worked examples (these become the first unit tests)

Wind only, load 10,000 lb:

| Wind | Level |
|---|---|
| 24 | Low |
| 25 | Moderate |
| 34 | Moderate |
| 35 | High |
| 44 | High |
| 45 | Severe |
| 54 | Severe |
| 55 | No Travel |

Wind and load:

| Wind | Load (lb) | Level |
|---|---|---|
| 44 | 40,000 | High |
| 44 | 40,001 | Severe |
| 35 | 45,000 | Severe |
| 34 | 80,000 | Moderate |
| 45 | 0 | Severe |
| 45 | 30,000 | Severe |
| 45 | 30,001 | No Travel |
| 54 | 80,000 | No Travel |
| 55 | 0 | No Travel |

Rain (in/hr): 0.09 Low, 0.10 Moderate, 0.24 Moderate, 0.25 High, 0.49 High, 0.50 Severe, 1.00 Severe, 1.01 No Travel.
Snow (in/hr): 0.49 Low, 0.50 Moderate, 0.99 Moderate, 1.00 High, 1.99 High, 2.00 Severe, 3.00 Severe, 3.01 No Travel.

Rounding (half up, exact decimals): wind 34.5 becomes 35 (High); wind 34.49 becomes 34 (Moderate); rain 0.245 becomes 0.25 (High); rain 0.244 becomes 0.24 (Moderate); rain 0.495 becomes 0.50 (Severe).

Hour rule: arrival 13:20 uses wind at 13:00 and rain/snow at the 14:00 value. Arrival 13:40 uses wind at 14:00 and rain/snow at 14:00. Arrival exactly 13:00 uses wind at 13:00 and rain/snow at 14:00.

Combined: wind 30 (Moderate), rain 0.30 (High), snow 0 (Low) gives High, driven by rain. Wind 38 with load 41,000 lb (Severe by load rule) and rain 0.60 (Severe) gives Severe, driven by both. Wind 30, rain missing, snow 0 gives "No data". Wind 50 with load 10,000 lb (Severe so far), rain missing gives "No data". Wind 60, rain missing, snow 0 gives No Travel.

Cap boundary: a 100-mile route at 10-mile spacing whose one middle checkpoint has no data has 10 no-data miles, exactly 10%, so it stays eligible. A 99-mile route at 10-mile spacing (checkpoints at 0, 10, ..., 90, 99) with one middle checkpoint missing has 10 of 99 miles (10.1%) without data, so it is marked "not enough weather data" and cannot be recommended.

Least-bad pick: route A is 100 miles with 60 no-data miles and no No Travel; route B is fully rated with 2 No Travel miles. Neither is eligible. Least-bad compares No Travel miles plus No data miles: route A is 0 + 60 = 60, route B is 2 + 0 = 2, so route B is shown as the least-bad route.

Average risk on a route with no rated miles shows "—" (never a number, never an error).

## 13. Assumptions to confirm

1. Where bands touch, the higher (more cautious) band applies (0.25 in/hr is High, 1.00 is Severe).
2. Ratings use the numbers rounded once on the server, as shown on screen (RR-02).
3. Load is cargo weight; the routing provider gets load plus an assumed 35,000 lb empty weight.
4. Sustained wind decides ratings; gusts are display-only.
5. Wind uses the nearest hour; rain and snow use the hour containing the arrival time (RR-17).
6. Departure is read in the origin's time zone; times show their zone.
7. ETAs are driving time only (RR-16).
8. A route with any No Travel checkpoint is excluded; if all are excluded there is no recommendation. "No data" miles are reported separately and never count as safe.
9. Comparison rounding and tie-breaks as in RR-25.
10. Limits in RR-29: departure within 7 days, load 0 to 80,000 lb.
11. A route with more than 10% of its miles without weather data cannot be recommended (RR-22).
12. For the greyed-out "least-bad" route, unknown miles count as badly as No Travel miles (RR-23).
13. RR-25 gives no precision for the distance tie-break; the code compares distance at 0.1 mile, like the miles criteria.
14. A route with both a No Travel checkpoint and too much missing data reports its ineligible reason as `no_travel` (RR-22).
15. RR-10: a Low checkpoint has no driving factors, and a load rule is reported only when wind drove the final level.
16. RR-23: when no mile on any route has data, `least_bad_route_id` is null and no route is shown as least bad.
17. RR-26: when the winner is fully rated but another route has gaps, the sentence says the rating is "based on all N of its miles".
18. RR-25: travel time is rounded to whole minutes half up (30 seconds rounds to the next minute).
19. RR-02: if only one of rain or showers is missing for an hour, their sum is treated as missing, and RR-11 then applies to rain.
20. RR-25 and RR-30: Severe miles of 10.04 and 10.06 do not tie, because they round to 10.0 and 10.1 before the comparison.
