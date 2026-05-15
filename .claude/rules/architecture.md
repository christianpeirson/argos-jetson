---
paths:
    - 'src/**/*.{ts,svelte,js}'
    - 'tests/**/*.{ts,js}'
    - 'scripts/**/*.{ts,js,sh}'
    - 'config/**/*'
    - 'deployment/**/*'
    - 'src/hooks.server.ts'
    - 'src/hooks.client.ts'
    - 'src/lib/server/instrumentation.ts'
---

# Architecture, Source Layout, Code Conventions

Loaded when Claude reads files under `src/`, `tests/`, `scripts/`, `config/`, or `deployment/`. Provides architectural context for code edits.

## Architecture

**SvelteKit SDR/Network Analysis Console deployed natively on RPi 5 (Kali)**. No Docker for the main app — Docker only for OpenWebRX, Bettercap.

### Key patterns

- **Fail-closed auth**: `ARGOS_API_KEY` (≥32 chars) required at boot — process exits without it. All `/api/*` (except `/api/health`) require `X-API-Key` header or HMAC session cookie.
- **Zod-validated env**: `src/lib/server/env.ts` validates env vars at startup; exits on parse failure.
- **Direct SQLite**: `better-sqlite3` + WAL, no ORM. Migrations in `scripts/db-migrate.ts`. Repository pattern in `src/lib/server/db/`.
- **Security middleware** in `src/hooks.server.ts`: Auth gate → Rate limit (200/min API, 30/min hardware) → Body size limit → CSP → Event-loop monitor.
- **MCP servers** (`src/lib/server/mcp/`): talk to the running app via HTTP only — cannot import SvelteKit internals.
- **OpenTelemetry opt-in**: gated on `OTEL_ENABLED=1`. ALL OTel imports must be dynamic inside the gate — static imports throw `ERR_AMBIGUOUS_MODULE_SYNTAX` because `require-in-the-middle` (OTel auto-instrumentation) intercepts `better-sqlite3` and confuses ESM/CJS. See `src/lib/server/instrumentation.ts`.

### Data flow

```text
Hardware (HackRF/Alfa/GPS)
  → src/lib/server/services/    # Native CLI wrappers
  → src/lib/server/hardware/    # Detection & monitoring
  → src/routes/api/*/+server.ts # REST (createHandler factory)
  → WebSocket (src/hooks.server.ts) # Real-time push (WebSocketManager)
  → src/lib/stores/             # Zod-validated client stores
  → src/lib/components/         # Svelte 5 runes UI
```

### Source layout

```text
src/routes/api/         # 36 domains (hackrf, kismet, gsm-evil, gps, tak…)
src/lib/server/         # 223 server-only files
  ├ auth/               # API key + HMAC cookie
  ├ api/                # createHandler factory + error utilities
  ├ security/           # rate limit, CORS, sanitizer, audit log
  ├ middleware/         # rate limit, security headers, WS handler
  ├ db/                 # RFDatabase facade, repos, migrations
  ├ hardware/           # HardwareRegistry, ResourceManager
  ├ hackrf/             # SweepManager, frequency cycling
  ├ kismet/             # KismetProxy, FusionController
  ├ services/           # gps, gsm-evil, kismet, cloudrf, cell-towers, bluehood, wigletotak
  ├ tak/, gsm/, mcp/, agent/
src/lib/components/     # 136 files, 10 families
src/lib/stores/         # 23 stores (Zod-validated, legacy + runes)
src/lib/{schemas,types,websocket,utils}/
src/hooks.server.ts     # auth, rate limiting, WS, CSP, ELD
config/                 # vite, eslint, playwright, terminal plugin
tests/                  # unit, integration, security, e2e, visual, performance
scripts/ops/            # setup-host.sh, install-services.sh, keepalive
deployment/             # 10 systemd units
native/apm-runner/      # Navy APM propagation (C + fork isolation)
tactical/               # AI kill chain (82 modules, 13 workflows)
specs/, plans/, docs/
```

## Code Conventions

- TypeScript strict — no `any` (use `unknown` + type guards), no `@ts-ignore` without issue ID.
- Naming: camelCase / PascalCase / UPPER_SNAKE / kebab-case. Booleans `is/has/should`.
- No barrel files except `src/lib/components/ui/` (shadcn-svelte). Import from source.
- No `utils.ts` / `helpers.ts` — domain-specific modules only.
- Limits: 300 lines/file, 50 lines/function. Single responsibility.
- Errors: explicit handling for all external ops, typed error classes, no swallowed errors, user errors must suggest a fix.
- Components must handle: Empty / Loading / Default / Active / Error / Success / Disabled / Disconnected.
