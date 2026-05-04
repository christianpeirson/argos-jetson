import { haversineKm } from './geo';

// spec-024 PR1 T013 — nearest-station lookup for the topbar Weather button.
// Consumers fetch /airports.json once at startup, then call findNearest()
// on each GPS update. Pure functions; no side effects.

export interface Airport {
	icao: string;
	name: string;
	lat: number;
	lon: number;
}

export interface NearestAirport extends Airport {
	distanceKm: number;
}

class AirportsFetchError extends Error {
	constructor(
		message: string,
		readonly cause?: unknown
	) {
		super(message);
		this.name = 'AirportsFetchError';
	}
}

class AirportsValidationError extends Error {
	constructor(
		message: string,
		readonly index?: number
	) {
		super(message);
		this.name = 'AirportsValidationError';
	}
}

function hasIcao(a: Record<string, unknown>): boolean {
	return typeof a.icao === 'string' && a.icao.length > 0;
}

function hasNumericCoords(a: Record<string, unknown>): boolean {
	return typeof a.lat === 'number' && typeof a.lon === 'number';
}

// fallow-ignore-next-line complexity
function isAirport(v: unknown): v is Airport {
	if (!v || typeof v !== 'object') return false;
	const a = v as Record<string, unknown>;
	return hasIcao(a) && typeof a.name === 'string' && hasNumericCoords(a);
}

export function findNearest(
	airports: readonly Airport[],
	lat: number,
	lon: number
): NearestAirport | null {
	if (airports.length === 0) return null;
	let best: Airport = airports[0];
	let bestKm = haversineKm(lat, lon, best.lat, best.lon);
	for (let i = 1; i < airports.length; i++) {
		const a = airports[i];
		const km = haversineKm(lat, lon, a.lat, a.lon);
		if (km < bestKm) {
			best = a;
			bestKm = km;
		}
	}
	return { ...best, distanceKm: bestKm };
}

// Caller MUST pass a fetch implementation with the right base context:
// - browser: pass globalThis.fetch (relative URL resolves against the page)
// - SvelteKit load: pass the `fetch` arg from the load event
// - Node server context: pass a fetch that has an absolute base URL or
//   resolves /airports.json from `process.cwd() + 'static/'`.
// No default — relative URLs without a base fail in Node and silently 404 in
// SSR. Throws AirportsFetchError on transport failure or
// AirportsValidationError when the payload doesn't match the Airport shape.
// fallow-ignore-next-line complexity
export async function loadAirports(fetchFn: typeof fetch): Promise<Airport[]> {
	const res = await fetchFn('/airports.json');
	if (!res.ok) throw new AirportsFetchError(`airports.json HTTP ${res.status}`);
	const payload = (await res.json()) as unknown;
	if (!Array.isArray(payload)) {
		throw new AirportsValidationError('airports.json must be a JSON array');
	}
	for (let i = 0; i < payload.length; i++) {
		if (!isAirport(payload[i])) {
			throw new AirportsValidationError(
				`airports.json[${i}] missing required Airport fields (icao/name/lat/lon)`,
				i
			);
		}
	}
	return payload as Airport[];
}
