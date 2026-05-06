/**
 * Flying-Squirrel RF visualization client store.
 *
 * Holds the GeoJSON features that back the drive-path, AP-centroid, and
 * (Phase A.3) heatmap MapLibre layers, plus the layer-mode/intensity
 * toggles that the layer panel writes into. The store calls
 * /api/rf/aggregate on demand (filter-key LRU cache so panning doesn't
 * re-fetch the identical payload).
 */

import type { Feature, FeatureCollection, LineString, Point } from 'geojson';

import type { DeviceEllipse } from '$lib/types/rf-ellipse';

import { LiveRefreshController } from './rf-live-refresh';

/** Path layer vertex arg from the server. */
interface PathVertex {
	lat: number;
	lon: number;
	t: number;
}

/** AP centroid arg from the server. */
interface ApCentroid {
	deviceId: string;
	lat: number;
	lon: number;
	maxDbm: number;
	obsCount: number;
}

/** Hex cell arg from the server (Phase A.3 heatmap input). */
interface HexCell {
	h3: string;
	lat: number;
	lon: number;
	meanDbm: number;
	maxDbm: number;
	minDbm: number;
	count: number;
}

type LayerMode = 'off' | 'heatmap' | 'hex';

interface RfVisualizationFilters {
	sessionId?: string;
	deviceIds?: string[];
	bbox?: [minLon: number, minLat: number, maxLon: number, maxLat: number];
	h3res?: number;
	zoom?: number;
	rssiFloorDbm?: number;
	source?: string;
	/** Unix ms — include only signals with timestamp >= startTs. */
	startTs?: number;
	/** Unix ms — include only signals with timestamp <= endTs. */
	endTs?: number;
}

interface AggregateResponse {
	heatmap?: HexCell[];
	centroids?: ApCentroid[];
	path?: PathVertex[];
}

const CACHE_LIMIT = 5;
const cache = new Map<string, AggregateResponse>();

function nullIfUndef<T>(v: T | undefined): T | null {
	return v === undefined ? null : v;
}

function fingerprintScope(filters: RfVisualizationFilters): Record<string, unknown> {
	return {
		s: nullIfUndef(filters.sessionId),
		d: nullIfUndef(filters.deviceIds?.slice().sort()),
		r: nullIfUndef(filters.rssiFloorDbm),
		src: nullIfUndef(filters.source)
	};
}

function fingerprintViewport(filters: RfVisualizationFilters): Record<string, unknown> {
	const zoomBucket = filters.zoom !== undefined ? Math.floor(filters.zoom) : null;
	return {
		b: nullIfUndef(filters.bbox),
		h: nullIfUndef(filters.h3res),
		z: zoomBucket,
		ts: nullIfUndef(filters.startTs),
		te: nullIfUndef(filters.endTs)
	};
}

function filterFingerprint(filters: RfVisualizationFilters): Record<string, unknown> {
	return { ...fingerprintScope(filters), ...fingerprintViewport(filters) };
}

function cacheKey(filters: RfVisualizationFilters): string {
	return JSON.stringify(filterFingerprint(filters));
}

function lruSet(key: string, value: AggregateResponse): void {
	cache.delete(key);
	cache.set(key, value);
	while (cache.size > CACHE_LIMIT) {
		const oldest = cache.keys().next().value;
		if (oldest === undefined) break;
		cache.delete(oldest);
	}
}

function addOptionalParam(
	params: URLSearchParams,
	key: string,
	value: string | undefined | null
): void {
	if (value !== undefined && value !== null && value !== '') params.set(key, value);
}

function optionalNumber(n: number | undefined): string | null {
	return n !== undefined ? String(n) : null;
}

function buildQuery(filters: RfVisualizationFilters): string {
	const params = new URLSearchParams({ layer: 'all' });
	addOptionalParam(params, 'session', filters.sessionId);
	const bssid = filters.deviceIds?.length ? filters.deviceIds.join(',') : null;
	addOptionalParam(params, 'bssid', bssid);
	addOptionalParam(params, 'bbox', filters.bbox ? filters.bbox.join(',') : null);
	addOptionalParam(params, 'h3res', optionalNumber(filters.h3res));
	addOptionalParam(params, 'zoom', optionalNumber(filters.zoom));
	addOptionalParam(params, 'rssiFloor', optionalNumber(filters.rssiFloorDbm));
	addOptionalParam(params, 'source', filters.source);
	addOptionalParam(params, 'start', optionalNumber(filters.startTs));
	addOptionalParam(params, 'end', optionalNumber(filters.endTs));
	return params.toString();
}

async function fetchRfAggregate(filters: RfVisualizationFilters): Promise<AggregateResponse> {
	const key = cacheKey(filters);
	const cached = cache.get(key);
	if (cached) {
		cache.delete(key);
		cache.set(key, cached);
		return cached;
	}
	const resp = await fetch(`/api/rf/aggregate?${buildQuery(filters)}`, {
		credentials: 'include',
		headers: { accept: 'application/json' }
	});
	if (!resp.ok) throw new Error(`/api/rf/aggregate ${resp.status}`);
	const data = (await resp.json()) as AggregateResponse;
	lruSet(key, data);
	return data;
}

function pathToGeoJson(vertices: PathVertex[]): FeatureCollection<LineString> {
	if (vertices.length < 2) {
		return { type: 'FeatureCollection', features: [] };
	}
	const tStart = vertices[0].t;
	const tEnd = vertices[vertices.length - 1].t;
	const duration = Math.max(1, tEnd - tStart);
	const coords = vertices.map((v) => [v.lon, v.lat]);
	const feature: Feature<LineString> = {
		type: 'Feature',
		geometry: { type: 'LineString', coordinates: coords },
		properties: {
			tStart,
			tEnd,
			duration,
			vertexCount: vertices.length
		}
	};
	return { type: 'FeatureCollection', features: [feature] };
}

function centroidsToGeoJson(centroids: ApCentroid[]): FeatureCollection<Point> {
	return {
		type: 'FeatureCollection',
		features: centroids.map((c) => ({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
			properties: {
				deviceId: c.deviceId,
				maxDbm: c.maxDbm,
				obsCount: c.obsCount
			}
		}))
	};
}

function hexCellsToGeoJson(cells: HexCell[]): FeatureCollection<Point> {
	return {
		type: 'FeatureCollection',
		features: cells.map((c) => ({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
			properties: {
				h3: c.h3,
				meanDbm: c.meanDbm,
				maxDbm: c.maxDbm,
				minDbm: c.minDbm,
				count: c.count
			}
		}))
	};
}

interface RfGeoJson {
	path: FeatureCollection<LineString>;
	centroids: FeatureCollection<Point>;
	heatmap: FeatureCollection<Point>;
}

const EMPTY: RfGeoJson = {
	path: { type: 'FeatureCollection', features: [] },
	centroids: { type: 'FeatureCollection', features: [] },
	heatmap: { type: 'FeatureCollection', features: [] }
};

async function loadRfGeoJson(filters: RfVisualizationFilters): Promise<RfGeoJson> {
	const resp = await fetchRfAggregate(filters);
	return {
		path: pathToGeoJson(resp.path ?? []),
		centroids: centroidsToGeoJson(resp.centroids ?? []),
		heatmap: hexCellsToGeoJson(resp.heatmap ?? [])
	};
}

/** Client-side session descriptor mirroring /api/sessions item shape. */
interface RfSession {
	id: string;
	startedAt: number;
	endedAt: number | null;
	label: string | null;
	source: string;
}

interface SessionsResponse {
	currentId: string;
	sessions: RfSession[];
}

/** Matches ObservationPoint from src/lib/server/db/rf-aggregation.ts. */
interface ObservationPoint {
	lat: number;
	lon: number;
	dbm: number;
	timestamp: number;
}

// DeviceEllipse consumed by server/db/device-ellipse.ts, utils/ellipse-geometry.ts, and device-ellipse.test.ts
// fallow-ignore-next-line unused-type
export type { DeviceEllipse } from '$lib/types/rf-ellipse';

interface ObservationsResponse {
	observations: ObservationPoint[];
	ellipse: DeviceEllipse | null;
}

const EMPTY_POINT_FC: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };

function observationsToGeoJson(obs: ObservationPoint[]): FeatureCollection<Point> {
	return {
		type: 'FeatureCollection',
		features: obs.map((o) => ({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: [o.lon, o.lat] },
			properties: { dbm: o.dbm, timestamp: o.timestamp }
		}))
	};
}

/**
 * Svelte 5 runes store: read `.state`, call `.load()` to refresh,
 * call `.setFilters()` to change what gets fetched next.
 *
 * Using a class + $state for consistency with other Argos stores.
 */
class RfVisualizationStore {
	layerMode = $state<LayerMode>('heatmap');
	heatmapIntensity = $state(1);
	showPath = $state(true);
	showCentroids = $state(true);
	filters = $state<RfVisualizationFilters>({});
	features = $state<RfGeoJson>(EMPTY);
	loading = $state(false);
	error = $state<string | null>(null);

	// Session selector state. `activeSessionId = null` means "all sessions"
	// (server returns union across sessions). `sessionsList` is populated
	// by loadSessions() on first mount of the SessionSelector component.
	activeSessionId = $state<string | null>(null);
	sessionsList = $state<RfSession[]>([]);
	sessionsLoaded = $state(false);
	// In-flight guard + terminal-failure flag. SessionSelector checks all three
	// (loaded / loading / failed) so the effect can't retry on its own after a
	// network failure — operator must refresh / re-trigger explicitly.
	sessionsLoading = $state(false);
	sessionsLoadFailed = $state(false);

	// Highlight-on-select state. Populated when the operator clicks a
	// centroid; cleared when they click elsewhere. `selectedObservations`
	// holds the raw signals that contributed to the selected device's
	// centroid, used to draw rays from the centroid back to each point.
	selectedDeviceId = $state<string | null>(null);
	selectedObservations = $state<FeatureCollection<Point>>(EMPTY_POINT_FC);
	selectedEllipse = $state<DeviceEllipse | null>(null);

	// Live-refresh state — true while an SSE stream is open.
	isLive = $state(false);
	private liveController: LiveRefreshController | null = null;

	setFilters(update: Partial<RfVisualizationFilters>): void {
		this.filters = { ...this.filters, ...update };
	}

	async load(): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			this.features = await loadRfGeoJson(this.filters);
		} catch (err) {
			this.error = err instanceof Error ? err.message : String(err);
			this.features = EMPTY;
		} finally {
			this.loading = false;
		}
	}

	// Initialize active to server's current on first call so the
	// dropdown shows a sensible default instead of "all sessions".
	private applyInitialSession(data: SessionsResponse): void {
		if (this.sessionsLoaded) return;
		if (this.activeSessionId !== null) return;
		this.activeSessionId = data.currentId;
		this.setFilters({ sessionId: data.currentId });
	}

	// fallow-ignore-next-line complexity
	async loadSessions(): Promise<void> {
		if (this.sessionsLoading) return;
		this.sessionsLoading = true;
		this.sessionsLoadFailed = false;
		try {
			const resp = await fetch('/api/sessions?limit=50', {
				credentials: 'include',
				headers: { accept: 'application/json' }
			});
			if (!resp.ok) throw new Error(`/api/sessions ${resp.status}`);
			const data = (await resp.json()) as SessionsResponse;
			this.sessionsList = data.sessions;
			this.applyInitialSession(data);
			this.sessionsLoaded = true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : String(err);
			this.sessionsLoadFailed = true;
		} finally {
			this.sessionsLoading = false;
		}
	}

	async setSession(id: string | null): Promise<void> {
		this.activeSessionId = id;
		this.setFilters({ sessionId: id ?? undefined });
		// Context change — drop any AP highlight from the previous session so
		// the map doesn't flash stale rings/rays over the new session's data.
		this.selectedDeviceId = null;
		this.selectedObservations = EMPTY_POINT_FC;
		this.selectedEllipse = null;
		await this.load();
	}

	setSelectedDevice(id: string | null): void {
		// Any context change — including switching from AP-A to AP-B — must
		// invalidate the previous selection's observations + ellipse. Otherwise
		// the old rays / ellipse linger until the new fetch lands.
		if (id !== this.selectedDeviceId) {
			this.selectedObservations = EMPTY_POINT_FC;
			this.selectedEllipse = null;
		}
		this.selectedDeviceId = id;
		if (id === null) return;
		void this.loadSelectedDeviceObservations();
	}

	private buildObservationsQuery(deviceId: string): string {
		const params = new URLSearchParams({ bssid: deviceId });
		if (this.activeSessionId) params.set('session', this.activeSessionId);
		return params.toString();
	}

	private async fetchObservations(id: string): Promise<ObservationsResponse> {
		const resp = await fetch(`/api/rf/observations?${this.buildObservationsQuery(id)}`, {
			credentials: 'include',
			headers: { accept: 'application/json' }
		});
		if (!resp.ok) throw new Error(`/api/rf/observations ${resp.status}`);
		return (await resp.json()) as ObservationsResponse;
	}

	// Stale-guarded assignment: drop the result if the selection has
	// changed since the fetch began. Prevents fast AP-clicks from
	// clobbering newer observations with an earlier in-flight response.
	private assignObservations(id: string, data: ObservationsResponse): void {
		if (this.selectedDeviceId !== id) return;
		this.selectedObservations = observationsToGeoJson(data.observations ?? []);
		this.selectedEllipse = data.ellipse ?? null;
	}

	private assignFetchError(id: string, err: unknown): void {
		if (this.selectedDeviceId !== id) return;
		this.error = err instanceof Error ? err.message : String(err);
		this.selectedObservations = EMPTY_POINT_FC;
		this.selectedEllipse = null;
	}

	async loadSelectedDeviceObservations(): Promise<void> {
		const id = this.selectedDeviceId;
		if (!id) return;
		try {
			this.assignObservations(id, await this.fetchObservations(id));
		} catch (err) {
			this.assignFetchError(id, err);
		}
	}

	reset(): void {
		this.features = EMPTY;
		this.error = null;
	}

	/**
	 * Open an SSE stream to /api/rf/stream and live-refresh the map as new
	 * signals land. Safe to call repeatedly — the controller tears down any
	 * prior connection. Call disconnectLive() when leaving the map view.
	 */
	connectLive(sessionId?: string | null): void {
		if (typeof EventSource === 'undefined') return; // SSR / test env without EventSource
		if (!this.liveController) {
			this.liveController = new LiveRefreshController({
				reload: () => this.load(),
				// Reflect the underlying EventSource state — flips false on
				// drop/error, back true on reconnect, without waiting for
				// disconnectLive() to be called explicitly.
				onLiveChange: (live) => {
					this.isLive = live;
				}
			});
		}
		this.liveController.connect(sessionId ?? undefined);
		this.isLive = this.liveController.isLive;
	}

	disconnectLive(): void {
		if (!this.liveController) return;
		this.liveController.disconnect();
		this.isLive = this.liveController.isLive;
	}
}

export const rfVisualization = new RfVisualizationStore();
