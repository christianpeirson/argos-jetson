/**
 * Low-level process helpers for the SDR++ VNC stack.
 *
 * Three-process stack: Xtigervnc (virtual display), SDR++ (C++ GUI),
 * and websockify (VNC-to-WebSocket bridge for noVNC).
 *
 * Modeled on sparrow-vnc-processes.ts but adapted for SDR++:
 * no sudo needed (SDR++ uses libusb for HackRF), wider geometry,
 * and longer init delay for the heavier C++ application.
 */

import { type ChildProcess, spawn } from 'child_process';

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
	SDRPP_DEPTH,
	SDRPP_GEOMETRY,
	SDRPP_GUI_PATH,
	SDRPP_ROOT_DIR,
	SDRPP_VNC_DISPLAY,
	SDRPP_VNC_PORT,
	SDRPP_WS_PORT
} from './sdrpp-vnc-types';

const SCOPE = 'sdrpp-vnc';

// ───────────────────────────── module state ──────────────────────────────

let xvncProcess: ChildProcess | null = null;
let sdrppProcess: ChildProcess | null = null;
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

/** Spawn Xtigervnc as a combined X server + VNC server on `:97`. */
export function spawnXtigervnc(): void {
	xvncProcess = spawnXtigervncShared(
		{
			display: SDRPP_VNC_DISPLAY,
			geometry: SDRPP_GEOMETRY,
			depth: SDRPP_DEPTH,
			port: SDRPP_VNC_PORT
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
	setVncBackgroundShared(SDRPP_VNC_DISPLAY, SCOPE);
}

/** Center the SDR++ window within the VNC framebuffer. */
export function centerSdrppWindow(): void {
	centerVncWindow(SDRPP_VNC_DISPLAY, 'SDR++');
}

/** Spawn the SDR++ GUI rendering into the Xtigervnc display.
 *  No sudo needed — SDR++ uses libusb for HackRF access. */
export function spawnSdrppGui(): void {
	sdrppProcess = spawn(SDRPP_GUI_PATH, ['-r', SDRPP_ROOT_DIR], {
		env: {
			...process.env,
			DISPLAY: SDRPP_VNC_DISPLAY,
			PULSE_SERVER: `unix:/run/user/${process.getuid?.() ?? 1000}/pulse/native`
		},
		cwd: '/opt/sdrpp',
		stdio: 'ignore',
		detached: true
	});
	sdrppProcess.unref();
	sdrppProcess.on('exit', (code, signal) => {
		logger.info('[sdrpp-vnc] sdrpp exited', { code, signal });
		sdrppProcess = null;
	});
	sdrppProcess.on('error', (err) => {
		recordSpawnError('sdrpp', err);
		sdrppProcess = null;
	});
}

/** Spawn websockify to bridge the VNC port to a WebSocket. */
export function spawnWebsockify(): void {
	websockifyProcess = spawnWebsockifyShared(
		{ wsPort: SDRPP_WS_PORT, vncPort: SDRPP_VNC_PORT },
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
	return isPortOpen(SDRPP_VNC_PORT);
}

/** Probe whether websockify is responding. */
export async function isWebsockifyResponding(): Promise<boolean> {
	return isWebsockifyRespondingShared(SDRPP_WS_PORT);
}

/** Poll until both VNC and websockify are alive. */
export async function waitForStackReady(maxAttempts = 25): Promise<boolean> {
	return waitForStackReadyShared(SDRPP_VNC_PORT, SDRPP_WS_PORT, maxAttempts);
}

// ─────────────────────────────── cleanup ────────────────────────────────

/** Send SIGTERM, wait 500ms, then SIGKILL any surviving process. */
export async function killProcess(ref: ChildProcess | null, name: string): Promise<void> {
	return killVncProcess(ref, name, SCOPE);
}

/** Non-fatal fuser-kill of anything bound to the VNC or WebSocket ports. */
export async function killOrphansByPort(): Promise<void> {
	return killOrphansByPortShared(SDRPP_VNC_PORT, SDRPP_WS_PORT);
}

/** Tear down all three processes in reverse spawn order. */
export async function killAllProcesses(): Promise<void> {
	await killProcess(websockifyProcess, 'websockify');
	websockifyProcess = null;
	await killProcess(sdrppProcess, 'sdrpp');
	sdrppProcess = null;
	await killProcess(xvncProcess, 'Xtigervnc');
	xvncProcess = null;
}

/** Check whether all three managed processes are still alive. */
export function isStackAlive(): boolean {
	return xvncProcess !== null && sdrppProcess !== null && websockifyProcess !== null;
}
