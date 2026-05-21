# Argos v1 (:5173) Audit Scorecard — 2026-05-21

Read-only recon pass. **This is the remediation backlog, not fixes.** Each row = one finding.

> **GATE A verification (2026-05-21): all findings self-verified at source.** Status:
> 17 valid (was 18). **F5 REMOVED** — disproven: `HardwareConfigPanel.svelte:44` has
> `if (!res.ok) throw` before `.json()`, properly guarded. **F6 evidence corrected** — 2 unguarded
> sites (L24, L42), not 3 (L69-73 _is_ guarded). **ARGOS-3** stays SUSPECTED (needs Sentry
> de-minified frame). All others confirmed with literal source quotes. SPD-1/2/4 measured live;
> SPD-3 = trace insight (ForcedReflow present, culprit TBD at fix-time).
> Columns: `id | module / file:line | axis | severity | evidence (measured # or file:line) | fixing skill | files-touched | dependency-tag`

Repo: `christianpeirson/argos-jetson` · Sentry slug: `us-army-2k/argos` (separate system).
Engines: sentrux · codegraph · CodeQL · Sentry · chrome-devtools+Lighthouse · OTel/Jaeger.

---

## Baseline (engine output, context for findings)

| Engine                | Result                                                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sentrux               | quality_signal **6729**; **no cycles** (acyclicity perfect); weakest dims **modularity 0.225** + **equality 0.529** (duplication / weak module boundaries); 937 cross-module edges |
| test coverage         | **18.7%** — 1198 of 1473 source files untested (361 test files, 275 covered)                                                                                                       |
| CodeQL                | **0 open** alerts (20 dismissed) — SAST clean; security findings below are what SAST structurally misses (WS upgrades, logic authz)                                                |
| Sentry (v1 prod, 30d) | 3 unresolved client `/dashboard` TypeErrors → BUG rows                                                                                                                             |
| OTel / Jaeger         | **live** (`OTEL_ENABLED=1`→:4318, Jaeger up 6d); only poll-route traces present                                                                                                    |

---

## Security axis

| id   | module / file:line                                                                            | axis     | severity | evidence                                                                                                                                                                                                                                                                                                                         | fixing skill                                       | files-touched                                             | dependency-tag                             |
| ---- | --------------------------------------------------------------------------------------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| A1   | `src/lib/server/terminal/handler.ts:206-214`                                                  | security | **crit** | CWE-306 + CWE-1385: `handleTerminalUpgrade` → `wss.handleUpgrade` then emits `connection` with **zero auth + zero Origin check**; grants full PTY (`spawnPty`) to any reachable client. Confirmed code-path. Caveat: `/terminal-ws` is dev-vite-only in prod today (404s), but the unguarded handler ships in the server bundle. | patch-advisor (CWE-306) + csrf-protection (Origin) | terminal/handler.ts                                       | group-ws (shares Origin-allowlist w/ A2)   |
| A2   | `src/lib/server/middleware/ws-connection-handler.ts:21-37,70-92`                              | security | high     | CWE-1385: kismet WS authenticates (token/X-API-Key/cookie) but **no Origin check** → cookie-auth'd browser = CSWSH (SvelteKit `csrf.checkOrigin` does not cover raw `ws`). Confirmed absence; exploitability reasoning depends on browser cookie-auth use.                                                                       | csrf-protection (Origin allowlist)                 | ws-connection-handler.ts, cors.ts (reuse ALLOWED_ORIGINS) | group-ws                                   |
| A3   | `src/lib/server/services/vnc-common/spawn-helpers.ts:101-118`                                 | security | high     | CWE-78: `centerVncWindow` runs `spawn('/bin/bash',['-c',script])` interpolating `windowSearchName` into `xdotool search --name "${...}"`. Latent shell injection **if** name ever caller-controlled (current callers pass constants). Rest of file is safe argv.                                                                 | patch-advisor (CWE-78)                             | spawn-helpers.ts                                          | parallel-safe                              |
| A4   | `src/lib/server/middleware/security-headers.ts:26`                                            | security | med      | CWE-1021/79: CSP `script-src 'self' 'unsafe-inline'` (also style-src); `frame-src`/`form-action` allow bare `http:`/`https:`. `unsafe-inline` may be a SvelteKit hydration constraint → nonce/hash migration is the fix. Confirmed policy text.                                                                                  | software-security                                  | security-headers.ts                                       | parallel-safe                              |
| A5   | `src/routes/api/database/query/+server.ts:58-77` + `query-sanitizer.ts:55-73`                 | security | med      | CWE-89 residual: read-only SQL endpoint is **denylist**-based (regex SELECT-prefix, strip DML/`sqlite_*`/multi-stmt) then wraps raw string in `SELECT * FROM (<raw>) LIMIT n`. Bypass-prone (comments, `pragma`/`ATTACH` not listed, subquery DoS). Auth-gated (`requiresApiAuth`) lowers severity.                              | patch-advisor (CWE-89)                             | query-sanitizer.ts                                        | parallel-safe                              |
| A6   | `src/hooks.server.ts:161-163`                                                                 | security | med      | CWE-862: `requiresApiAuth` = single global gate; every `/api/*` (except health) uses **one shared `ARGOS_API_KEY`**, no per-route authz/roles → any authed client hits destructive endpoints (docker, system services, kismet recon). By-design single-tenant; flag as risk.                                                     | software-security + patch-advisor (CWE-862)        | hooks.server.ts                                           | parallel-safe                              |
| A7   | `src/routes/api/system/docker/[action]/+server.ts:83-99`                                      | security | low      | CWE-78 mitigated: `[action]` not allowlist-validated but indexes `argsMap` (400 on miss) → only start/stop/restart reach `execFile('/usr/bin/docker',args)`; `container` Zod-enum-locked; no shell. Defense-in-depth nit, not exploitable.                                                                                       | software-security (validate-at-boundary)           | docker/[action]/+server.ts                                | parallel-safe                              |
| A8   | `src/lib/server/services/session/session-tracker.ts:91-99`                                    | security | clean    | CWE-89 checked: dynamic `UPDATE ... SET ${fields}` but columns from fixed `METADATA_COLS` const, values `?`-parameterized. **Clean** — listed to show coverage.                                                                                                                                                                  | —                                                  | —                                                         | n/a                                        |
| A-X1 | rate-limit coverage (`security/rate-limiter.ts` invoked only from `rate-limit-middleware.ts`) | security | med      | The two WS upgrade paths (kismet, terminal) and `/api/database/query` are **not rate-limited** → auth brute-force + query-DoS unthrottled. Reasoning-confidence (caller graph).                                                                                                                                                  | graceful-degradation + software-security           | rate-limit-middleware.ts (extend coverage)                | depends-on: A1, A2 (touches same WS paths) |

**Verified clean:** `exec.ts` (execFile argv), `auth-middleware.ts` (HMAC-SHA256 + timingSafeEqual, fail-closed), `input-sanitizer.ts` (allowlist validators), `cors.ts` (strict allowlist, fail-closed), `system/services/+server.ts` (static argv).

---

## Speed axis (measured live :5173/dashboard via chrome-devtools + on-disk bundle)

| id    | module / file:line                                                        | axis  | severity | evidence (measured)                                                                                                                                                                                                                                                                                                             | fixing skill                                 | files-touched                                              | dependency-tag                                             |
| ----- | ------------------------------------------------------------------------- | ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| SPD-1 | maplibre-gl chunk `build/.../chunks/CQP_Pmbc.js`                          | speed | high     | **1026 KB raw / 285 KB gzip** maplibre-gl eagerly loaded on dashboard init = half of total initial JS; dominant cause of render-delay                                                                                                                                                                                           | web-performance                              | map component dynamic-import + chunking config             | group-bundle                                               |
| SPD-2 | `/dashboard` initial JS                                                   | speed | med      | **2111 KB raw / 36 chunks**; LCP **2031ms** = TTFB 14ms + **render-delay 2016ms** (99% client). `nodes/4`=473KB, `entry/app`=273KB                                                                                                                                                                                              | web-performance                              | `vite.config`/`svelte.config` manualChunks, bundle hygiene | group-bundle; **depends-on: SPD-1** (same chunking config) |
| SPD-3 | `/dashboard` load (ForcedReflow)                                          | speed | low      | ForcedReflow insight present (geometry read after DOM write, ~74ms window)                                                                                                                                                                                                                                                      | web-performance                              | dashboard component (pin during fix)                       | parallel-safe                                              |
| SPD-4 | server runtime / instrumentation                                          | speed | info     | server FAST: TTFB 14ms, polled-route p95 **79ms**/max 125ms. Heavy routes (kismet/hackrf/db/reports) have **no Jaeger traces** — generic `GET` span name + no live tool traffic. Measurement gap, not a perf bug                                                                                                                | (instrumentation)                            | `src/lib/server/instrumentation.ts` (span naming)          | parallel-safe                                              |
| SPD-5 | `src/routes/api/gnuradio/control/+server.ts` + `services/gnu-radio-vnc/*` | speed | low      | **MEASURED (Jaeger, live)**: GNU Radio VNC control is **synchronous ~2020ms** (Xtigervnc+openbox+GRC+websockify spawn blocks the response). All other tool controls fire-and-forget at ~100ms (novasdr 103, openwebrx 100, sightline 107, spiderfoot 46) then ready async. Make GNU Radio control non-blocking like the others. | graceful-degradation + realtime-web-patterns | gnuradio control route + gnu-radio-vnc service             | parallel-safe                                              |
| SPD-6 | `src/routes/api/kismet/*` (start/restart)                                 | speed | info     | **MEASURED**: kismet start/restart up to **2994ms** (daemon boot); status polls 61ms. Expected daemon-launch cost, async UI present → not a bug, baseline noted. SSE streams (rf/hackrf/gsm-scan) handshake 1–20ms (instant).                                                                                                   | (none — expected)                            | —                                                          | parallel-safe                                              |

**Tool-load summary (MEASURED live via chrome-devtools + Jaeger, full scope per user):** tool-load is
**healthy** — no hung/blocking-load bug. VNC-stack spawn ≈2s (GNU Radio, synchronous → SPD-5), kismet
daemon ≤3s (SPD-6), service controls ~100ms non-blocking, SSE streams instant. **Deploy note (not a code
finding):** gsm-evil non-functional on host — `grgsm_livemon_headless` not installed — but fast-fails
(20ms) with a clean error message (good resilience). chrome-devtools tool-load gap from Phase 1 = CLOSED.

---

## Silent-bug axis

| id      | module / file:line                                                                | axis | severity    | evidence                                                                                                                                                                                                                                                                                                                                                                                                                           | fixing skill                                      | files-touched                                     | dependency-tag                        |
| ------- | --------------------------------------------------------------------------------- | ---- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| ARGOS-4 | `src/lib/components/dashboard/panels/OverviewPanel.svelte:64`                     | bug  | **crit**    | CONFIRMED Sentry signature: `res.sources.reduce(...)` — `res` guarded truthy (L62) but `res.sources` not. `/api/system/logs` returns `{success:false,error}` at **HTTP 200** on journald failure (`logs/+server.ts:39`); `fetchJSON` returns it as unvalidated `as T` → `res` truthy + `res.sources` undefined → `reading 'reduce'`. Fix: guard `res.success && res.sources` / `res.sources?.reduce()`.                            | abstract-state-analyzer + frontend-error-handling | OverviewPanel.svelte (+ optionally fetch-json.ts) | group-fetchjson + group-overview      |
| ARGOS-5 | `src/hooks.client.ts:26-48` + `src/routes/dashboard/+page.ts`                     | bug  | high        | CONFIRMED root: `/dashboard` is `ssr=false,csr=true` → lazy route chunks (`nodes/0.js`). Post-deploy stale clients request dead hashed chunks → "Failed to fetch dynamically imported module". `handleError` only reports to Sentry; **no stale-chunk `location.reload()`**, **no `+error.svelte`** anywhere in non-mk2 routes. Fix: match `/Failed to fetch dynamically imported module/` → one-shot reload; add `+error.svelte`. | frontend-error-handling + graceful-degradation    | hooks.client.ts, new `src/routes/+error.svelte`   | parallel-safe                         |
| ARGOS-3 | not in v1 source (minified lib frame)                                             | bug  | med         | SUSPECTED: only `.fn` in app source is `opts.fn()` server-side (`with-hackrf.ts:35`), off the dashboard path. `reading 'fn'` is a minified vendor frame (maplibre/Carbon/d3) on the SSR-disabled dashboard. **Not source-fixable** — resolve via Sentry source-map upload to de-minify, then re-triage.                                                                                                                            | (Sentry sourcemap upload)                         | build/release config (sourcemap upload)           | parallel-safe                         |
| F4      | `src/lib/components/dashboard/panels/ToolsNavigationView.svelte:104,190,211,224+` | bug  | high        | `await statusRes.json()` with **no `res.ok` check**, then `statusData.isRunning\|\|statusData.running` on possibly-error body. Same class as ARGOS-4; multiple sites.                                                                                                                                                                                                                                                              | graceful-degradation                              | ToolsNavigationView.svelte                        | group-fetchjson                       |
| ~~F5~~  | ~~`HardwareConfigPanel.svelte:43-45`~~                                            | bug  | **INVALID** | **DISPROVEN by GATE A**: L44 has `if (!res.ok) throw new Error(\`HTTP ${res.status}\`)`before`.json()` (L45), inside try/catch with error state. Properly guarded. Removed from backlog.                                                                                                                                                                                                                                           | —                                                 | —                                                 | n/a                                   |
| F6      | `src/lib/components/dashboard/panels/CapturesPanel.svelte:24,42`                  | bug  | med         | **verified ✓**: L24 + L42 `await res.json()` with **no `.ok` branch**. (L69-73 _is_ guarded — corrected from "3 sites".) `/api/signals` (DB) + `/api/gsm-evil/control` (spawn) error bodies flow into render.                                                                                                                                                                                                                      | graceful-degradation                              | CapturesPanel.svelte                              | group-fetchjson                       |
| F7      | `src/lib/components/dashboard/panels/OverviewPanel.svelte` (file-level)           | bug  | med         | `@constitutional-exemption Article-IV-4.3 issue:#11` explicitly defers loading/error/empty UI; all 4 fetches swallow null → renders `'—'` with no error surface. Same null-tolerance that masks ARGOS-4's network-fail path.                                                                                                                                                                                                       | frontend-error-handling                           | OverviewPanel.svelte                              | group-overview (same file as ARGOS-4) |
| F8      | `src/lib/components/screens/SystemsScreen.svelte:69-70`                           | bug  | low         | `(await infoRes.json()) as SystemInfo` — ok-status checked (L90), body shape not; `info?.wifiInterfaces` optional-chained → degrades safely. Best-handled fetcher; noted for completeness.                                                                                                                                                                                                                                         | abstract-state-analyzer                           | SystemsScreen.svelte                              | parallel-safe                         |

---

## Phase 1.5 — semble breadth + depth sweep (2026-05-21)

Semantic sweep (DEPTH find_related from confirmed lines + BREADTH NL category search) to catch
siblings/surfaces the targeted Phase-1 pass missed. **Headline: no crit/high siblings missed** —
the hotspot pass was well-aimed. 4 new findings, all LOW/LOW-MED, all GATE-A self-verified ✓.

| id  | module / file:line                                                                           | axis           | severity | evidence (self-verified ✓)                                                                                                                                                                                                                                                                            | fixing skill                                        | files-touched                       | dependency-tag              |
| --- | -------------------------------------------------------------------------------------------- | -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------- | --------------------------- |
| A9  | `src/routes/api/rf/stream/+server.ts:18-29` + `src/routes/api/spectrum/stream/+server.ts:18` | security       | low      | GET SSE streams auth via global cookie gate + apply `getCorsHeaders(origin)` but no **explicit** Origin reject. **Mitigated** by cors.ts strict fail-closed allowlist (cross-origin EventSource is CORS-gated) → defense-in-depth nit, not open exfil. Demoted from med-high after verifying cors.ts. | csrf-protection (Origin allowlist on stream routes) | rf/stream, spectrum/stream, cors.ts | group-sse (kin to group-ws) |
| A10 | `src/lib/server/services/webtak-vnc/webtak-vnc-processes.ts:104-120`                         | security       | low      | `spawnChromium(url)` passes operator `url` as **trailing argv** (L117) to `spawn(bin, flags)` (L120, no shell). Chromium arg-injection if url starts with `--`. Operator-local, not remote → low.                                                                                                     | patch-advisor (validate-at-boundary)                | webtak-vnc-processes.ts             | parallel-safe               |
| A11 | `src/lib/server/agent/runtime.ts:57`                                                         | bug/resilience | low      | `_executeTool` `fetch('/api/agent/tools')` has **no `AbortSignal`** (the timeout at L95 is a different Anthropic-probe call) → agent tool exec can hang.                                                                                                                                              | graceful-degradation                                | runtime.ts                          | parallel-safe               |
| F9  | `src/lib/components/dashboard/views/WebTAKView.svelte:55`                                    | bug            | low-med  | `restoreExistingSession` does `await res.json()` (L55) then `body.isRunning` (L56) with **no `.ok` check**; `catch` degrades to form gracefully (≠ ARGOS-4 crash). group-fetchjson sibling.                                                                                                           | graceful-degradation                                | WebTAKView.svelte                   | group-fetchjson             |

**Confirmed-CLEAN zones (negative results — surfaces Phase 1 never checked, now swept):**

- exec/spawn: argv-safe; `bash -c` siblings (`spawnGrcMaximizer`, openbox) use static commands → no injectable siblings (A3 isolated).
- WS server entry points: only A1 + A2 (no other upgrade handlers).
- path traversal: `reports/[id]/view` resolves path from DB record + allowlisted `format`; no raw user-path file reads.
- secrets/crypto: none hardcoded (`.env.example` empty + rotation schedule); HMAC-SHA256 + `timingSafeEqual` sound.
- dynamic SQL: parameterized/prepared everywhere (`query-runner-repository`, `signal-repository`) except A5.
- server resilience: `AbortSignal.timeout` on all external fetches (sparrow/dragonsync/network-detector/sightline) except A11.
- N+1: none surfaced (`findSignalsInRadius` = single query + in-memory filter).

**Rejected candidate (GATE-A demotion audit trail):** A-NEW1 (SSE open-exfil) → demoted to A9 LOW after
verifying cors.ts is a strict fail-closed allowlist that CORS-gates cross-origin EventSource.

### Round 2 sweeps (D5, B5, B8, B10, B13, B14) — 0 new findings, 2 enrichments, more clean zones

Ran after a coverage self-audit caught these were skipped in round 1. Result: **no new findings.**

- **D5** (unguarded-access siblings of ARGOS-4): isolated — other `.reduce/.filter` run on defaulted
  `$state([])` arrays or `if (data?.x)`-guards (`TopStatusBar`). group-fetchjson stays {ARGOS-4,F4,F6,F9}.
- **B5** (destructive-endpoint authz): no new row → **enriches A6**. Destructive surface under the single
  shared key is large: docker `start/stop/restart`, `kismet/restart`, dragonsync `systemctl`, `emergency-stop`.
- **B8** (error-states): no new row → **enriches F7**. The `@constitutional-exemption issue:#11`
  loading/error/empty deferral is systemic + TRACKED across ~5 components (OverviewPanel, gsm-evil page,
  dashboard page, DevicesPanel, ResizableBottomPanel) — acknowledged UX-phase debt, not hidden bugs.
- **B10** (XSS via `{@html}`): **CLEAN** — 8 sites, all static SVG icons / numeric-derived charts;
  `getWeatherIcon(code:number,isDay:boolean)` + `buildConeSVG(heading:number)` take non-strings; no user-string sink.
- **B13** (secrets in logs): **CLEAN** — logs only metadata (key length, "not set"), never values.
- **B14** (request-body validation): **CLEAN** — POST routes systematically use `createHandler({validateBody: ZodSchema})` + `safeParseWithHandling`.

**Tally: 17 → 21 valid findings** (+A9/A10/A11/F9, all low). group-fetchjson grew (+F9); new group-sse (A9).
A6 + F7 evidence enriched. Two-round semble sweep ⇒ **high confidence the backlog is complete at crit/high; only LOW additions.**

---

## Dependency / fan-out summary (remediation grouping)

**Groups (must be ONE branch or sequenced — shared files):**

- **group-ws** → A1 + A2 (+ A-X1) — share an Origin-allowlist helper in `cors.ts` + the two WS upgrade paths. One branch.
- **group-overview** → ARGOS-4 + F7 — same file `OverviewPanel.svelte`. One branch (do ARGOS-4 crit fix + F7 states together).
- **group-fetchjson** → ARGOS-4 + F4 + F6 — systemic root is `fetch-json.ts` lacking shape/`ok` validation. **Decision point:** central fix in `fetch-json.ts` (one branch, touches all callers) **vs** per-component guards (parallel). Recommend central helper first, then per-panel.
- **group-bundle** → SPD-1 + SPD-2 — same `vite.config`/`svelte.config` chunking + map import. SPD-2 depends-on SPD-1.

**Parallel-safe singletons (own branch each, no ordering):**
A3 (spawn-helpers), A4 (security-headers), A5 (query-sanitizer), A6 (hooks.server.ts), ARGOS-5 (hooks.client.ts + new +error.svelte), SPD-3, SPD-4, F5, F8, ARGOS-3 (build/sourcemap config).

**Suggested fix order by severity:**

1. ARGOS-4 (crit, confirmed prod crash) → group-overview/group-fetchjson
2. A1 (crit, unguarded PTY) → group-ws
3. A2 + A3 (high security) ; ARGOS-5 + F4 (high bug) ; SPD-1 (high speed)
4. med tier: A4/A5/A6/A-X1, F5/F6/F7, SPD-2
5. low/info: A7, SPD-3/SPD-4, F8, ARGOS-3

**Cross-cutting theme:** 18.7% test coverage + `fetchJSON`'s unvalidated `as T` cast are the systemic silent-bug enablers; the WS-upgrade gaps (A1/A2) are the systemic security enablers CodeQL can't see.
