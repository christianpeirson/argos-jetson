// spec-024 PR6 T037 — pure helpers for the MAP-screen "current
// detections" bearing-ray overlay. Extracted from MapScreen.svelte to
// keep the screen file under the 300-LOC component cap and to keep
// the geometry math testable in isolation.

import type { Feature, FeatureCollection, LineString } from 'geojson';

import type { Detection } from '$lib/types/detection';
import { destinationPoint } from '$lib/utils/geo';

const DEFAULT_RAY_LENGTH_M = 200;

function rayFeatureFor(obsLat: number, obsLon: number, d: Detection): Feature<LineString> | null {
	if (d.bearingDeg === null) return null;
	const dist = d.distanceM ?? DEFAULT_RAY_LENGTH_M;
	const end = destinationPoint(obsLat, obsLon, d.bearingDeg, dist);
	return {
		type: 'Feature',
		geometry: { type: 'LineString', coordinates: [[obsLon, obsLat], end] },
		properties: {
			signalId: d.signalId,
			rssi: d.rssiDbm,
			confidence: d.confidence ?? 0,
			selected: false
		}
	};
}

// fallow-ignore-next-line complexity
export function buildBearingFC(
	obsLat: number | null,
	obsLon: number | null,
	dets: readonly Detection[]
): FeatureCollection<LineString> {
	if (obsLat === null || obsLon === null) {
		return { type: 'FeatureCollection', features: [] };
	}
	const features: Feature<LineString>[] = [];
	for (const d of dets) {
		const f = rayFeatureFor(obsLat, obsLon, d);
		if (f) features.push(f);
	}
	return { type: 'FeatureCollection', features };
}
