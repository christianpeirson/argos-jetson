// spec-024 PR10a T053 — Mk II Kismet screen client state.
//
// Polls /api/kismet/devices on a 3 s cadence and exposes a sorted +
// selection view for ScreenKismet.svelte. Module-scope $state — every
// reader through the getter opts in automatically. Server-side response
// is the truth source; no localStorage so a cold reload reflects the
// live Kismet feed.
//
// Field mapping intentionally collapses /api/kismet/devices'
// Record<string, unknown> shape into the trim KismetDevice rendered by
// the table. This is normalization, not fabrication — every output
// field maps to a real input field; missing inputs surface as null,
// rendered by the screen as the empty-state token "—".

import type { KismetDevice, KismetSortDir, KismetSortKey } from '$lib/types/kismet-device';

import { compareNullable } from './sort-helpers';

const POLL_MS = 3_000;

interface ApiResponse {
	devices?: Record<string, unknown>[];
	source?: string;
	status?: { isRunning?: boolean; deviceCount?: number };
	error?: string;
}

function asString(v: unknown): string | null {
	return typeof v === 'string' && v.length > 0 ? v : null;
}

// fallow-ignore-next-line complexity
function asNumber(v: unknown): number | null {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string') {
		const n = Number(v);
		if (Number.isFinite(n)) return n;
	}
	return null;
}

function pickRssi(d: Record<string, unknown>): number | null {
	const direct = asNumber(d.signal) ?? asNumber(d.signalStrength);
	if (direct !== null) return direct;
	const sigObj = d.signal as Record<string, unknown> | undefined;
	return sigObj ? asNumber(sigObj.last_signal) : null;
}

function readTimestampField(d: Record<string, unknown>): unknown {
	return d.lastSeen ?? d.last_time ?? d.lastTime;
}

function tsFromNumber(v: number): number {
	return v < 1e12 ? v * 1000 : v; // unix-seconds → ms
}

function tsFromString(v: string): number | null {
	const t = Date.parse(v);
	return Number.isFinite(t) ? t : null;
}

function pickLastSeen(d: Record<string, unknown>): number | null {
	const v = readTimestampField(d);
	if (typeof v === 'number' && Number.isFinite(v)) return tsFromNumber(v);
	if (typeof v === 'string') return tsFromString(v);
	return null;
}

// fallow-ignore-next-line complexity
function normalize(d: Record<string, unknown>): KismetDevice | null {
	const mac = asString(d.mac) ?? asString(d.macaddr);
	if (mac === null) return null;
	return {
		mac,
		vendor: asString(d.manufacturer) ?? asString(d.vendor),
		ssid: asString(d.ssid) ?? asString(d.name),
		channel: asNumber(d.channel),
		rssiDbm: pickRssi(d),
		lastSeen: pickLastSeen(d)
	};
}

function defaultDirFor(key: KismetSortKey): KismetSortDir {
	return key === 'rssiDbm' || key === 'lastSeen' ? 'desc' : 'asc';
}

function createKismetStore() {
	let devices = $state<KismetDevice[]>([]);
	let connected = $state(false);
	let lastError = $state<string | null>(null);
	let sortKey = $state<KismetSortKey>('rssiDbm');
	let sortDir = $state<KismetSortDir>('desc');
	let selectedMac = $state<string | null>(null);

	const sortedDevices = $derived.by<KismetDevice[]>(() => {
		const out = [...devices];
		out.sort((a, b) => compareNullable(a[sortKey], b[sortKey], sortDir));
		return out;
	});

	const selected = $derived<KismetDevice | null>(
		selectedMac === null ? null : (devices.find((d) => d.mac === selectedMac) ?? null)
	);

	let timer: ReturnType<typeof setInterval> | null = null;

	function applyResponseBody(body: ApiResponse): void {
		devices = (body.devices ?? []).map(normalize).filter((d): d is KismetDevice => d !== null);
		connected = body.source === 'kismet';
		lastError = body.error ?? null;
	}

	function readErrorMessage(err: unknown): string {
		return err instanceof Error ? err.message : String(err);
	}

	async function poll(): Promise<void> {
		try {
			const res = await fetch('/api/kismet/devices', {
				headers: { accept: 'application/json' }
			});
			if (!res.ok) {
				lastError = `HTTP ${res.status}`;
				connected = false;
				return;
			}
			applyResponseBody((await res.json()) as ApiResponse);
		} catch (err) {
			connected = false;
			lastError = readErrorMessage(err);
		}
	}

	function start(): void {
		if (timer !== null) return;
		void poll();
		timer = setInterval(() => void poll(), POLL_MS);
	}

	function stop(): void {
		if (timer !== null) clearInterval(timer);
		timer = null;
	}

	function toggleSort(key: KismetSortKey): void {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
			return;
		}
		sortKey = key;
		sortDir = defaultDirFor(key);
	}

	function select(mac: string | null): void {
		selectedMac = mac;
	}

	return {
		get devices() {
			return devices;
		},
		get sortedDevices() {
			return sortedDevices;
		},
		get selected() {
			return selected;
		},
		get selectedMac() {
			return selectedMac;
		},
		get sortKey() {
			return sortKey;
		},
		get sortDir() {
			return sortDir;
		},
		get connected() {
			return connected;
		},
		get lastError() {
			return lastError;
		},
		start,
		stop,
		toggleSort,
		select
	};
}

export const kismetStore = createKismetStore();
