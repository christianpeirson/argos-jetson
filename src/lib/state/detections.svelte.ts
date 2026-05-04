// spec-024 PR5c T032 — client-side detections store for the OVERVIEW screen.
//
// Subscribes to /api/rf/stream (the existing SSE channel that broadcasts
// every ObservationEvent persisted to rf_signals.signals) and maintains a
// 30 s rolling sample window per signal_id. Derives a ranked Detection[]
// for DetectionsList.svelte. No backend changes; no fabricated fields.
//
// Bearing/distance are derived only when observerLat/Lon are bound by the
// caller (gpsStore subscriber wires this up). When unknown they remain
// null and the UI renders the empty-state token "—" — never invented.
//
// Confidence is a pure derivation:
//   confidence = clamp(1 − rmsRadiusM / RADIUS_REF, 0, 1) * min(1, n / SAMPLE_REF)
// where rmsRadius = root-mean-square distance of samples to centroid. This
// rewards both spatial clustering (small radius) and observation count
// (more samples). Documented at the call site so future readers know it
// is not a DB column.

import { gpsStore } from '$lib/stores/tactical-map/gps-store';
import type { Detection } from '$lib/types/detection';
import { bearingDeg as forwardBearing, haversineMeters } from '$lib/utils/geo';
import { signalDesignator } from '$lib/utils/signal-designator';

interface ObservationEvent {
	signalId: string;
	sessionId: string | null;
	source: string;
	deviceId: string | null;
	lat: number;
	lon: number;
	dbm: number;
	frequency: number;
	timestamp: number;
}

interface SignalSample {
	lat: number;
	lon: number;
	dbm: number;
	ts: number;
}

interface SignalEntry {
	source: string;
	frequencyMHz: number;
	samples: SignalSample[];
}

const WINDOW_MS = 30_000;
const MAX_DETECTIONS = 20;
const PRUNE_INTERVAL_MS = 5_000;
const RADIUS_REF_M = 100;
const SAMPLE_REF = 12;
const SSE_URL = '/api/rf/stream';

function rmsRadiusMeters(centerLat: number, centerLon: number, samples: SignalSample[]): number {
	if (samples.length === 0) return 0;
	let sumSq = 0;
	for (const s of samples) {
		const d = haversineMeters(centerLat, centerLon, s.lat, s.lon);
		sumSq += d * d;
	}
	return Math.sqrt(sumSq / samples.length);
}

function centroid(samples: SignalSample[]): { lat: number; lon: number } {
	let lat = 0;
	let lon = 0;
	for (const s of samples) {
		lat += s.lat;
		lon += s.lon;
	}
	return { lat: lat / samples.length, lon: lon / samples.length };
}

function maxDbm(samples: SignalSample[]): number {
	let m = -Infinity;
	for (const s of samples) if (s.dbm > m) m = s.dbm;
	return m;
}

function lastSeen(samples: SignalSample[]): number {
	let m = 0;
	for (const s of samples) if (s.ts > m) m = s.ts;
	return m;
}

function deriveConfidence(rmsRadiusM: number, sampleCount: number): number {
	const spatial = Math.max(0, Math.min(1, 1 - rmsRadiusM / RADIUS_REF_M));
	const density = Math.min(1, sampleCount / SAMPLE_REF);
	return spatial * density;
}

// fallow-ignore-next-line complexity
function buildDetection(
	signalId: string,
	entry: SignalEntry,
	observerLat: number | null,
	observerLon: number | null
): Detection {
	const c = centroid(entry.samples);
	const rms = rmsRadiusMeters(c.lat, c.lon, entry.samples);
	const haveObserver = observerLat !== null && observerLon !== null;
	return {
		signalId,
		designator: signalDesignator(entry.source, entry.frequencyMHz, signalId),
		source: entry.source,
		frequencyMHz: entry.frequencyMHz,
		bearingDeg: haveObserver ? forwardBearing(observerLat, observerLon, c.lat, c.lon) : null,
		distanceM: haveObserver ? haversineMeters(observerLat, observerLon, c.lat, c.lon) : null,
		rssiDbm: maxDbm(entry.samples),
		confidence: entry.samples.length >= 2 ? deriveConfidence(rms, entry.samples.length) : null,
		sampleCount: entry.samples.length,
		lastSeen: lastSeen(entry.samples)
	};
}

function createDetectionsStore() {
	let signals = $state<Map<string, SignalEntry>>(new Map());
	let observerLat = $state<number | null>(null);
	let observerLon = $state<number | null>(null);
	let connected = $state(false);

	let source: EventSource | null = null;
	let pruneTimer: ReturnType<typeof setInterval> | null = null;
	let gpsUnsubscribe: (() => void) | null = null;

	const ranked = $derived.by<Detection[]>(() => {
		const out: Detection[] = [];
		for (const [id, entry] of signals) {
			out.push(buildDetection(id, entry, observerLat, observerLon));
		}
		out.sort((a, b) => b.rssiDbm - a.rssiDbm);
		return out.slice(0, MAX_DETECTIONS);
	});

	function ingest(evt: ObservationEvent): void {
		const cutoff = Date.now() - WINDOW_MS;
		const sample: SignalSample = {
			lat: evt.lat,
			lon: evt.lon,
			dbm: evt.dbm,
			ts: evt.timestamp
		};
		const next = new Map(signals);
		const prev = next.get(evt.signalId);
		if (prev) {
			next.set(evt.signalId, {
				...prev,
				samples: [...prev.samples.filter((s) => s.ts >= cutoff), sample]
			});
		} else {
			next.set(evt.signalId, {
				source: evt.source,
				frequencyMHz: evt.frequency,
				samples: [sample]
			});
		}
		signals = next;
	}

	function prune(): void {
		const cutoff = Date.now() - WINDOW_MS;
		const next = new Map<string, SignalEntry>();
		for (const [id, entry] of signals) {
			const fresh = entry.samples.filter((s) => s.ts >= cutoff);
			if (fresh.length > 0) next.set(id, { ...entry, samples: fresh });
		}
		signals = next;
	}

	function start(): void {
		if (source !== null) return;
		const es = new EventSource(SSE_URL);
		es.addEventListener('observation', (e) => {
			try {
				const data = JSON.parse((e as MessageEvent).data) as ObservationEvent;
				ingest(data);
			} catch {
				// Drop malformed frames; the bus emits structured JSON, so this
				// is only for transport corruption.
			}
		});
		es.addEventListener('open', () => {
			connected = true;
		});
		es.addEventListener('error', () => {
			connected = false;
		});
		source = es;
		pruneTimer = setInterval(prune, PRUNE_INTERVAL_MS);
		gpsUnsubscribe = gpsStore.subscribe((state) => {
			if (!state.status.hasGPSFix) {
				observerLat = null;
				observerLon = null;
				return;
			}
			observerLat = state.position.lat;
			observerLon = state.position.lon;
		});
	}

	function stop(): void {
		source?.close();
		source = null;
		if (pruneTimer !== null) clearInterval(pruneTimer);
		pruneTimer = null;
		gpsUnsubscribe?.();
		gpsUnsubscribe = null;
		connected = false;
	}

	return {
		get ranked() {
			return ranked;
		},
		get connected() {
			return connected;
		},
		start,
		stop
	};
}

export const detectionsStore = createDetectionsStore();
