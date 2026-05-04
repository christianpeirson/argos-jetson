// spec-024 — chassis live data wiring (Topbar + Statusbar + WeatherButton).
//
// The Mk II chassis (`src/routes/dashboard/mk2/+layout.svelte`) was wired in
// PR1/PR2 with prop-based components but the layout never instantiated the
// pollers, so Topbar/Statusbar showed `—` placeholders forever even though
// /api/system/metrics + /api/gps/position + /api/weather/metar all return
// live data. This module owns all chassis-level pollers in one place; the
// layout reads from `chassisState` and passes props to its children.
//
// Pollers run only in the browser; SSR sees the initial empty state.

import { onDestroy } from 'svelte';

import { browser } from '$app/environment';
import type { WeatherReport } from '$lib/types/weather';
import { type Airport, findNearest, loadAirports } from '$lib/utils/airports';

// Intentionally slower than per-screen pollers (HostMetricsTab @1.2s,
// SensorTile @1.2s) — the chassis Statusbar is glanceable furniture, not a
// trend chart. Polling at 1-2s rate would compound with screen-level pollers
// and exhaust the /api/* 200 req/min rate limit on cold-load. A future PR
// can consolidate system/metrics into a single shared store.
const METRICS_INTERVAL_MS = 5_000;
const GPS_INTERVAL_MS = 5_000;
const WEATHER_INTERVAL_MS = 15 * 60 * 1_000; // 15 min — METAR endpoint cache TTL

interface SystemMetrics {
	cpu?: { usage: number; temperature: number };
	memory?: { total: number; used: number; percentage: number };
	disk?: { available: number; percentage: number };
	network?: { rx: number; tx: number };
}

interface GpsPosition {
	latitude: number;
	longitude: number;
	satellites?: number;
	fix?: number;
}

interface ChassisState {
	system: {
		cpuPct?: number;
		memUsedGb?: number;
		memTotalGb?: number;
		tempC?: number;
		nvmeFreeGb?: number;
	};
	link: { state?: 'up' | 'down' | 'degraded'; throughput?: string };
	gps: { lat?: number; lon?: number; satellites?: number; fix?: number };
	station: { icao?: string; name?: string };
	weather: { wx: WeatherReport | null; loading: boolean; error: string | null };
	session: string;
}

const BYTES_PER_GB = 1024 ** 3;

function gb(bytes: number | undefined): number | undefined {
	return bytes == null ? undefined : bytes / BYTES_PER_GB;
}

interface GpsFix {
	lat: number;
	lon: number;
	satellites?: number;
	fix?: number;
}

// Endpoint contract narrows latitude/longitude to `number` in our local type
// but the wire payload allows `null` until GPS gets a fix. Centralise the
// success/null guard so pollGps() stays under the cyclomatic-complexity cap.
function extractGpsFix(r: { success: boolean; data: GpsPosition } | null): GpsFix | null {
	if (r == null || !r.success) return null;
	return validateGpsFix(r.data);
}

function validateGpsFix(d: GpsPosition | null | undefined): GpsFix | null {
	if (d == null) return null;
	if (d.latitude == null) return null;
	if (d.longitude == null) return null;
	return { lat: d.latitude, lon: d.longitude, satellites: d.satellites, fix: d.fix };
}

function mapMetrics(data: SystemMetrics): ChassisState['system'] {
	const out: ChassisState['system'] = {};
	if (data.cpu) {
		out.cpuPct = data.cpu.usage;
		out.tempC = data.cpu.temperature;
	}
	if (data.memory) {
		out.memUsedGb = gb(data.memory.used);
		out.memTotalGb = gb(data.memory.total);
	}
	if (data.disk) {
		out.nvmeFreeGb = gb(data.disk.available);
	}
	return out;
}

async function fetchJson<T>(path: string): Promise<T | null> {
	try {
		const r = await fetch(path);
		if (!r.ok) return null;
		return (await r.json()) as T;
	} catch {
		return null;
	}
}

/**
 * Reactive chassis state. Created on first call from a component context;
 * pollers run for the lifetime of that component (cleaned up via `onDestroy`).
 *
 * Call from inside `+layout.svelte`'s component initialisation so the
 * `onDestroy` hook is registered correctly.
 */
export function createChassisState(): ChassisState {
	const state = $state<ChassisState>({
		system: {},
		link: {},
		gps: {},
		station: {},
		weather: { wx: null, loading: false, error: null },
		session: '—'
	});

	if (!browser) return state;

	// Lazy-loaded airport table (T013) — used to map GPS coords → nearest ICAO
	// for the METAR endpoint, which expects a `?station=ICAO` query param.
	let airports: Airport[] | null = null;
	async function ensureAirports(): Promise<Airport[]> {
		if (airports == null) {
			try {
				airports = await loadAirports(globalThis.fetch);
			} catch {
				airports = [];
			}
		}
		return airports;
	}

	async function pollMetrics(): Promise<void> {
		const data = await fetchJson<SystemMetrics>('/api/system/metrics');
		if (!data) return;
		state.system = mapMetrics(data);
	}

	async function pollGps(): Promise<void> {
		const r = await fetchJson<{ success: boolean; data: GpsPosition }>('/api/gps/position');
		const fix = extractGpsFix(r);
		if (!fix) return;
		state.gps = fix;
		const list = await ensureAirports();
		const nearest = findNearest(list, fix.lat, fix.lon);
		if (nearest) state.station = { icao: nearest.icao, name: nearest.name };
	}

	// fallow-ignore-next-line complexity
	async function pollWeather(): Promise<void> {
		const icao = state.station.icao;
		if (!icao) return;
		state.weather.loading = true;
		// Endpoint shape: `{wx, stale}` on success, `{success: false, error}` on
		// failure — mirror that here instead of re-keying behind a `data` field.
		const r = await fetchJson<{
			wx?: WeatherReport;
			stale?: boolean;
			success?: boolean;
			error?: string;
		}>(`/api/weather/metar?station=${icao}`);
		state.weather.loading = false;
		if (!r) {
			state.weather.error = 'METAR fetch failed';
			return;
		}
		if (r.wx) {
			state.weather.wx = r.wx;
			state.weather.error = null;
		} else if (r.error) {
			state.weather.error = r.error;
		}
	}

	void pollMetrics();
	void pollGps().then(() => void pollWeather());

	const metricsId = setInterval(() => void pollMetrics(), METRICS_INTERVAL_MS);
	const gpsId = setInterval(() => void pollGps(), GPS_INTERVAL_MS);
	const weatherId = setInterval(() => void pollWeather(), WEATHER_INTERVAL_MS);

	onDestroy(() => {
		clearInterval(metricsId);
		clearInterval(gpsId);
		clearInterval(weatherId);
	});

	return state;
}
