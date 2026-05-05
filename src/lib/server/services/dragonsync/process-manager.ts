/**
 * DragonSync + droneid-go process manager (thin orchestrator).
 *
 * Manages two EXTERNAL systemd services (`zmq-decoder.service`,
 * `dragonsync.service`), plus optional add-ons `wardragon-fpv-detect.service`
 * (requires B205) and `argos-c2-scanner.service` (best-effort, requires
 * HackRF). Argos does NOT spawn these processes — it starts/stops them via
 * systemctl and polls the DragonSync HTTP API for detections.
 *
 * This file owns the public surface consumed by `src/routes/api/dragonsync/**`
 * and the start/stop orchestration. All internals live in peer modules:
 *
 *   - `./state`          — cached detections + poll-error accessors
 *   - `./systemd-control` — `sudo systemctl is-active|start|stop`
 *   - `./api-poller`     — HTTP polling + poller lifecycle + reachability probe
 *   - `./c2-subscriber`  — C2 Python helper subprocess + ZMQ alert ingest
 *
 * @module
 */

import { resourceManager } from '$lib/server/hardware/resource-manager';
import { HardwareDevice } from '$lib/server/hardware/types';
import type {
	DragonSyncControlResult,
	DragonSyncServiceStatus,
	DragonSyncStatusResult
} from '$lib/types/dragonsync';
import { logger } from '$lib/utils/logger';

import { checkApiReachable, startDragonSyncPoller, stopDragonSyncPoller } from './api-poller';
import {
	claimHackRFForC2,
	releaseHackRFFromC2,
	startC2Subscriber,
	stopC2Subscriber
} from './c2-subscriber';
import { clearAllCaches, getCachedDrones, getCachedFpv, readLastPollError } from './state';
import { isServiceActive, startService, stopService } from './systemd-control';

// Re-exports — routes import these from this module.
export { getDragonSyncC2Signals } from './c2-subscriber';

const FPV_OWNER = 'wardragon-fpv-detect';
const ZMQ_DECODER_SERVICE = 'zmq-decoder.service';
const DRAGONSYNC_SERVICE = 'dragonsync.service';
const FPV_SERVICE = 'wardragon-fpv-detect.service';
const C2_SERVICE = 'argos-c2-scanner.service';

// ---------------------------------------------------------------------------
// Public API — readers
// ---------------------------------------------------------------------------

function deriveServiceStatus(
	droneidGo: boolean,
	dragonSync: boolean,
	_apiReachable: boolean,
	fpvScanner: boolean,
	_c2Scanner: boolean
): DragonSyncServiceStatus {
	// apiReachable intentionally ignored in state derivation — HTTP probe races
	// with systemd on RPi5 (node event-loop lag under load). Unit state is
	// authoritative. c2Scanner intentionally NOT in the overall-running flag
	// set — C2 is an optional add-on (HackRF may be claimed by another tool);
	// status stays 'running' even if c2 is inactive.
	const flags = [droneidGo, dragonSync, fpvScanner];
	if (flags.every((f) => f)) return 'running';
	if (flags.every((f) => !f)) return 'stopped';
	return 'starting';
}

export async function getDragonSyncStatus(): Promise<DragonSyncStatusResult> {
	const [droneidGo, dragonSync, apiReachable, fpvScanner, c2Scanner] = await Promise.all([
		isServiceActive(ZMQ_DECODER_SERVICE),
		isServiceActive(DRAGONSYNC_SERVICE),
		checkApiReachable(),
		isServiceActive(FPV_SERVICE),
		isServiceActive(C2_SERVICE)
	]);

	const lastErr = readLastPollError();
	return {
		success: true,
		droneidGoRunning: droneidGo,
		dragonSyncRunning: dragonSync,
		fpvScannerRunning: fpvScanner,
		c2ScannerRunning: c2Scanner,
		status: deriveServiceStatus(droneidGo, dragonSync, apiReachable, fpvScanner, c2Scanner),
		droneCount: getCachedDrones().length,
		apiReachable,
		error: lastErr ?? undefined
	};
}

export function getDragonSyncDrones() {
	return getCachedDrones();
}

export function getDragonSyncFpvSignals() {
	return getCachedFpv();
}

export function isDragonSyncApiReachable(): boolean {
	return readLastPollError() === null;
}

export function getLastPollError(): string | null {
	return readLastPollError();
}

// ---------------------------------------------------------------------------
// Public API — start
// ---------------------------------------------------------------------------

async function claimB205ForFpv(): Promise<DragonSyncControlResult | null> {
	const claim = await resourceManager.acquire(FPV_OWNER, HardwareDevice.B205);
	if (claim.success || claim.owner === FPV_OWNER) return null;
	logger.info('[dragonsync] B205 held by competitor, force-releasing', { owner: claim.owner });
	await resourceManager.forceRelease(HardwareDevice.B205);
	const retry = await resourceManager.acquire(FPV_OWNER, HardwareDevice.B205);
	if (retry.success) return null;
	return {
		success: false,
		message: `B205 unavailable (held by ${retry.owner})`,
		error: 'b205-locked'
	};
}

function startFailure(service: string): DragonSyncControlResult {
	return {
		success: false,
		message: `Failed to start ${service}`,
		error: 'systemctl start failed'
	};
}

async function rollbackDragonSyncPrereqs(): Promise<void> {
	await stopService(DRAGONSYNC_SERVICE);
	await stopService(ZMQ_DECODER_SERVICE);
}

async function startPrereqsOrFail(): Promise<DragonSyncControlResult | null> {
	if (!(await startService(ZMQ_DECODER_SERVICE))) return startFailure(ZMQ_DECODER_SERVICE);
	if (!(await startService(DRAGONSYNC_SERVICE))) {
		await stopService(ZMQ_DECODER_SERVICE);
		return startFailure(DRAGONSYNC_SERVICE);
	}
	return null;
}

async function startFpvOrRollback(): Promise<DragonSyncControlResult | null> {
	const claimFailure = await claimB205ForFpv();
	if (claimFailure) {
		await rollbackDragonSyncPrereqs();
		return claimFailure;
	}
	if (await startService(FPV_SERVICE)) return null;
	await resourceManager.release(FPV_OWNER, HardwareDevice.B205).catch(() => undefined);
	await rollbackDragonSyncPrereqs();
	return startFailure(FPV_SERVICE);
}

/** C2 scanner = best-effort add-on. Failure never fails the whole UAS start. */
async function startC2BestEffort(): Promise<void> {
	if (!(await claimHackRFForC2())) return;
	if (await startService(C2_SERVICE)) {
		startC2Subscriber();
		return;
	}
	logger.warn('[dragonsync] C2 scanner failed to start — releasing HackRF');
	await releaseHackRFFromC2();
}

export async function startDragonSync(): Promise<DragonSyncControlResult> {
	logger.info('[dragonsync] Starting zmq-decoder + dragonsync + wardragon-fpv-detect');
	const prereqsFail = await startPrereqsOrFail();
	if (prereqsFail) return prereqsFail;
	const fpvFail = await startFpvOrRollback();
	if (fpvFail) return fpvFail;
	await startC2BestEffort();
	startDragonSyncPoller();
	return { success: true, message: 'DragonSync services started' };
}

// ---------------------------------------------------------------------------
// Public API — stop
// ---------------------------------------------------------------------------

const STOP_SERVICES: readonly [string, string][] = [
	[FPV_SERVICE, 'wardragon-fpv-detect'],
	[DRAGONSYNC_SERVICE, 'dragonsync'],
	[ZMQ_DECODER_SERVICE, 'zmq-decoder'],
	[C2_SERVICE, 'argos-c2-scanner']
];

async function releaseAllSdrClaims(): Promise<void> {
	await resourceManager.release(FPV_OWNER, HardwareDevice.B205).catch(() => undefined);
	await releaseHackRFFromC2();
}

export async function stopDragonSync(): Promise<DragonSyncControlResult> {
	logger.info(
		'[dragonsync] Stopping wardragon-fpv-detect + dragonsync + zmq-decoder + c2-scanner'
	);
	stopDragonSyncPoller();
	stopC2Subscriber();

	const results = await Promise.all(STOP_SERVICES.map(([svc]) => stopService(svc)));
	await releaseAllSdrClaims();
	clearAllCaches();

	const failed = STOP_SERVICES.filter((_, i) => !results[i]).map(([, label]) => label);
	if (failed.length === 0) return { success: true, message: 'DragonSync services stopped' };
	logger.warn(`[dragonsync] Failed to stop: ${failed.join(', ')}`);
	return { success: false, message: `Failed to stop: ${failed.join(', ')}` };
}
