# Front-End Standards (React, Material UI, TypeScript)

Status: APPROVED by the owner on 2026-11-11 (changes need the owner's approval). Amended during implementation with the owner's approval on 2026-11-11; see docs/changelog.md. Read with `docs/coding-standards.md` and `docs/architecture.md`.

| ID | Rule |
|---|---|
| FE-01 | TypeScript `strict` plus `noUncheckedIndexedAccess`. No `any`. API types are generated from `docs/api/openapi.yaml`, never hand-copied, and are committed in `src/shared/api/generated/`; a check regenerates them and fails if they differ from the contract. |
| FE-02 | Feature folders under `src/features/`. Features do not import each other; `shared` imports no feature. One component per file, named exports, components 150 lines or fewer. Split into small presentational parts. |
| FE-03 | Material UI only; no second design system. Colours, spacing, type and radii come from the theme. No hard-coded colour or size outside the theme file, no inline `style`, `sx` only for genuine one-offs. |
| FE-04 | State: server data with TanStack Query; the trip in the URL (`REQ-14`); everything else in local React state. Add a global store only when a second real need appears. |
| FE-05 | Display server strings exactly as sent. Never round, parse to a float or recompute a rating (`GEN-03`). Format times with `Intl` using the checkpoint's time zone and show the zone abbreviation (`RR-18`). |
| FE-06 | Every asynchronous view has loading (skeleton), empty and error states with plain-English text. Problem codes map to messages in one place. |
| FE-07 | Accessibility: semantic HTML, labels, visible focus, logical focus order, `aria-live` for status changes, AA contrast, risk shown with a word and an icon as well as colour, keyboard-operable slider with `aria-valuetext` giving the real time, reduced motion respected. `jsx-a11y` in lint and an automated axe check in end-to-end tests. |
| FE-08 | Map: MapLibre through `@vis.gl/react-maplibre`, lazy-loaded. Layers are updated through the map API, not React state. The slider changes one paint property or filter. No re-render per slider tick. Clean up listeners and sources. |
| FE-09 | Heatmap and checkpoint colours use the one risk scale (`RR-01`). Low is near-transparent in the heatmap (a very faint green, about 12 percent, so the corridor stays visible) so only risky stretches glow. A legend is always visible. The heatmap comes from one server-built, de-duplicated list per response; never merge routes' points in the browser. Its colour must show the risk level, not how closely points are packed; if the heatmap layer cannot do that, use a non-additive layer (blurred circles). Tested: MapLibre's own heatmap layer failed this rule (60 packed Moderate points rendered as No Travel purple; a lone No Travel point rendered yellow), so the map uses one layer of blurred circles coloured from each point's risk digit; the slider changes one paint property. |
| FE-10 | Address search: Photon directly from the browser, 300 ms pause, at least 3 characters, previous request cancelled, US results only (box plus country code), a plain message if it fails, and a suggestion must be chosen. |
| FE-11 | Performance: code-split the map and results, memoize only after measuring, self-host the font, respect the budgets in `docs/standards/performance.md`. |
| FE-12 | Errors: an error boundary at app and feature level. Never show raw errors or stack traces. |
| FE-13 | Tests: Vitest and Testing Library, API mocked with MSW, tests cite `RR-nn` and `REQ-nn`, a handful of Playwright end-to-end tests with fake services. No snapshot tests of large trees. |
| FE-14 | Tooling (lead-owned configuration): `tsc --noEmit`, ESLint with strict type-aware `typescript-eslint`, `react-hooks`, `jsx-a11y`, Prettier, plus complexity, maximum-lines and no-nested-ternary rules. Zero warnings. |
| FE-15 | Look: dark theme first, navy surfaces with a turquoise accent for interface chrome only, a separate semantic risk palette, DM Sans self-hosted with tabular figures (verify the font supports them), 10 px radius. Never use another company's logo, name or paid font. |
| FE-16 | URL state: origin, destination, departure, load and spacing are encoded in the query string and validated when the page loads. |
| FE-17 | Credits (`REQ-13`) are reachable from every screen. The TomTom notice comes from `GET /attribution` and is kept in memory only. |
| FE-18 | The two trip requests (`primary` and `compare`) are independent. Ignore a late primary once compare has arrived. If compare fails but primary succeeded, keep the primary route and say alternatives are unavailable. The compare result replaces everything, including the provider flag, so TomTom and backup routes never appear together. |
| FE-19 | Show routes in the order the server sent them and use the server's `rank`; never sort or rank in the browser (`GEN-03`). The generated API types (`src/shared/api/generated/`) are lead-owned. |

## Structure

```
frontend/src/
  app/       shell, theme, providers, error boundary
  features/  trip-form/  route-results/  share-trip/  map/  heatmap-slider/
  shared/    api client, generated types, constants, small utilities
```
