/**
 * Recon data store — fetches enriched wifi_recon data for dashboard sub-tabs.
 *
 * Provides WPS targets, beacon fingerprints, retry/error analysis, client
 * associations, GPS movement, frequency maps, and Kismet alerts — data that
 * the standard Kismet REST API does not expose.
 *
 * @module
 */

import { derived, writable } from 'svelte/store';

import { logger } from '$lib/utils/logger';

// ── Types ────────────────────────────────────────────────────────────

export interface ReconTarget {
	mac: string;
	ssid: string;
	type: string;
	signal_dbm: number;
	channel: string;
	frequency_mhz: number;
	band: string;
	encryption: string;
	manufacturer: string;
	packets_total: number;
	packets_data: number;
	bytes_data: number;
	first_seen: number;
	last_seen: number;
	latitude?: number;
	longitude?: number;
	num_clients?: number;
	ht_mode?: string;
	max_rate_mbps?: number;
	wps_enabled?: boolean;
	wps_version?: number;
	cloaked?: boolean;
	probed_ssids?: string[];
	associated_clients?: string[];
	connected_to_bssid?: string;
	beacon_fingerprint?: string;
	retry_bytes?: number;
	packets_error?: number;
	freq_map_khz?: Record<string, number>;
	gps_bounds?: { min_lon: number; min_lat: number; max_lon: number; max_lat: number };
	observation_secs?: number;
	[key: string]: unknown;
}

export interface ReconAlert {
	type: string;
	class: string;
	severity: number;
	text: string;
	timestamp: number;
	channel: string;
	source_mac?: string;
	transmitter_mac?: string;
	[key: string]: unknown;
}

interface ReconData {
	targets: ReconTarget[];
	alerts: ReconAlert[];
	summary: Record<string, unknown>;
	timestamp: string;
}

type ReconStatus = 'idle' | 'loading' | 'ready' | 'error';

// ── Store state ──────────────────────────────────────────────────────

const EMPTY: ReconData = { targets: [], alerts: [], summary: {}, timestamp: '' };

const reconData = writable<ReconData>(EMPTY);
export const reconStatus = writable<ReconStatus>('idle');
const reconError = writable<string | null>(null);

// ── Derived views ────────────────────────────────────────────────────

export const reconTargets = derived(reconData, ($d) => $d.targets);
export const reconAlerts = derived(reconData, ($d) => $d.alerts);

export const weakSecurityTargets = derived(reconData, ($d) =>
	$d.targets.filter(
		(t) =>
			!t.encryption ||
			t.encryption === 'Open' ||
			t.encryption.includes('WEP') ||
			t.encryption.includes('TKIP')
	)
);

export const wpsTargets = derived(reconData, ($d) => $d.targets.filter((t) => t.wps_enabled));

export const hiddenNetworks = derived(reconData, ($d) =>
	$d.targets.filter((t) => t.cloaked || !t.ssid || t.ssid === 'Hidden')
);

export const busyAPs = derived(reconData, ($d) =>
	$d.targets
		.filter((t) => (t.num_clients ?? 0) > 0)
		.sort((a, b) => (b.num_clients ?? 0) - (a.num_clients ?? 0))
);

export const gpsTracked = derived(reconData, ($d) =>
	$d.targets.filter((t) => t.gps_bounds != null)
);

// ── Actions ──────────────────────────────────────────────────────────

let fetchController: AbortController | null = null;

export type ReconParams = {
	type?: string;
	sort?: string;
	showClients?: boolean;
	alerts?: boolean;
	minSignal?: number;
};

function reconParamEntries(params: ReconParams): Array<[string, string]> {
	const boolToStr = (v: boolean | undefined, defaultTrue = false): string =>
		(v ?? defaultTrue) ? 'true' : '';
	return Object.entries({
		type: String(params.type ?? ''),
		sort: String(params.sort ?? ''),
		showClients: boolToStr(params.showClients),
		alerts: boolToStr(params.alerts),
		minSignal: params.minSignal != null ? String(params.minSignal) : ''
	}).filter(([, v]) => v !== '') as Array<[string, string]>;
}

function buildReconQueryString(params: ReconParams): string {
	return new URLSearchParams(reconParamEntries(params)).toString();
}

function buildReconUrl(params?: ReconParams): string {
	const qs = params ? buildReconQueryString(params) : '';
	return `/api/kismet/recon${qs ? `?${qs}` : ''}`;
}

// fallow-ignore-next-line complexity
function parseReconResponse(data: Record<string, unknown>): ReconData {
	return {
		targets: (data.targets as ReconTarget[]) ?? [],
		alerts: (data.alerts as ReconAlert[]) ?? [],
		summary: (data.summary as Record<string, unknown>) ?? {},
		timestamp: (data.timestamp as string) ?? new Date().toISOString()
	};
}

async function doReconFetch(url: string, signal: AbortSignal): Promise<void> {
	const response = await fetch(url, { signal, credentials: 'same-origin' });
	const data = await response.json();
	if (!response.ok || !data.success) {
		reconStatus.set('error');
		reconError.set(data.error || `HTTP ${response.status}`);
		return;
	}
	reconData.set(parseReconResponse(data as Record<string, unknown>));
	reconStatus.set('ready');
}

function handleReconFetchError(err: unknown): void {
	if (err instanceof DOMException && err.name === 'AbortError') return;
	const msg = err instanceof Error ? err.message : String(err);
	logger.error(`[recon-store] Fetch failed: ${msg}`);
	reconStatus.set('error');
	reconError.set(msg);
}

export async function fetchReconData(params?: ReconParams): Promise<void> {
	// Cancel any in-flight request
	fetchController?.abort();
	fetchController = new AbortController();

	reconStatus.set('loading');
	reconError.set(null);

	await doReconFetch(buildReconUrl(params), fetchController.signal).catch(handleReconFetchError);
}

/**
 * Empty the local recon cache and cancel any in-flight fetch.
 * Status lands on 'ready' (not 'idle') so auto-refetch effects don't
 * immediately repopulate intel chips from a stale server cache.
 */
export function resetReconData(): void {
	fetchController?.abort();
	fetchController = null;
	reconData.set(EMPTY);
	reconError.set(null);
	reconStatus.set('ready');
}
