<script lang="ts" module>
	export const RF_HEATMAP_SOURCE_ID = 'rf-heatmap-src';
	export const RF_HEATMAP_LAYER_ID = 'rf-heatmap';
</script>

<script lang="ts">
	import type { FeatureCollection } from 'geojson';
	import { GeoJSONSource, HeatmapLayer } from 'svelte-maplibre-gl';

	let {
		data,
		minzoom = 8,
		maxzoom = 20
	}: { data: FeatureCollection; minzoom?: number; maxzoom?: number } = $props();
</script>

<GeoJSONSource id={RF_HEATMAP_SOURCE_ID} {data}>
	<HeatmapLayer
		id={RF_HEATMAP_LAYER_ID}
		layout={{ visibility: 'visible' }}
		paint={{
			'heatmap-weight': [
				'interpolate',
				['linear'],
				['coalesce', ['get', 'count'], 1],
				1,
				0.2,
				25,
				0.6,
				100,
				1
			],
			'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 18, 1.4],
			'heatmap-color': [
				'interpolate',
				['linear'],
				['heatmap-density'],
				0,
				'rgba(0, 0, 0, 0)',
				0.15,
				'rgba(110, 140, 100, 0.35)',
				0.4,
				'rgba(190, 175, 90, 0.55)',
				0.7,
				'rgba(200, 120, 80, 0.75)',
				1,
				'rgba(200, 85, 65, 0.85)'
			],
			'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 14, 45, 18, 85],
			'heatmap-opacity': 0.7
		}}
		{minzoom}
		{maxzoom}
	/>
</GeoJSONSource>
