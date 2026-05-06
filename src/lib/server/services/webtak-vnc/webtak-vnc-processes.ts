/**
 * Low-level process helpers for the WebTAK VNC stack.
 *
 * Owns module-scoped `ChildProcess | null` refs for the three processes that
 * make up a single WebTAK session: `Xtigervnc` (virtual display + VNC server),
 * `chromium` (the browser pointing at the TAK URL), and `websockify` (the
 * VNC-to-WebSocket proxy the frontend connects to).
 *
 * Functions in this module are intentionally small and side-effectful. They
 * are composed by `webtak-vnc-control-service.ts`, which provides the
 * user-facing start/stop orchestration with retries, error reporting, and
 * state transitions.
 *
 * @module
 */

import { type ChildProcess, spawn } from 'child_process';

import { env } from '$lib/server/env';
import { execFileAsync } from '$lib/server/exec';
import { logger } from '$lib/utils/logger';

import { resolveBin } from '../vnc-common/resolve-bin';
import {
	createSpawnErrorTracker,
	isPortOpen,
	isWebsockifyResponding as isWebsockifyRespondingShared,
	killOrphansByPort as killOrphansByPortShared,
	killVncProcess,
	spawnWebsockify as spawnWebsockifyShared,
	spawnXtigervnc as spawnXtigervncShared,
	waitForStackReady as waitForStackReadyShared
} from '../vnc-common/spawn-helpers';
import {
	CHROMIUM_USER_DATA_DIR,
	WEBTAK_DEPTH,
	WEBTAK_GEOMETRY,
	WEBTAK_VNC_DISPLAY,
	WEBTAK_VNC_PORT,
	WEBTAK_WS_PORT
} from './webtak-vnc-types';

const SCOPE = 'webtak-vnc';

const resolveChromiumBin = () =>
	resolveBin(
		[
			env.ARGOS_WEBTAK_CHROMIUM_BIN,
			'/snap/bin/chromium',
			'/usr/bin/chromium',
			'/usr/bin/chromium-browser'
		],
		'chromium',
		'ARGOS_WEBTAK_CHROMIUM_BIN'
	);

// ───────────────────────────── module state ──────────────────────────────

let xvncProcess: ChildProcess | null = null;
let chromiumProcess: ChildProcess | null = null;
let websockifyProcess: ChildProcess | null = null;
let currentUrl: string | null = null;
const errorTracker = createSpawnErrorTracker(SCOPE);

function recordSpawnError(label: string, err: Error): void {
	errorTracker.record(label, err);
}

export function clearSpawnError(): void {
	errorTracker.clear();
}

export function getSpawnError(): Error | null {
	return errorTracker.get();
}

// ─────────────────────────────── spawn ──────────────────────────────────

// Service-specific wrapper around vnc-common/spawn-helpers.ts — bakes in
// WebTAK config (display :99, geometry, depth, port). NOT a redundant copy.
/** Spawn Xtigervnc as a combined X server + VNC server on `:99`. */
export function spawnXtigervnc(): void {
	xvncProcess = spawnXtigervncShared(
		{
			display: WEBTAK_VNC_DISPLAY,
			geometry: WEBTAK_GEOMETRY,
			depth: WEBTAK_DEPTH,
			port: WEBTAK_VNC_PORT
		},
		{
			scope: SCOPE,
			onExit: () => {
				xvncProcess = null;
			},
			onError: (err) => {
				recordSpawnError('Xtigervnc', err);
				xvncProcess = null;
			}
		}
	);
}

/** Spawn a Chromium instance rendering into the Xtigervnc display. */
export function spawnChromium(url: string): void {
	const flags = [
		'--no-sandbox',
		'--no-first-run',
		'--no-default-browser-check',
		'--disable-features=Translate',
		'--ignore-certificate-errors',
		'--test-type',
		'--disable-dev-shm-usage',
		'--disable-extensions',
		`--window-size=${WEBTAK_GEOMETRY.replace('x', ',')}`,
		'--window-position=0,0',
		`--user-data-dir=${CHROMIUM_USER_DATA_DIR}`,
		url
	];
	const bin = resolveChromiumBin();
	chromiumProcess = spawn(bin, flags, {
		env: { ...process.env, DISPLAY: WEBTAK_VNC_DISPLAY },
		stdio: 'ignore',
		detached: true
	});
	chromiumProcess.unref();
	chromiumProcess.on('exit', (code, signal) => {
		logger.info('[webtak-vnc] chromium exited', { code, signal });
		chromiumProcess = null;
	});
	chromiumProcess.on('error', (err) => {
		recordSpawnError('chromium', err);
		chromiumProcess = null;
	});
}

// Service-specific wrapper around vnc-common/spawn-helpers.ts — bakes in
// WebTAK WS + VNC port pair. NOT a redundant copy of the canonical typed export.
/** Spawn websockify to bridge the VNC port to a WebSocket. */
export function spawnWebsockify(): void {
	websockifyProcess = spawnWebsockifyShared(
		{ wsPort: WEBTAK_WS_PORT, vncPort: WEBTAK_VNC_PORT },
		{
			scope: SCOPE,
			onExit: () => {
				websockifyProcess = null;
			},
			onError: (err) => {
				recordSpawnError('websockify', err);
				websockifyProcess = null;
			}
		}
	);
}

// ─────────────────────────────── health ─────────────────────────────────

/** Probe whether the VNC TCP port is accepting connections. */
export function isVncPortOpen(): Promise<boolean> {
	return isPortOpen(WEBTAK_VNC_PORT);
}

// Service-specific wrapper around vnc-common/spawn-helpers.ts — bakes in
// WebTAK WS port. NOT a redundant copy of the canonical typed export.
/** Probe whether websockify is responding (any HTTP response is proof of life). */
export async function isWebsockifyResponding(): Promise<boolean> {
	return isWebsockifyRespondingShared(WEBTAK_WS_PORT);
}

// Service-specific wrapper around vnc-common/spawn-helpers.ts — bakes in
// WebTAK VNC + WS ports. NOT a redundant copy of the canonical typed export.
/** Poll every 200ms for up to maxAttempts × 200ms until both services are alive. */
export async function waitForStackReady(maxAttempts = 20): Promise<boolean> {
	return waitForStackReadyShared(WEBTAK_VNC_PORT, WEBTAK_WS_PORT, maxAttempts);
}

// ─────────────────────────────── cleanup ────────────────────────────────

/** Send SIGTERM, wait 500ms, then SIGKILL any surviving process. */
export async function killProcess(ref: ChildProcess | null, name: string): Promise<void> {
	return killVncProcess(ref, name, SCOPE);
}

// Service-specific wrapper around vnc-common/spawn-helpers.ts — bakes in
// WebTAK VNC + WS ports. NOT a redundant copy of the canonical typed export.
/** Non-fatal fuser-kill of anything bound to the VNC or WebSocket ports. */
export async function killOrphansByPort(): Promise<void> {
	return killOrphansByPortShared(WEBTAK_VNC_PORT, WEBTAK_WS_PORT);
}

/** Remove the scratch Chromium profile to avoid "profile already in use" errors. */
export async function purgeChromiumProfile(): Promise<void> {
	try {
		await execFileAsync('/usr/bin/rm', ['-rf', CHROMIUM_USER_DATA_DIR]);
	} catch (err) {
		logger.warn('[webtak-vnc] profile purge failed', {
			error: err instanceof Error ? err.message : String(err)
		});
	}
}

/** Tear down all three processes in reverse spawn order. */
export async function killAllProcesses(): Promise<void> {
	await killProcess(websockifyProcess, 'websockify');
	websockifyProcess = null;
	await killProcess(chromiumProcess, 'chromium');
	chromiumProcess = null;
	await killProcess(xvncProcess, 'Xtigervnc');
	xvncProcess = null;
}

// ─────────────────────────────── state ──────────────────────────────────

export function isStackAlive(): boolean {
	return xvncProcess !== null && chromiumProcess !== null && websockifyProcess !== null;
}

export function getCurrentUrl(): string | null {
	return currentUrl;
}

export function setCurrentUrl(url: string | null): void {
	currentUrl = url;
}
