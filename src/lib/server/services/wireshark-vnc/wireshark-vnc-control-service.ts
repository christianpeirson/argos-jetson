/**
 * Public start/stop/status API for the Wireshark VNC stack.
 *
 * Orchestrates Xtigervnc + Wireshark + websockify to stream the Qt GUI into
 * the Argos dashboard via noVNC. Mirrors the WebTAK control service pattern.
 *
 * Wireshark has no hardware lock to claim — packet capture is managed by
 * `dumpcap` with CAP_NET_RAW / CAP_NET_ADMIN capabilities set via `setcap`.
 *
 * Install docs:
 *   https://www.wireshark.org/docs/wsdg_html_chunked/ChSrcBinary
 */

import { errMsg } from '$lib/server/api/error-utils';
import { delay } from '$lib/utils/delay';
import { logger } from '$lib/utils/logger';

import { throwIfSpawnError } from '../vnc-common/spawn-helpers';
import {
	assertWiresharkGroupMember,
	clearSpawnError,
	getCurrentFilter,
	getCurrentIface,
	getSpawnError,
	isStackAlive,
	killAllProcesses,
	killOrphansByPort,
	setCurrentCapture,
	setVncBackground,
	spawnWebsockify,
	spawnWiresharkGui,
	spawnXtigervnc,
	validateDisplayFilter,
	waitForStackReady
} from './wireshark-vnc-processes';
import {
	WIRESHARK_DEFAULT_FILTER,
	WIRESHARK_DEFAULT_IFACE,
	WIRESHARK_WS_PATH,
	WIRESHARK_WS_PORT,
	type WiresharkVncControlResult,
	type WiresharkVncStatusResult
} from './wireshark-vnc-types';

// ───────────────────── shutdown handler (idempotent) ─────────────────────
//
// Registration flag lives on globalThis so Vite HMR reloads of this module
// don't re-register the listeners each time (stacking handlers on every
// edit would eventually exceed Node's default maxListeners). Typed in
// src/app.d.ts as __argos_wiresharkVnc_shutdown_registered.

function registerShutdownHandler(): void {
	if (globalThis.__argos_wiresharkVnc_shutdown_registered) return;
	globalThis.__argos_wiresharkVnc_shutdown_registered = true;
	const handler = () => {
		logger.info('[wireshark-vnc] received shutdown signal, tearing down stack');
		void killAllProcesses();
	};
	// Only SIGTERM / SIGINT — the 'exit' event runs synchronously and the
	// process terminates immediately after, so the async killAllProcesses()
	// would never complete. Orphan cleanup on hard exit is covered by the
	// child processes' `detached: true` + parent-death semantics and by
	// `killOrphansByPort()` run at the start of the next stack spawn.
	process.once('SIGTERM', handler);
	process.once('SIGINT', handler);
}

// ─────────────────────────────── start ──────────────────────────────────

async function spawnStackProcesses(iface: string, filter: string): Promise<void> {
	clearSpawnError();

	logger.info('[wireshark-vnc] spawning Xtigervnc');
	spawnXtigervnc();
	await delay(400);
	assertNoSpawnError();

	setVncBackground();

	logger.info('[wireshark-vnc] spawning wireshark', { iface, filter });
	spawnWiresharkGui(iface, filter);
	// Qt + Wireshark dissector load is heavier than websockify; allow ~2s.
	await delay(2000);
	assertNoSpawnError();

	logger.info('[wireshark-vnc] spawning websockify');
	spawnWebsockify();
	await delay(150);
	assertNoSpawnError();
}

function assertNoSpawnError(): void {
	throwIfSpawnError(getSpawnError);
}

async function cleanupFailedStart(): Promise<WiresharkVncControlResult> {
	logger.error('[wireshark-vnc] stack failed to become ready within timeout');
	await killAllProcesses();
	await killOrphansByPort();
	return {
		success: false,
		message: 'Failed to start Wireshark VNC stack',
		error: 'Timeout waiting for VNC and websockify to respond'
	};
}

function successResult(iface: string, filter: string, message: string): WiresharkVncControlResult {
	return {
		success: true,
		message,
		wsPort: WIRESHARK_WS_PORT,
		wsPath: WIRESHARK_WS_PATH,
		iface,
		filter
	};
}

/** Returns a short-circuit result if the existing stack is reusable; else null. */
async function handleExistingStack(
	iface: string,
	filter: string
): Promise<WiresharkVncControlResult | null> {
	if (!isStackAlive()) return null;
	if (getCurrentIface() === iface && getCurrentFilter() === filter) {
		logger.info('[wireshark-vnc] stack already running for requested capture');
		return successResult(iface, filter, 'Wireshark VNC stack already running');
	}
	logger.info('[wireshark-vnc] capture changed, restarting stack');
	await stopWiresharkVnc();
	return null;
}

function filterRejectedResult(filter: string, reason: string): WiresharkVncControlResult {
	return {
		success: false,
		message: 'Invalid Wireshark display filter',
		error: reason,
		filter
	};
}

async function runStart(iface: string, filter: string): Promise<WiresharkVncControlResult> {
	registerShutdownHandler();
	await assertWiresharkGroupMember();

	const reuse = await handleExistingStack(iface, filter);
	if (reuse) return reuse;

	const filterError = await validateDisplayFilter(filter);
	if (filterError) {
		logger.warn('[wireshark-vnc] rejected invalid display filter', { filter, filterError });
		return filterRejectedResult(filter, filterError);
	}

	await killOrphansByPort();
	await spawnStackProcesses(iface, filter);

	if (!(await waitForStackReady())) return cleanupFailedStart();

	setCurrentCapture(iface, filter);
	logger.info('[wireshark-vnc] stack ready', { wsPort: WIRESHARK_WS_PORT, iface, filter });
	return successResult(iface, filter, 'Wireshark VNC stack started');
}

/**
 * Start the Wireshark VNC stack capturing on the requested interface + filter.
 * Idempotent: same iface + filter returns existing session; change forces restart.
 */
export async function startWiresharkVnc(
	iface: string = WIRESHARK_DEFAULT_IFACE,
	filter: string = WIRESHARK_DEFAULT_FILTER
): Promise<WiresharkVncControlResult> {
	try {
		return await runStart(iface, filter);
	} catch (error: unknown) {
		logger.error('[wireshark-vnc] start error', { error: errMsg(error) });
		await killAllProcesses().catch(() => undefined);
		return {
			success: false,
			message: 'Failed to start Wireshark VNC stack',
			error: errMsg(error)
		};
	}
}

// ──────────────────────────────── stop ──────────────────────────────────

export async function stopWiresharkVnc(): Promise<WiresharkVncControlResult> {
	try {
		logger.info('[wireshark-vnc] stopping stack');
		await killAllProcesses();
		await killOrphansByPort();
		logger.info('[wireshark-vnc] stack stopped');
		return { success: true, message: 'Wireshark VNC stack stopped' };
	} catch (error: unknown) {
		logger.error('[wireshark-vnc] stop error', { error: errMsg(error) });
		return {
			success: false,
			message: 'Failed to stop Wireshark VNC stack',
			error: errMsg(error)
		};
	}
}

// ─────────────────────────────── status ─────────────────────────────────

export function getWiresharkVncStatus(): WiresharkVncStatusResult {
	const running = isStackAlive();
	return {
		success: true,
		isRunning: running,
		status: running ? 'active' : 'inactive',
		wsPort: WIRESHARK_WS_PORT,
		wsPath: WIRESHARK_WS_PATH,
		iface: getCurrentIface(),
		filter: getCurrentFilter()
	};
}
