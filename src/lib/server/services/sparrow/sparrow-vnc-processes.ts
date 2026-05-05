/**
 * Low-level process helpers for the Sparrow-WiFi VNC stack.
 *
 * Three-process stack: Xtigervnc (virtual display), sparrow-wifi.py (PyQt5 GUI),
 * and websockify (VNC-to-WebSocket bridge for noVNC).
 *
 * Modeled on webtak-vnc-processes.ts but simplified: no Chromium profile
 * management and no URL parameter (Sparrow GUI is self-contained).
 */

import { type ChildProcess, spawn } from 'child_process';
import { mkdirSync } from 'fs';

import { env } from '$lib/server/env';
import { logger } from '$lib/utils/logger';

import {
	centerVncWindow,
	createSpawnErrorTracker,
	isPortOpen,
	isWebsockifyResponding as isWebsockifyRespondingShared,
	killOrphansByPort as killOrphansByPortShared,
	killVncProcess,
	setVncBackground as setVncBackgroundShared,
	spawnWebsockify as spawnWebsockifyShared,
	spawnXtigervnc as spawnXtigervncShared,
	waitForStackReady as waitForStackReadyShared
} from '../vnc-common/spawn-helpers';
import {
	SPARROW_DEPTH,
	SPARROW_GEOMETRY,
	SPARROW_GUI_PATH,
	SPARROW_VNC_DISPLAY,
	SPARROW_VNC_PORT,
	SPARROW_WS_PORT
} from './sparrow-vnc-types';

const SCOPE = 'sparrow-vnc';

// ───────────────────────────── module state ──────────────────────────────

let xvncProcess: ChildProcess | null = null;
let sparrowProcess: ChildProcess | null = null;
let websockifyProcess: ChildProcess | null = null;
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

/** Spawn Xtigervnc as a combined X server + VNC server on `:98`. */
export function spawnXtigervnc(): void {
	xvncProcess = spawnXtigervncShared(
		{
			display: SPARROW_VNC_DISPLAY,
			geometry: SPARROW_GEOMETRY,
			depth: SPARROW_DEPTH,
			port: SPARROW_VNC_PORT
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

/** Set X11 background to match Lunaris dark theme (#111111). */
export function setVncBackground(): void {
	setVncBackgroundShared(SPARROW_VNC_DISPLAY, SCOPE);
}

/** Center the Sparrow GUI window within the VNC framebuffer. */
export function centerSparrowWindow(): void {
	centerVncWindow(SPARROW_VNC_DISPLAY, 'sparrow');
}

function ensureXdgRuntimeDir(): string {
	const runtimeDir = env.XDG_RUNTIME_DIR ?? '/tmp/sparrow-runtime';
	try {
		mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
	} catch (err) {
		logger.warn('[sparrow-vnc] could not create XDG_RUNTIME_DIR', {
			path: runtimeDir,
			error: err instanceof Error ? err.message : String(err)
		});
	}
	return runtimeDir;
}

/** Spawn the Sparrow-WiFi PyQt5 GUI rendering into the Xtigervnc display.
 *  Runs via sudo because iw scan requires root privileges.
 *  stdout/stderr piped to logger so errors like "Error 161" surface in argos logs. */
export function spawnSparrowGui(): void {
	const runtimeDir = ensureXdgRuntimeDir();
	sparrowProcess = spawn('/usr/bin/sudo', ['-E', '/usr/bin/python3', SPARROW_GUI_PATH], {
		env: {
			...process.env,
			DISPLAY: SPARROW_VNC_DISPLAY,
			XDG_RUNTIME_DIR: runtimeDir,
			QT_QPA_PLATFORM: 'xcb'
		},
		cwd: '/opt/sparrow-wifi',
		stdio: ['ignore', 'pipe', 'pipe'],
		detached: true
	});
	sparrowProcess.unref();
	sparrowProcess.stdout?.on('data', (buf: Buffer) => {
		const line = buf.toString('utf-8').trimEnd();
		if (line) logger.info('[sparrow-gui] ' + line);
	});
	sparrowProcess.stderr?.on('data', (buf: Buffer) => {
		const line = buf.toString('utf-8').trimEnd();
		if (line) logger.warn('[sparrow-gui] ' + line);
	});
	sparrowProcess.on('exit', (code, signal) => {
		logger.info('[sparrow-vnc] sparrow-wifi.py exited', { code, signal });
		sparrowProcess = null;
	});
	sparrowProcess.on('error', (err) => {
		recordSpawnError('sparrow-wifi.py', err);
		sparrowProcess = null;
	});
}

/** Spawn websockify to bridge the VNC port to a WebSocket. */
export function spawnWebsockify(): void {
	websockifyProcess = spawnWebsockifyShared(
		{ wsPort: SPARROW_WS_PORT, vncPort: SPARROW_VNC_PORT },
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
	return isPortOpen(SPARROW_VNC_PORT);
}

/** Probe whether websockify is responding. */
export async function isWebsockifyResponding(): Promise<boolean> {
	return isWebsockifyRespondingShared(SPARROW_WS_PORT);
}

/** Poll until both VNC and websockify are alive. */
export async function waitForStackReady(maxAttempts = 25): Promise<boolean> {
	return waitForStackReadyShared(SPARROW_VNC_PORT, SPARROW_WS_PORT, maxAttempts);
}

// ─────────────────────────────── cleanup ────────────────────────────────

/** Send SIGTERM, wait 500ms, then SIGKILL any surviving process. */
export async function killProcess(ref: ChildProcess | null, name: string): Promise<void> {
	return killVncProcess(ref, name, SCOPE);
}

/** Non-fatal fuser-kill of anything bound to the VNC or WebSocket ports. */
export async function killOrphansByPort(): Promise<void> {
	return killOrphansByPortShared(SPARROW_VNC_PORT, SPARROW_WS_PORT);
}

/** Tear down all three processes in reverse spawn order. */
export async function killAllProcesses(): Promise<void> {
	await killProcess(websockifyProcess, 'websockify');
	websockifyProcess = null;
	await killProcess(sparrowProcess, 'sparrow-wifi.py');
	sparrowProcess = null;
	await killProcess(xvncProcess, 'Xtigervnc');
	xvncProcess = null;
}

// ─────────────────────────────── state ──────────────────────────────────

export function isStackAlive(): boolean {
	// In-memory refs reset on dev server reload but detached child procs survive.
	// Fall back to tracked refs OR live TCP ports so UI doesn't show "unavailable"
	// across a hot-restart.
	if (xvncProcess !== null && sparrowProcess !== null && websockifyProcess !== null) return true;
	return false;
}

/** True when VNC + websockify TCP ports are live, even across dev server restarts. */
export async function isStackAliveByPort(): Promise<boolean> {
	const [vncOk, wsOk] = await Promise.all([isVncPortOpen(), isWebsockifyResponding()]);
	return vncOk && wsOk;
}
