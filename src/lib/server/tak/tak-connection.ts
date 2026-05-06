/**
 * TAK server TLS connection primitives.
 *
 * Pure helpers for validating config, loading certificates, building the
 * `ssl://` connect URL, opening the TAK socket, and computing reconnect
 * backoff. Each is stateless — callers own the resulting TAK handle.
 *
 * The one intentional `rejectUnauthorized: false` in `openTakConnection` is
 * scoped to the single TAK socket (not process-wide — see Task #1 TLS-mutex
 * fix in `tls-mutex.ts`). TAK servers frequently present self-signed CAs
 * bundled in the enrollment .p12 that the system trust store doesn't carry.
 *
 * @module
 */

import TAK from '@tak-ps/node-tak';
import { readFile } from 'fs/promises';

import { logger } from '$lib/utils/logger';

import type { TakServerConfig } from '../../types/tak';

/** Initial exponential-backoff delay for reconnect attempts. */
const RECONNECT_BASE_MS = 1000;
/** Upper bound on reconnect delay regardless of attempt count. */
const RECONNECT_MAX_MS = 30000;
/** Activity-silence threshold above which `getStatus()` reports `stale`. */
export const STALE_THRESHOLD_MS = 120_000;

/**
 * `TakServerConfig` with the optional cert/key paths proven non-empty.
 * Returned by `validateTlsConfig` so downstream callers don't need `!`.
 */
export type ValidatedTakConfig = TakServerConfig & { certPath: string; keyPath: string };

/** PEM-encoded TAK client credentials (optional CA for non-system-trusted roots). */
export interface TakCerts {
	cert: string;
	key: string;
	ca?: string;
}

/** Result of `loadCertificates`. `error` is surfaced in the status broadcast. */
export type CertLoadResult = { ok: true; certs: TakCerts } | { ok: false; error: string };

/** Narrow the config to its TLS-valid form, or return null with a warning. */
export function validateTlsConfig(cfg: TakServerConfig | null): ValidatedTakConfig | null {
	if (!cfg) {
		logger.warn('[TakService] No configuration found');
		return null;
	}
	if (!cfg.certPath || !cfg.keyPath) {
		logger.warn('[TakService] TLS certificates not configured');
		return null;
	}
	// TS can't widen field-level narrowing back into the object type, so this
	// assertion just expresses what the early-returns above already enforce.
	return cfg as ValidatedTakConfig;
}

/** Load PEM cert+key (+optional CA) from disk. */
export async function loadCertificates(config: ValidatedTakConfig): Promise<CertLoadResult> {
	try {
		const cert = await readFile(config.certPath, 'utf-8');
		const key = await readFile(config.keyPath, 'utf-8');
		const ca = config.caPath ? await readFile(config.caPath, 'utf-8') : undefined;
		return { ok: true, certs: { cert, key, ca } };
	} catch (err) {
		logger.error('[TakService] Failed to load certificates', { error: String(err) });
		return {
			ok: false,
			error: err instanceof Error ? err.message : 'Certificate load failed'
		};
	}
}

/** Build the `ssl://hostname:port` URL TAK expects. */
function buildTakUrl(config: ValidatedTakConfig): URL {
	return new URL(`ssl://${config.hostname}:${config.port}`);
}

/**
 * Open the TAK TLS connection.
 *
 * `rejectUnauthorized: false` is passed per-socket via `tls.connect` options
 * (TAK.connect forwards them) and applies ONLY to this socket — no
 * process-wide `NODE_TLS_REJECT_UNAUTHORIZED` mutation. See Task #1 TLS-mutex
 * fix for the alternative (`withTlsDisabled`) used by enrollment/fetch paths
 * that lack the rejectUnauthorized option.
 */
export async function openTakConnection(config: ValidatedTakConfig, certs: TakCerts): Promise<TAK> {
	const url = buildTakUrl(config);
	return TAK.connect(url, { ...certs, rejectUnauthorized: false });
}

/** Exponential backoff with ±base jitter, capped at `RECONNECT_MAX_MS`. */
export function computeReconnectDelay(attempt: number): number {
	const expDelay = RECONNECT_BASE_MS * Math.pow(2, attempt);
	const jitter = Math.random() * RECONNECT_BASE_MS;
	return Math.min(expDelay + jitter, RECONNECT_MAX_MS);
}
