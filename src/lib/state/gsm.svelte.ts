// spec-024 PR10b T052 — Mk II GSM screen client state.
//
// Polls /api/gsm-evil/imsi-data (5 s) + /api/gsm-evil/status (3 s).
// Lazy POST /api/gsm-evil/tower-location for unique cells (mcc/mnc/
// lac/ci) — caches the result in towerCache so a second IMSI on the
// same cell doesn't re-fetch. Tuner state holds the user-entered
// frequency MHz string + scanner running flag.
//
// All fields normalize to typed nulls when missing — the screen
// renders the empty-state token "—" for any null cell. No fabricated
// data; tower lookups never invent coordinates.

import type { CellLocation, ImsiRow, ImsiSortDir, ImsiSortKey } from '$lib/types/imsi-row';
import { fetchTowerLocation } from '$lib/utils/gsm-tower-lookup';

const IMSI_POLL_MS = 5_000;
const STATUS_POLL_MS = 3_000;

interface ImsiApi {
	id: number;
	imsi: string;
	tmsi?: string;
	mcc?: string;
	mnc?: string;
	lac?: string;
	ci?: string;
	datetime?: string;
}

interface ImsiResponse {
	success?: boolean;
	count?: number;
	data?: ImsiApi[];
}

interface StatusResponse {
	status?: 'running' | 'stopped';
	details?: {
		grgsm?: { isRunning?: boolean; frequency?: string };
		gsmevil?: { isRunning?: boolean };
		dataCollection?: { active?: boolean; packetsReceived?: number };
	};
}

function asString(v: unknown): string | null {
	return typeof v === 'string' && v.length > 0 ? v : null;
}

function parseDatetime(v: string | undefined): number | null {
	if (typeof v !== 'string' || v.length === 0) return null;
	const t = Date.parse(v);
	return Number.isFinite(t) ? t : null;
}

function normalize(d: ImsiApi): ImsiRow {
	return {
		id: d.id,
		imsi: d.imsi,
		tmsi: asString(d.tmsi),
		mcc: asString(d.mcc),
		mnc: asString(d.mnc),
		lac: asString(d.lac),
		ci: asString(d.ci),
		datetime: parseDatetime(d.datetime)
	};
}

type Sortable = string | number;

function rawCompare(a: Sortable, b: Sortable): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

// fallow-ignore-next-line complexity
function compareNullable(a: Sortable | null, b: Sortable | null, dir: ImsiSortDir): number {
	if (a === null) return b === null ? 0 : 1;
	if (b === null) return -1;
	const cmp = rawCompare(a, b);
	return dir === 'asc' ? cmp : -cmp;
}

function defaultDirFor(key: ImsiSortKey): ImsiSortDir {
	return key === 'datetime' ? 'desc' : 'asc';
}

// fallow-ignore-next-line complexity
function cellKey(r: ImsiRow): string | null {
	if (!r.mcc || !r.mnc || !r.lac || !r.ci) return null;
	return `${r.mcc}-${r.mnc}-${r.lac}-${r.ci}`;
}

function readErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function createGsmStore() {
	let rows = $state<ImsiRow[]>([]);
	let running = $state(false);
	let frequencyMHz = $state<string | null>(null);
	let lastError = $state<string | null>(null);
	let sortKey = $state<ImsiSortKey>('datetime');
	let sortDir = $state<ImsiSortDir>('desc');
	let selectedId = $state<number | null>(null);
	let towerCache = $state<Record<string, CellLocation | null>>({});

	const sortedRows = $derived.by<ImsiRow[]>(() => {
		const out = [...rows];
		out.sort((a, b) => compareNullable(a[sortKey], b[sortKey], sortDir));
		return out;
	});

	const selected = $derived<ImsiRow | null>(
		selectedId === null ? null : (rows.find((r) => r.id === selectedId) ?? null)
	);

	const selectedTower = $derived.by<CellLocation | null>(() => {
		if (!selected) return null;
		const key = cellKey(selected);
		return key === null ? null : (towerCache[key] ?? null);
	});

	let imsiTimer: ReturnType<typeof setInterval> | null = null;
	let statusTimer: ReturnType<typeof setInterval> | null = null;

	function applyImsiBody(body: ImsiResponse): void {
		const list = (body.data ?? []).map(normalize);
		rows = list;
		lastError = null;
	}

	async function pollImsi(): Promise<void> {
		try {
			const res = await fetch('/api/gsm-evil/imsi-data', {
				headers: { accept: 'application/json' }
			});
			if (!res.ok) {
				lastError = `HTTP ${res.status}`;
				return;
			}
			applyImsiBody((await res.json()) as ImsiResponse);
		} catch (err) {
			lastError = readErrorMessage(err);
		}
	}

	function isRunningFromStatus(body: StatusResponse): boolean {
		if (body.status === 'running') return true;
		const grgsm = body.details?.grgsm;
		return grgsm !== undefined && grgsm.isRunning === true;
	}

	function applyStatusBody(body: StatusResponse): void {
		running = isRunningFromStatus(body);
		frequencyMHz = body.details?.grgsm?.frequency ?? null;
	}

	async function pollStatus(): Promise<void> {
		try {
			const res = await fetch('/api/gsm-evil/status', {
				headers: { accept: 'application/json' }
			});
			if (!res.ok) return;
			applyStatusBody((await res.json()) as StatusResponse);
		} catch {
			running = false;
		}
	}

	// fallow-ignore-next-line complexity
	async function lookupTower(row: ImsiRow): Promise<void> {
		const key = cellKey(row);
		if (key === null || key in towerCache) return;
		towerCache = { ...towerCache, [key]: null };
		try {
			const loc = await fetchTowerLocation(row);
			if (loc !== null) towerCache = { ...towerCache, [key]: loc };
		} catch {
			// keep null in cache; UI shows "—"
		}
	}

	function start(): void {
		if (imsiTimer !== null) return;
		void pollImsi();
		void pollStatus();
		imsiTimer = setInterval(() => void pollImsi(), IMSI_POLL_MS);
		statusTimer = setInterval(() => void pollStatus(), STATUS_POLL_MS);
	}

	function stop(): void {
		if (imsiTimer !== null) clearInterval(imsiTimer);
		if (statusTimer !== null) clearInterval(statusTimer);
		imsiTimer = null;
		statusTimer = null;
	}

	function toggleSort(key: ImsiSortKey): void {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
			return;
		}
		sortKey = key;
		sortDir = defaultDirFor(key);
	}

	function select(id: number | null): void {
		selectedId = id;
		const row = id === null ? null : rows.find((r) => r.id === id);
		if (row) void lookupTower(row);
	}

	async function startScanner(freq: string): Promise<void> {
		try {
			const res = await fetch('/api/gsm-evil/control', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'start', frequency: freq })
			});
			if (!res.ok) lastError = `HTTP ${res.status}`;
			else lastError = null;
			void pollStatus();
		} catch (err) {
			lastError = readErrorMessage(err);
		}
	}

	async function stopScanner(): Promise<void> {
		try {
			const res = await fetch('/api/gsm-evil/control', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'stop' })
			});
			if (!res.ok) lastError = `HTTP ${res.status}`;
			else lastError = null;
			void pollStatus();
		} catch (err) {
			lastError = readErrorMessage(err);
		}
	}

	return {
		get rows() {
			return rows;
		},
		get sortedRows() {
			return sortedRows;
		},
		get selected() {
			return selected;
		},
		get selectedId() {
			return selectedId;
		},
		get selectedTower() {
			return selectedTower;
		},
		get sortKey() {
			return sortKey;
		},
		get sortDir() {
			return sortDir;
		},
		get running() {
			return running;
		},
		get frequencyMHz() {
			return frequencyMHz;
		},
		get lastError() {
			return lastError;
		},
		start,
		stop,
		toggleSort,
		select,
		startScanner,
		stopScanner
	};
}

export const gsmStore = createGsmStore();
