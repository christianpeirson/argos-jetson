import { config } from 'dotenv';
import { mkdirSync } from 'fs';
import os from 'os';
import path from 'path';
import { z } from 'zod';

// Load .env variables
config();

const envSchema = z.object({
	// Core (existing)
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	DATABASE_PATH: z.string().min(1).default('./rf_signals.db'),
	KISMET_API_URL: z
		.string()
		.url({ message: 'Invalid KISMET_API_URL' })
		.default('http://localhost:2501'),
	ARGOS_API_KEY: z.string().min(32, {
		message: 'ARGOS_API_KEY must be at least 32 characters. Generate with: openssl rand -hex 32'
	}),

	// Kismet auth/connection (FR-023)
	KISMET_HOST: z.string().default('localhost'),
	KISMET_PORT: z.coerce.number().int().min(1).max(65535).default(2501),
	KISMET_API_KEY: z.string().default(''),
	KISMET_USER: z.string().default('admin'),
	KISMET_PASSWORD: z.string().default(''),

	// External API keys (FR-023, optional)
	ANTHROPIC_API_KEY: z.string().optional(),
	OPENCELLID_API_KEY: z.string().optional(),
	STADIA_MAPS_API_KEY: z.string().optional(),
	CLOUDRF_API_KEY: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),

	// Public-facing URLs (FR-023)
	// Scheme used when rewriting upstream tile/sprite/glyph URLs in the
	// map-tiles proxy. Set to 'https' if a TLS reverse proxy is in front
	// of prod-server.ts; otherwise the default 'http' matches the plain
	// node:http server and avoids mixed-content blocks.
	ARGOS_PUBLIC_SCHEME: z.enum(['http', 'https']).default('http'),
	PUBLIC_KISMET_API_URL: z.string().url().default('http://localhost:2501'),
	PUBLIC_HACKRF_API_URL: z.string().url().default('http://localhost:8092'),

	// Self / CORS (FR-023, FR-025)
	ARGOS_API_URL: z.string().url().default('http://localhost:5173'),
	ARGOS_CORS_ORIGINS: z.string().default(''),

	// Third-party service URLs (FR-025)
	GSM_EVIL_URL: z.string().url().default('http://localhost:8080'),
	OPENWEBRX_URL: z.string().url().default('http://localhost:8073'),
	NOVASDR_URL: z.string().url().default('http://localhost:9002'),
	BETTERCAP_URL: z.string().url().default('http://localhost:80'),
	BLUEHOOD_PORT: z.coerce.number().int().min(1024).max(65535).default(8085),
	SPARROW_PORT: z.coerce.number().int().min(1024).max(65535).default(8020),
	WIGLETOTAK_PORT: z.coerce.number().int().min(1024).max(65535).default(8081),

	// Trunk-recorder + rdio-scanner (Cellular & Trunked Radio Interception)
	TRUNK_RECORDER_STATUS_URL: z.string().url().default('http://localhost:3005'),
	RDIO_SCANNER_URL: z.string().url().default('http://localhost:3002'),
	RDIO_SCANNER_ADMIN_PASSWORD: z.string().default(''),
	TRUNK_RECORDER_CONFIG_DIR: z.string().default('/var/lib/argos/trunk-recorder'),
	TRUNK_RECORDER_RECORDINGS_DIR: z.string().default('/var/lib/argos/recordings'),

	// GSM Evil data directory
	GSMEVIL_DIR: z.string().default(''),

	// Temp directory (FR-024) — resolved at runtime below
	ARGOS_TEMP_DIR: z.string().default(''),

	// GPSD socket path (FR-040)
	GPSD_SOCKET_PATH: z.string().default('/var/run/gpsd.sock'),

	// Terminal WS pre-spawn toggle — dashboard Terminal panel pre-creates tmux-0.
	// Default off in prod; dev vite plugin flips it on unless set to '0'.
	ARGOS_TERMINAL_PRESPAWN: z.enum(['0', '1']).default('0'),

	// SQLite WAL checkpoint interval. DatabaseCleanupService forces
	// `PRAGMA wal_checkpoint(TRUNCATE)` on this cadence to keep rf_signals.db-wal
	// from growing unboundedly. 15 min default is safe; tighten to 5 min under
	// heavy write load, loosen to 60 min on low-traffic deployments.
	ARGOS_WAL_CHECKPOINT_INTERVAL_MS: z.coerce
		.number()
		.int()
		.min(60_000) // 1 min — anything tighter thrashes WAL checkpointing
		.max(86_400_000) // 1 day — anything looser defeats the point
		.default(15 * 60 * 1000),

	// Frontend-public variant of ARGOS_API_URL (Sprint 2 — env.ts consolidation).
	// Distinct so downstream clients/MCP config generators can expose a URL
	// reachable from outside the container without leaking an internal address.
	PUBLIC_ARGOS_API_URL: z.string().url().default('http://localhost:5173'),

	// Service binary paths (Sprint 2 — env.ts consolidation)
	// Every field below was previously read directly via `process.env.*` in
	// service-layer files; consolidating here gives us one Zod-validated
	// singleton and removes ad-hoc nullish fallbacks scattered across consumers.
	SPIDERFOOT_PATH: z.string().default('/usr/bin/spiderfoot'),
	NPX_PATH: z.string().default('npx'),

	// Optional binary overrides — empty string means "fall back to the
	// consumer's PATH search / built-in default list". Kept optional so a
	// stock install without these overrides continues to boot.
	ARGOS_VNC_XTIGERVNC_BIN: z.string().optional(),
	ARGOS_VNC_WEBSOCKIFY_BIN: z.string().optional(),
	ARGOS_VNC_WIRESHARK_BIN: z.string().optional(),
	ARGOS_VNC_TSHARK_BIN: z.string().optional(),
	ARGOS_VNC_GNURADIO_COMPANION_BIN: z.string().optional(),
	ARGOS_WEBTAK_CHROMIUM_BIN: z.string().optional(),
	SIGHTLINE_DIR: z.string().optional(),

	// Blue Dragon (SDR over USRP) runtime paths
	BD_BIN: z.string().optional(),
	BD_PCAP_PATH: z.string().default('/tmp/bd-live.fifo'),
	BD_INTERFACE: z.string().default('usrp-B205mini-329F4D0'),
	BD_PID_FILE: z.string().default('/tmp/argos-bluedragon.pid'),

	// System-provided env vars (optional; consumers supply their own fallbacks).
	// HOSTNAME → WebSocket allowed-origin in hooks.server.ts; XDG_RUNTIME_DIR → VNC runtime
	// path for sparrow-wifi. Declared so the validated `env` export stays the
	// single source of truth for `process.env` reads in src/lib/server/.
	HOSTNAME: z.string().optional(),
	XDG_RUNTIME_DIR: z.string().optional()
});

// Parse and validate environment variables at startup
const parsed = envSchema.parse(process.env);

// T033: Resolve ARGOS_TEMP_DIR and ensure it exists (FR-024)
const resolvedTempDir = parsed.ARGOS_TEMP_DIR || path.join(os.tmpdir(), 'argos');
mkdirSync(resolvedTempDir, { recursive: true });

export const env = {
	...parsed,
	ARGOS_TEMP_DIR: resolvedTempDir
};
