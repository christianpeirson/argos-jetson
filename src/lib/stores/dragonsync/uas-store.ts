import { writable } from 'svelte/store';

import {
	DragonSyncDronesResponseSchema,
	DragonSyncFpvSignalsResponseSchema,
	DragonSyncStatusResultSchema
} from '$lib/schemas/dragonsync';
import type {
	DragonSyncC2Signal,
	DragonSyncDrone,
	DragonSyncFpvSignal,
	DragonSyncServiceStatus,
	DragonSyncStatusResult
} from '$lib/types/dragonsync';

export interface UASState {
	status: DragonSyncServiceStatus;
	drones: Map<string, DragonSyncDrone>;
	fpvSignals: Map<string, DragonSyncFpvSignal>;
	c2Signals: Map<string, DragonSyncC2Signal>;
	error: string | null;
	lastUpdated: number | null;
	droneidGoRunning: boolean;
	dragonSyncRunning: boolean;
	fpvScannerRunning: boolean;
	c2ScannerRunning: boolean;
	apiReachable: boolean;
}

const INITIAL_STATE: UASState = {
	status: 'stopped',
	drones: new Map(),
	fpvSignals: new Map(),
	c2Signals: new Map(),
	error: null,
	lastUpdated: null,
	droneidGoRunning: false,
	dragonSyncRunning: false,
	fpvScannerRunning: false,
	c2ScannerRunning: false,
	apiReachable: false
};

export const uasStore = writable<UASState>({
	...INITIAL_STATE,
	drones: new Map(),
	fpvSignals: new Map()
});

function buildNextStatusState(s: UASState, status: DragonSyncStatusResult): UASState {
	const transitioningToStopped = status.status === 'stopped' && s.status !== 'stopped';
	const base: UASState = {
		...s,
		status: status.status,
		droneidGoRunning: status.droneidGoRunning,
		dragonSyncRunning: status.dragonSyncRunning,
		fpvScannerRunning: status.fpvScannerRunning,
		c2ScannerRunning: status.c2ScannerRunning,
		apiReachable: status.apiReachable,
		error: status.error ?? null,
		lastUpdated: Date.now()
	};
	if (transitioningToStopped) {
		// Clear cached detections when services transition to stopped so the
		// panel doesnt keep displaying stale drones after Stop.
		return { ...base, drones: new Map(), fpvSignals: new Map(), c2Signals: new Map() };
	}
	return base;
}

function applyUASStatus(status: DragonSyncStatusResult): void {
	uasStore.update((s) => buildNextStatusState(s, status));
}

function applyUASC2Signals(signals: DragonSyncC2Signal[]): void {
	uasStore.update((s) => {
		const map = new Map<string, DragonSyncC2Signal>();
		for (const sig of signals) {
			map.set(sig.uid, sig);
		}
		return { ...s, c2Signals: map, lastUpdated: Date.now() };
	});
}

function applyUASDrones(drones: DragonSyncDrone[]): void {
	uasStore.update((s) => {
		const map = new Map<string, DragonSyncDrone>();
		for (const drone of drones) {
			map.set(drone.id, drone);
		}
		return { ...s, drones: map, lastUpdated: Date.now() };
	});
}

function applyUASFpvSignals(signals: DragonSyncFpvSignal[]): void {
	uasStore.update((s) => {
		const map = new Map<string, DragonSyncFpvSignal>();
		for (const sig of signals) {
			map.set(sig.uid, sig);
		}
		return { ...s, fpvSignals: map, lastUpdated: Date.now() };
	});
}

function setUASError(err: string): void {
	uasStore.update((s) => ({ ...s, error: err }));
}

// fallow-ignore-next-line complexity
export async function fetchUASStatus(): Promise<void> {
	try {
		const res = await fetch('/api/dragonsync/status', { credentials: 'same-origin' });
		if (!res.ok) throw new Error(`status ${res.status}`);
		const raw: unknown = await res.json();
		const parsed = DragonSyncStatusResultSchema.safeParse(raw);
		if (!parsed.success) throw new Error('invalid status response');
		applyUASStatus(parsed.data as DragonSyncStatusResult);
	} catch (err) {
		setUASError(err instanceof Error ? err.message : 'status fetch failed');
	}
}

async function parseUASResponse<R>(
	res: Response,
	label: string,
	schema: { safeParse: (d: unknown) => { success: true; data: R } | { success: false } }
): Promise<R> {
	if (!res.ok) throw new Error(`${label} ${res.status}`);
	const parsed = schema.safeParse(await res.json());
	if (!parsed.success) throw new Error(`invalid ${label} response`);
	return parsed.data;
}

async function fetchUASList<T, R>(
	url: string,
	label: string,
	schema: { safeParse: (d: unknown) => { success: true; data: R } | { success: false } },
	extract: (data: R) => T[],
	apply: (items: T[]) => void
): Promise<void> {
	try {
		const res = await fetch(url, { credentials: 'same-origin' });
		if (res.status === 503) return apply([]);
		apply(extract(await parseUASResponse(res, label, schema)));
	} catch (err) {
		setUASError(err instanceof Error ? err.message : `${label} fetch failed`);
	}
}

export async function fetchUASDrones(): Promise<void> {
	await fetchUASList(
		'/api/dragonsync/devices',
		'devices',
		DragonSyncDronesResponseSchema,
		(d) => d.drones as DragonSyncDrone[],
		applyUASDrones
	);
}

export async function fetchUASFpvSignals(): Promise<void> {
	await fetchUASList(
		'/api/dragonsync/fpv',
		'fpv',
		DragonSyncFpvSignalsResponseSchema,
		(d) => d.signals as DragonSyncFpvSignal[],
		applyUASFpvSignals
	);
}

/**
 * GET /api/dragonsync/c2 — Argos-side cache fed by the c2-subscriber child
 * process which SUBs tcp://127.0.0.1:4227 (argos-c2-scanner XPUB).
 */
// fallow-ignore-next-line complexity
export async function fetchUASC2Signals(): Promise<void> {
	try {
		const res = await fetch('/api/dragonsync/c2');
		if (!res.ok) return;
		const data = await res.json();
		if (Array.isArray(data?.signals)) {
			applyUASC2Signals(data.signals as DragonSyncC2Signal[]);
		}
	} catch {
		// transient; next poller tick will retry
	}
}

interface ControlResponse {
	success?: boolean;
	message?: string;
	error?: string;
}

async function sendControlRequest(
	body: Record<string, unknown>
): Promise<{ ok: boolean; data: ControlResponse }> {
	const res = await fetch('/api/dragonsync/control', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify(body)
	});
	const data = (await res.json()) as ControlResponse;
	return { ok: res.ok && data.success === true, data };
}

function handleControlFailure(data: ControlResponse, failLabel: string): void {
	setUASError(data.error ?? data.message ?? failLabel);
}

async function runControl(body: Record<string, unknown>, failLabel: string): Promise<boolean> {
	try {
		const { ok, data } = await sendControlRequest(body);
		if (!ok) {
			handleControlFailure(data, failLabel);
			return false;
		}
		await fetchUASStatus();
		return true;
	} catch (err) {
		setUASError(err instanceof Error ? err.message : failLabel);
		return false;
	}
}

export async function startDragonSyncFromUi(): Promise<boolean> {
	return runControl({ action: 'start' }, 'start request failed');
}

export async function stopDragonSyncFromUi(): Promise<boolean> {
	return runControl({ action: 'stop' }, 'stop request failed');
}
