# Security Standards

Status: APPROVED by the owner on 2026-11-11 (changes need the owner's approval). Applies to server, front end, repository and deployment.

| ID | Rule |
|---|---|
| SEC-01 | No secrets in git. `.env` files are ignored. Secret scanning runs before every commit (`gitleaks`), in CI and through GitHub's own scanning. `.env.example` lists variable names only. |
| SEC-02 | Provider keys live only in server environment variables. The browser never receives the TomTom key. |
| SEC-03 | Validate every input on the server with strict serializers: ranges from `RR-29`, places inside a rectangle around the lower 48 states (it also contains parts of Canada, Mexico and the sea, for example Toronto; it stops far-away requests from spending provider quota and is not a precise border), unknown fields rejected, sizes bounded. Never trust the front end. |
| SEC-04 | CORS: an explicit allowlist from configuration. No wildcard, no credentials. Only the production front-end address is allowed; Vercel branch previews get no API access (only the main branch is deployed). |
| SEC-05 | Rate limiting per client address on every API endpoint except the health check (the attribution endpoint calls the routing provider on every page load, so a script could burn quota if it were open), answering 429 with `Retry-After`. Behind Render's proxy the address must come from `X-Forwarded-For` (`BE-17`), checked on the live deployment (`docs/changelog.md`, architecture section 13 row); otherwise all visitors share one bucket. |
| SEC-06 | Headers: HSTS, `nosniff`, a strict referrer policy and frame protection from Django; a Content-Security-Policy from the front-end host that allows only the app, the API origin, Photon and OpenFreeMap (tiles, fonts, sprites), plus `worker-src blob:` and `img-src data: blob:` because MapLibre runs in browser workers (with `child-src blob:`, and `font-src data:` for inline fonts). `style-src` allows inline styles (`'unsafe-inline'`) because Material UI writes its styles into the page; this is the one weakening in the policy (`frontend/vercel.json`). Test it on the real Vercel address, not only locally. `manage.py check --deploy` passes. |
| SEC-07 | A global daily guard on TomTom calls. When the budget is reached the server uses the backup provider and flags backup mode. Protects the free allowance from abuse. A global in-memory weather budget (550 locations per minute, 4,500 per hour, 9,000 per day, for all visitors) does the same for the weather service: over budget, the weather answers "busy". Both guards live in the memory of the single server process (`BE-09`) and reset on restart. |
| SEC-08 | Provider terms: nothing derived from TomTom is stored or cached; `Cache-Control: no-store` on routing and attribution responses; the weather cache holds only a rounded location cell and weather values, never route data; credits are shown; no provider comparison figures in any public file; no extra accounts to gain quota. |
| SEC-09 | Production settings: `DEBUG` off, explicit `ALLOWED_HOSTS`, generic error responses, no stack traces. |
| SEC-10 | Dependencies pinned; `pip-audit` and `npm audit` run in CI or by hand before release, not in the local check (they need the network and fail at random whenever a new advisory appears); every new dependency reviewed (`GEN-12`). Dependabot and CodeQL are optional extras if time remains after the build. |
| SEC-11 | Privacy: no accounts, no analytics or trackers, no stored trips. Logs contain no request bodies and no precise coordinates. The README names the third parties the browser contacts (Photon, OpenFreeMap). |
| SEC-12 | Outbound calls go only to fixed provider hosts from configuration. No user-controlled URLs. TLS verification stays on. |
| SEC-13 | Before release, the security reviewer runs the checklist below once on the integrated system and records the result in the owner's private review notes (not part of the repository; `docs/changelog.md` is the repository record). A full OWASP API Security Top 10 write-up is optional if time remains. |

## Review checklist (security reviewer)

1. Search the diff and history for keys, tokens, `.env` content.
2. Every new endpoint: validation, throttle, error shape, `no-store` where required.
3. Every new outbound call: fixed host, timeout, no secret in logs.
4. Every new dependency: reason, licence, audit result.
5. Provider terms (`SEC-08`) still respected.
