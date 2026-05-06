// spec-024 PR5b T030 — Mk II MissionStrip client state.
//
// Holds the active-mission selection + the full list, talks to
// /api/missions/list (GET), /api/missions/:id (GET/PATCH), and
// /api/missions/:id/activate (POST). Server-side persistence is
// authoritative; localStorage is intentionally NOT used so a cold
// reload always reflects the SQLite truth.
//
// Module-scope $state is fine: Svelte 5 schedules updates lazily and
// every reader through the exposed getter opts in automatically.

import { recordEvent } from '$lib/state/events.svelte';
import type { Mission, MissionCreateInput, MissionPatch } from '$lib/types/mission';

interface MissionsResponse {
	success: boolean;
	missions?: Mission[];
	error?: string;
}

interface MissionResponse {
	success: boolean;
	mission?: Mission;
	error?: string;
}

function isOkOr404(res: Response): boolean {
	return res.ok || res.status === 404;
}

function extractErrorText(body: { error?: string } | null, status: number): string {
	return body?.error ?? `HTTP ${status}`;
}

/**
 * Read a JSON envelope from the response, preferring server-provided
 * `error` text over a generic `HTTP <status>` so the strip surfaces
 * actionable detail (e.g. "patch must include at least one field").
 * 404 is allowed through because get/patch handlers return a body
 * with a meaningful error on missing rows.
 */
async function readJson<T>(res: Response): Promise<T> {
	const body = (await res.json().catch(() => null)) as
		| (T & { success?: boolean; error?: string })
		| null;
	if (!isOkOr404(res)) throw new Error(extractErrorText(body, res.status));
	if (!body) throw new Error(`empty response (HTTP ${res.status})`);
	return body as T;
}

function unwrapMission(json: { success: boolean; mission?: Mission; error?: string }): Mission {
	if (!json.success || !json.mission) throw new Error(json.error ?? 'request failed');
	return json.mission;
}

function unwrapMissions(json: {
	success: boolean;
	missions?: Mission[];
	error?: string;
}): Mission[] {
	if (!json.success || !json.missions) throw new Error(json.error ?? 'no missions');
	return json.missions;
}

// Mutators handed to module-scope fetchers so the factory stays thin.
interface StoreOps {
	setMissions(next: Mission[]): void;
	prependMission(m: Mission): void;
	replaceMission(updated: Mission): void;
	setError(err: unknown): null;
	clearError(): void;
	markLoaded(): void;
}

async function fetchLoad(ops: StoreOps): Promise<void> {
	try {
		const res = await fetch('/api/missions/list');
		ops.setMissions(unwrapMissions(await readJson<MissionsResponse>(res)));
		ops.clearError();
	} catch (err) {
		ops.setError(err);
	} finally {
		ops.markLoaded();
	}
}

async function fetchSetActive(ops: StoreOps, id: string): Promise<void> {
	try {
		const res = await fetch(`/api/missions/${encodeURIComponent(id)}/activate`, {
			method: 'POST'
		});
		const m = unwrapMission(await readJson<MissionResponse>(res));
		ops.replaceMission(m);
		ops.clearError();
		recordEvent('info', 'missions', { action: 'activate', id: m.id, name: m.name });
	} catch (err) {
		ops.setError(err);
		recordEvent('error', 'missions', {
			action: 'activate',
			id,
			error: err instanceof Error ? err.message : String(err)
		});
	}
}

async function fetchPatch(ops: StoreOps, id: string, body: MissionPatch): Promise<Mission | null> {
	if (Object.keys(body).length === 0) return null;
	try {
		const res = await fetch(`/api/missions/${encodeURIComponent(id)}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		const m = unwrapMission(await readJson<MissionResponse>(res));
		ops.replaceMission(m);
		ops.clearError();
		recordEvent('info', 'missions', { action: 'patch', id: m.id, fields: Object.keys(body) });
		return m;
	} catch (err) {
		return ops.setError(err);
	}
}

async function fetchCreate(ops: StoreOps, input: MissionCreateInput): Promise<Mission | null> {
	try {
		const res = await fetch('/api/missions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});
		const m = unwrapMission(await readJson<MissionResponse>(res));
		ops.prependMission(m);
		if (m.active) ops.replaceMission(m);
		ops.clearError();
		recordEvent('info', 'missions', { action: 'create', id: m.id, name: m.name });
		return m;
	} catch (err) {
		return ops.setError(err);
	}
}

function reconcileReplacement(list: Mission[], updated: Mission): Mission[] {
	const next = list.map((m) => (m.id === updated.id ? updated : m));
	// active flag is single-row at the DB layer; toggling it true must
	// clear active on every other row in our local mirror.
	if (!updated.active) return next;
	return next.map((m) => (m.id === updated.id ? m : { ...m, active: false }));
}

function createMissionStore() {
	let missions = $state<Mission[]>([]);
	let lastError = $state<string | null>(null);
	let loaded = $state<boolean>(false);
	const active = $derived<Mission | null>(missions.find((m) => m.active) ?? null);

	const ops: StoreOps = {
		setMissions: (next) => {
			missions = next;
		},
		prependMission: (m) => {
			missions = [m, ...missions];
		},
		replaceMission: (updated) => {
			missions = reconcileReplacement(missions, updated);
		},
		setError: (err) => {
			lastError = err instanceof Error ? err.message : String(err);
			return null;
		},
		clearError: () => {
			lastError = null;
		},
		markLoaded: () => {
			loaded = true;
		}
	};

	return {
		get missions() {
			return missions;
		},
		get active() {
			return active;
		},
		get lastError() {
			return lastError;
		},
		get loaded() {
			return loaded;
		},
		load: () => fetchLoad(ops),
		setActive: (id: string) => fetchSetActive(ops, id),
		patch: (id: string, body: MissionPatch) => fetchPatch(ops, id, body),
		create: (input: MissionCreateInput) => fetchCreate(ops, input)
	};
}

export const missionStore = createMissionStore();
