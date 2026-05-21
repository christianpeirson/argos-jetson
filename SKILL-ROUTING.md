# SKILL-ROUTING — which tessl skill for which situation

Decision reference for the 13 tessl skills installed for the Argos v1 audit + ongoing work. **Before planning or doing any code task, match the work to a skill below and invoke it via the Skill tool.** Same discipline as the MCP-PREFLIGHT walk: route deliberately, don't guess. Skills are _guidance/knowledge overlays_ — they tell you what good looks like; the measurement engines are native MCP (sentrux / codegraph / chrome-devtools+Lighthouse / CodeQL / Sentry).

All 13 are quality-gated (≥75%, prefer 85/90), security-Passed, non-thin-wrapper. Bar + provenance live in the `project_v1_audit_skill_toolkit` memory.

## Quick trigger map

| Situation / file pattern                                                              | Skill                        | Skill tool name                       |
| ------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------- |
| Writing/reviewing ANY code for security (pre-write, secure-by-default)                | software-security (cisco)    | `tessl__software-security`            |
| A confirmed vuln finding (CWE + location) → emit the fix                              | patch-advisor                | `tessl__patch-advisor`                |
| `better-sqlite3` / `.db` / pragmas / migrations / SQLITE_BUSY / slow query data-layer | sqlite-node-best-practices   | `tessl__sqlite-node-best-practices`   |
| `ws`/SSE/`EventSource` — transport choice, reconnect, heartbeat, backpressure         | realtime-web-patterns        | `tessl__realtime-web-patterns`        |
| Server call to DB/API/cache/3rd-party — timeout/fallback/retry/circuit-breaker        | graceful-degradation         | `tessl__graceful-degradation`         |
| Component that fetches/displays data — loading/error/empty states, boundaries         | frontend-error-handling      | `tessl__frontend-error-handling`      |
| Reasoning about runtime errors (null-deref, OOB, overflow, div-by-zero) on a function | abstract-state-analyzer      | `tessl__abstract-state-analyzer`      |
| After every edit — run lint/tsc/audit gate                                            | lint-and-validate            | `tessl__lint-and-validate`            |
| Authoring TS/JS — class-vs-fn, helper-vs-inline, error shape, type-vs-interface       | simple-typescript            | `tessl__simple-typescript`            |
| HTTP endpoint/page perf — pagination, N+1, compression, bundle, images                | web-performance              | `tessl__web-performance`              |
| Any UI component — semantic HTML, ARIA, keyboard, focus, live regions, contrast       | web-accessibility-essentials | `tessl__web-accessibility-essentials` |
| Session lifecycle — cookies, token rotation, server-side verify (SSR)                 | ssr-auth-session-management  | `tessl__ssr-auth-session-management`  |
| Protecting state-changing endpoints — CSRF token, SameSite, Origin check              | csrf-protection              | `tessl__csrf-protection`              |

## Disambiguation — the decisive splits

**software-security vs patch-advisor** (same CodeGuard corpus, different phase): no finding yet, writing/reviewing → **software-security (PREVENT)**. Have a CWE + location, want the minimal fix diff → **patch-advisor (REMEDIATE)**. Neither subsumes the other.

**software-security vs ssr-auth-session-management** (auth): "is my auth code secure?" (principles: no hardcoded creds, strong crypto) → **software-security**. "Wire SSR session cookies/rotation" → **ssr-auth** — but ssr-auth is **Supabase-coupled** (depends on `@supabase/ssr` + PKCE). Argos auth is **custom middleware**, so **harvest ssr-auth's patterns** (httpOnly/secure/sameSite cookie hygiene, `getUser()`-style verify-every-request, atomic token rotation, 401 route-guard) — do **not** invoke it as a drop-in.

**ssr-auth vs csrf-protection** (complementary, overlap = SameSite flag only): establishing/refreshing/verifying _who you are_ → **ssr-auth**. Preventing forged state-changing requests on an existing session → **csrf-protection**. A full auth feature needs both. (csrf-protection itself: auth ≠ CSRF defense.)

**abstract-state-analyzer vs lint-and-validate** (reason vs run): if `tsc`/eslint can decide it → **lint-and-validate** (cheap, deterministic, run after every edit — ALWAYS first). If it needs tracking value-ranges/null-ness across control flow (types pass but runtime can still throw) → **abstract-state-analyzer**, on a _specific suspect function_, never repo-wide, never as a substitute for the gate.

**graceful-degradation vs frontend-error-handling** (call-site vs screen): the code _making_ the external call (`+server.ts`, `load`, `ws` handler) — timeouts/retries/circuit-breakers/partial responses → **graceful-degradation**. The component _displaying_ the result — loading/error/empty/toast/rollback → **frontend-error-handling**. Both mention retry/backoff: server transient-retry = graceful-degradation; client refetch-on-button = frontend-error-handling.

**realtime-web-patterns vs graceful-degradation** (persistent vs one-shot): dead/flapping _long-lived_ connection (WS/SSE reconnect, heartbeat, backpressure, WS→polling fallback) → **realtime-web-patterns** (self-contained, no second skill needed). Flaky _one-shot_ dependency (HTTP/DB/3rd-party call) → **graceful-degradation**.

**web-performance vs realtime-web-patterns** (throughput vs connection-health): make an HTTP endpoint fast/cheap (pagination, compression, N+1) → **web-performance**. Pick/tune a transport or keep a live WS/SSE healthy → **realtime-web-patterns**.

**web-performance vs sqlite-node-best-practices** (access-pattern vs engine): designing the API/endpoint ("paginated? N+1?") → **web-performance**. Writing the actual `better-sqlite3` layer (pragmas, prepared statements, transactions, schema DDL) → **sqlite-node-best-practices**. FK-index advice is in both — sqlite's is authoritative (SQLite doesn't auto-index FKs).

**simple-typescript vs lint-and-validate** (taste vs mechanics): judgment tools can't decide (class vs fn, inline vs extract, error shape) → **simple-typescript**, while authoring. Binary pass/fail (format, unused, type errors, audit) → **lint-and-validate**, after. simple-typescript's tagged-union _return shape_ vs graceful-degradation's fallback _behavior_ are complementary (the type vs what to do on failure).

**No skill fully subsumes another** — each owns a distinct axis. Closest kin is software-security ⊃ patch-advisor (shared corpus, prevent-vs-remediate phases) — keep both.

## Per-skill cards (condensed)

### software-security (cisco, 84%) — security PREVENT

Broad secure-coding guardrail (Project CodeGuard) applied while writing/reviewing. Covers: no hardcoded creds, modern crypto, cert validation, SQLi→parameterized, per-language rules, 3-phase pre/secure/post workflow. Not: remediating a found CWE, framework auth wiring, CSRF mechanics. Stack: strong, language-agnostic (Python-leaning examples).

### patch-advisor (santosomar, 92%) — security REMEDIATE

CWE→CodeGuard-rule→fix dispatch; emits minimal diff + rule ID + test-plan line for an already-located finding. Table covers CWE-89/78/79/502/611/22/798/327/862. Not: detection, framework wiring. Stack: language-agnostic; CWE-862 (authz) maps to Argos custom middleware, CWE-89 to better-sqlite3.

### sqlite-node-best-practices (tessl-labs, 98%) — DB layer

`better-sqlite3` production patterns: WAL/foreign_keys/busy_timeout/synchronous pragmas, single shared connection + graceful `db.close()`, STRICT tables, sequential migrations w/ `_migrations`, FK indexing (not auto-indexed!), `db.transaction()` + bulk-insert, prepared-statement caching, `:memory:` test DB. Not: async `sqlite3`, Postgres/MySQL, ORMs, EXPLAIN-plan reading. Stack: excellent (Argos runs better-sqlite3); wire `db.close()` into prod-server shutdown not Express.

### realtime-web-patterns (tessl-labs, 98%) — WS/SSE reliability

Transport decision matrix; SSE (event IDs, Last-Event-ID replay, heartbeat); WS reconnection (backoff+jitter+cap+dispose guard), ping/pong dead-conn detection, backpressure (`bufferedAmount`), message ordering/dedup, connection-state UI, WS→polling degradation, state recovery on reconnect. Not: event source/business logic, broker infra (Redis/Kafka), horizontal scaling, SvelteKit SSE wiring. Stack: strong (Argos uses `ws`+SSE); raw-WS §4/§6/§7 + SSE §2 are portable; React hook §5 + Socket.IO §3 need translation to Svelte/raw-ws.

### graceful-degradation (tessl-labs, 90%) — server resilience

Every external call: timeout (`AbortSignal.timeout`, DB pool/`busy_timeout`), fallback (stale cache/default/`Promise.allSettled` partial), retry (exp backoff+jitter, transient-only), circuit breaker per dependency, per-dep isolation, structured failure logging. Not: UI rendering, static bug-finding, lint/types. Stack: strong, Node/TS-first; applies to `+server.ts`, `ws` handlers, DB access.

### frontend-error-handling (tessl-labs, 84%) — UI states ⚠️ React-framed

Four states (loading/error/empty/success), fetch wrapper (network+HTTP+parse), error boundaries, global `window`/`unhandledrejection` handlers, form validation + `role="alert"`, optimistic rollback, client retry, message mapping, toast vs page. Not: server resilience, static analysis, lint. Stack: **principles port to Svelte 5 runes + `<svelte:boundary>`, but code samples are React/vanilla — translate, don't paste**. Route "report to error service" → Sentry (already wired).

### abstract-state-analyzer (ArabelaTso, 92%) — runtime-error reasoning

Abstract interpretation by reasoning (interval/sign/null/type domains) to flag OOB, null-deref, div-by-zero, overflow, type-inconsistency without executing. Per-operation: location + abstract state + severity + fix. Not: running tools, resilience, UI, whole-repo sweeps. Stack: good, has explicit JS section; reasoning-based (model-dependent, not an AST engine) — pairs with `tsc`, doesn't replace it.

### lint-and-validate (jbvc, 89%) — mechanical gate

Run after every edit: Node/TS `eslint --fix` + `tsc --noEmit` + `npm audit --audit-level=high` (Python: ruff/bandit/mypy); write→audit→analyze→fix loop; ships `lint_runner.py`/`type_coverage.py` (audited safe — list-arg subprocess, no shell/net/cred). Not: deciding what code should look like, runtime reasoning beyond configured tools. Stack: strong; **defer to project `npm run verify` / RTK wrapper rather than raw commands**.

### simple-typescript (idrevnii, 88%) — authoring taste

Direct/functional style: avoid needless classes/factories/wrappers, inline trivial helpers, extract only real domain concepts; `type` by default (`interface` for extensible public contracts); `schemas.ts`/`types.ts` placement; tagged-union recoverable errors (throw only for programmer errors, never bare null); validate untrusted data at boundaries. Not: running tools, bug-finding, resilience, UI. Stack: strong overlay for all Argos TS; pairs with karpathy-guidelines (global).

### web-performance (tessl-labs, 77%) — HTTP/endpoint perf ⚠️ partly React-framed

API pagination, N+1 prevention + FK indexes, gzip/brotli compression, route code-splitting, image optimization (lazy/srcset/dims/WebP), bundle hygiene (no barrels, tree-shake), app caching, async side-effects, resource cleanup, Web Vitals. Not: DB internals (→sqlite tile), HTTP cache headers, React memo detail, CDN/infra. Stack: code-splitting/re-render sections are React/Next — under SvelteKit routing/splitting is automatic. High-value for Argos: pagination, N+1/FK indexes, compression, bundle hygiene, cleanup. **Perf is best MEASURED via native chrome-devtools + Lighthouse; this skill is the guidance layer.**

### web-accessibility-essentials (tessl-labs, 90%) — a11y

Semantic landmarks + skip link + heading hierarchy, forms (label/aria-required/invalid/describedby/role=alert), button-vs-link, icon `aria-label`, image alt, keyboard nav (Tab/Enter/Space/Esc, `:focus-visible`), modals (role=dialog/focus-trap/Esc/return-focus), live regions (polite/assertive/role=status), tables (caption/th scope), contrast (4.5:1, never color-alone). Not: automated a11y CI (axe/Lighthouse runs), WCAG audit reports, complex ARIA widgets, i18n. Stack: HTML/ARIA carries to Svelte 5 unchanged; for Argos's map/SDR dashboard the live-regions/keyboard/modal/button-label/contrast sections matter most (form bulk is lower-frequency).

### ssr-auth-session-management (g14wxz, 94%) — session lifecycle ⚠️ Supabase-coupled

SSR session: `AUTH_COOKIE_OPTIONS` (httpOnly/secure/sameSite:lax), `@supabase/ssr` setup, `getUser()` JWT-verify every request (never bare `getSession()`), atomic access+refresh rotation, 401 route-guard. Not: non-Supabase auth (hard-coupled to `@supabase/ssr` + PKCE), CSRF mechanics, login UI. Stack: **weakest fit — Argos auth is custom, not Supabase. Harvest the patterns (cookie hygiene, verify-every-request, rotation, 401 guard); do not invoke as drop-in.**

### csrf-protection (secondsky, 89%) — request-forgery defense ⚠️ Express-framed

Synchronizer token (server-validated hidden field), double-submit cookie, SameSite; token gen (`crypto.randomBytes`) + `timingSafeEqual`; Origin/Referer validation, ~1h expiration, never-GET-for-mutations, layered defense. Not: authentication itself, session rotation, non-CSRF vulns. Stack: Express-coded — SvelteKit has built-in form-action CSRF + `csrf.checkOrigin`; transferable bit for Argos `ws` = **Origin-header validation on upgrade**.

## Argos-specific caveats (apply to all)

- **Svelte 5, not React**: frontend-error-handling, web-performance (re-render), realtime (client hook) ship React/JSX — translate to runes / `<svelte:boundary>`, never paste.
- **Custom auth, not Supabase**: ssr-auth patterns only, not its `@supabase/ssr` machinery.
- **Sentry is wired**: route any "report to error tracking" to Sentry.
- **RTK + `npm run verify`**: lint-and-validate defers to the project wrapper, not raw shell.
- **Perf measurement is native**: chrome-devtools/Lighthouse measure; web-performance only guides.
- **Out of scope**: Rust tactical (blue-dragon) — these skills are JS/TS/web; use cargo clippy/audit for that.
