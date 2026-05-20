<script lang="ts" module>
	export const RF_CENTROID_SOURCE_ID = 'rf-centroid-src';
	export const RF_CENTROID_HALO_LAYER_ID = 'rf-centroid-halo';
	export const RF_CENTROID_LAYER_ID = 'rf-centroid';
</script>

<script lang="ts">
	import type { FeatureCollection } from 'geojson';
	import type maplibregl from 'maplibre-gl';
	import { CircleLayer, GeoJSONSource } from 'svelte-maplibre-gl';

	type LayerClickEvent = maplibregl.MapMouseEvent & {
		features?: maplibregl.MapGeoJSONFeature[];
	};

	let {
		data,
		minzoom = 13,
		onclick
	}: {
		data: FeatureCollection;
		minzoom?: number;
		onclick?: (ev: LayerClickEvent) => void;
	} = $props();
</script>

<GeoJSONSource id={RF_CENTROID_SOURCE_ID} {data}>
	<CircleLayer
		id={RF_CENTROID_HALO_LAYER_ID}
		layout={{ visibility: 'visible' }}
		paint={{
			'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 18, 11],
			'circle-color': '#ffffff',
			'circle-opacity': 0.85,
			'circle-stroke-width': 0
		}}
		{minzoom}
	/>
	<CircleLayer
		id={RF_CENTROID_LAYER_ID}
		layout={{ visibility: 'visible' }}
		paint={{
			'circle-radius': [
				'interpolate',
				['linear'],
				['zoom'],
				10,
				['interpolate', ['linear'], ['coalesce', ['get', 'obsCount'], 1], 1, 3, 50, 6],
				18,
				['interpolate', ['linear'], ['coalesce', ['get', 'obsCount'], 1], 1, 7, 50, 12]
			],
			'circle-color': [
				'interpolate',
				['linear'],
				['coalesce', ['get', 'maxDbm'], -90],
				-90,
				'#3b82f6',
				-70,
				'#22c55e',
				-50,
				'#eab308',
				-30,
				'#ef4444'
			],
			'circle-stroke-color': '#111827',
			'circle-stroke-width': 1,
			'circle-opacity': 0.95
		}}
		{minzoom}
		{onclick}
	/>
</GeoJSONSource>
