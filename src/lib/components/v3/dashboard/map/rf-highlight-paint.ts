/**
 * Paint-property mutations for the Flying-Squirrel highlight-on-select UI.
 *
 * When the operator picks an AP centroid, we want every *other* RF layer
 * to dim to ~30% so the selected centroid + its rays + rings stand out.
 * `*-opacity` is used deliberately rather than `visibility` so the user's
 * layer toggles (rfHeatmap / rfDrivePath / rfApCentroid) stay independent.
 *
 * Layers may not be mounted yet when this runs (cold-boot race with the
 * svelte-maplibre-gl declarative layer adds). We guard with `getLayer`
 * to skip silently when a layer hasn't been added yet; any other paint
 * failure surfaces instead of being swallowed.
 */

import type maplibregl from 'maplibre-gl';

function safeSetPaint(map: maplibregl.Map, layerId: string, prop: string, value: unknown): void {
	// Layer not mounted yet — skip; caller's $effect will re-run when it is.
	if (!map.getLayer(layerId)) return;
	map.setPaintProperty(layerId, prop, value as never);
}

export function applyDimOthers(map: maplibregl.Map, selectedId: string | null): void {
	const active = selectedId !== null;
	const pathOpacity = active ? 0.3 : 1;
	safeSetPaint(map, 'rf-heatmap', 'heatmap-opacity', active ? 0.3 : 0.7);
	safeSetPaint(map, 'rf-path', 'line-opacity', pathOpacity);
	safeSetPaint(map, 'rf-path-casing', 'line-opacity', pathOpacity);
	const centroidOpacity: unknown = active
		? ['case', ['==', ['get', 'deviceId'], selectedId], 1, 0.3]
		: 1;
	safeSetPaint(map, 'rf-centroid', 'circle-opacity', centroidOpacity);
	safeSetPaint(map, 'rf-centroid-halo', 'circle-opacity', centroidOpacity);
}
