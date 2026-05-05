/**
 * Public start/stop/status API for the SDR++ VNC stack.
 *
 * Orchestrates Xtigervnc + SDR++ + websockify to stream
 * the full C++ GUI into the Argos dashboard via noVNC.
 *
 * Unlike Sparrow-WiFi, SDR++ has no separate agent service.
 * This control service only manages the VNC three-process stack.
 */

import { errMsg } from '$lib/server/api/error-utils';
import { resourceManager } from '$lib/server/hardware/resource-manager';
import { HardwareDevice } from '$lib/server/hardware/types';
import { delay } from '$lib/utils/delay';
import { logger } from '$lib/utils/logger';

import { createVncShutdownHandler, throwIfSpawnError } from '../vnc-common/spawn-helpers';
import {
	centerSdrppWindow,
	clearSpawnError,
	getSpawnError,
	isStackAlive,
	killAllProcesses,
	killOrphansByPort,
	setVncBackground,
	spawnSdrppGui,
	spawnWebsockify,
	spawnXtigervnc,
	waitForStackReady
} from './sdrpp-vnc-processes';
import {
	SDRPP_WS_PATH,
	SDRPP_WS_PORT,
	type SdrppVncControlResult,
	type SdrppVncStatusResult
} from './sdrpp-vnc-types';

const SDRPP_OWNER = 'sdrpp';

async function releaseHackrf(): Promise<void> {
	await resourceManager.release(SDRPP_OWNER, HardwareDevice.HACKRF).catch(() => undefined);
}

async function claimHackrf(): Promise<SdrppVncControlResult | null> {
	const claim = await resourceManager.acquire(SDRPP_OWNER, HardwareDevice.HACKRF);
	if (claim.success) return null;
	logger.warn('[sdrpp-vnc] HackRF unavailable', { owner: claim.owner });
	return {
		success: false,
		message: `HackRF is in use by ${claim.owner ?? 'another tool'}`,
		error: `hackrf-locked-by:${claim.owner ?? 'unknown'}`
	};
}

// ───────────────────── shutdown handler (idempotent) ─────────────────────

const registerShutdownHandler = createVncShutdownHandler('sdrpp-vnc', killAllProcesses);

// ─────────────────────────────── start ──────────────────────────────────

async function spawnStackProcesses(): Promise<void> {
	clearSpawnError();

	logger.info('[sdrpp-vnc] spawning Xtigervnc');
	spawnXtigervnc();
	await delay(400);
	assertNoSpawnError();

	setVncBackground();

	logger.info('[sdrpp-vnc] spawning SDR++');
	spawnSdrppGui();
	await delay(2500);
	assertNoSpawnError();

	centerSdrppWindow();

	logger.info('[sdrpp-vnc] spawning websockify');
	spawnWebsockify();
	await delay(150);
	assertNoSpawnError();
}

function assertNoSpawnError(): void {
	throwIfSpawnError(getSpawnError);
}

async function cleanupFailedStart(): Promise<SdrppVncControlResult> {
	logger.error('[sdrpp-vnc] stack failed to become ready within timeout');
	await killAllProcesses();
	await killOrphansByPort();
	return {
		success: false,
		message: 'Failed to start SDR++ VNC stack',
		error: 'Timeout waiting for VNC and websockify to respond'
	};
}

function successResult(message: string): SdrppVncControlResult {
	return {
		success: true,
		message,
		wsPort: SDRPP_WS_PORT,
		wsPath: SDRPP_WS_PATH
	};
}

/** Start the SDR++ VNC stack. Idempotent -- returns existing session if running. */
// fallow-ignore-next-line complexity
export async function startSdrppVnc(): Promise<SdrppVncControlResult> {
	try {
		registerShutdownHandler();

		if (isStackAlive()) {
			logger.info('[sdrpp-vnc] stack already running');
			return successResult('SDR++ VNC stack already running');
		}

		const conflict = await claimHackrf();
		if (conflict) return conflict;

		await killOrphansByPort();
		await spawnStackProcesses();

		if (!(await waitForStackReady())) {
			await releaseHackrf();
			return cleanupFailedStart();
		}

		logger.info('[sdrpp-vnc] stack ready', { wsPort: SDRPP_WS_PORT });
		return successResult('SDR++ VNC stack started');
	} catch (error: unknown) {
		logger.error('[sdrpp-vnc] start error', { error: errMsg(error) });
		await killAllProcesses().catch(() => undefined);
		await releaseHackrf();
		return {
			success: false,
			message: 'Failed to start SDR++ VNC stack',
			error: errMsg(error)
		};
	}
}

// ──────────────────────────────── stop ──────────────────────────────────

export async function stopSdrppVnc(): Promise<SdrppVncControlResult> {
	try {
		logger.info('[sdrpp-vnc] stopping stack');
		await killAllProcesses();
		await killOrphansByPort();
		await releaseHackrf();
		logger.info('[sdrpp-vnc] stack stopped');
		return { success: true, message: 'SDR++ VNC stack stopped' };
	} catch (error: unknown) {
		logger.error('[sdrpp-vnc] stop error', { error: errMsg(error) });
		await releaseHackrf();
		return {
			success: false,
			message: 'Failed to stop SDR++ VNC stack',
			error: errMsg(error)
		};
	}
}

// ─────────────────────────────── status ─────────────────────────────────

export function getSdrppVncStatus(): SdrppVncStatusResult {
	const running = isStackAlive();
	return {
		success: true,
		isRunning: running,
		status: running ? 'active' : 'inactive',
		wsPort: SDRPP_WS_PORT,
		wsPath: SDRPP_WS_PATH
	};
}
