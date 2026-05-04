// spec-024 PR10b T052 — pure helpers for /api/gsm-evil/tower-location.
//
// Extracted from state/gsm.svelte.ts to keep that store file under
// the 300-LOC component cap and to keep the request/response wire
// shape testable in isolation. Pure module — no $state, no DOM.

import type { CellLocation, ImsiRow } from '$lib/types/imsi-row';

interface TowerResponse {
	success?: boolean;
	found?: boolean;
	location?: { lat: number; lon: number; range?: number; city?: string };
}

function towerCellPayload(row: ImsiRow): Record<string, number> {
	return {
		mcc: Number(row.mcc),
		mnc: Number(row.mnc),
		lac: Number(row.lac),
		ci: Number(row.ci)
	};
}

// fallow-ignore-next-line complexity
function towerLocationFromBody(body: TowerResponse): CellLocation | null {
	if (!body.found || !body.location) return null;
	return {
		lat: body.location.lat,
		lon: body.location.lon,
		rangeM: body.location.range ?? null,
		city: body.location.city ?? null
	};
}

export async function fetchTowerLocation(row: ImsiRow): Promise<CellLocation | null> {
	const res = await fetch('/api/gsm-evil/tower-location', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(towerCellPayload(row))
	});
	if (!res.ok) return null;
	return towerLocationFromBody((await res.json()) as TowerResponse);
}
