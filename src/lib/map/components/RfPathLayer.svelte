<script lang="ts" module>
	export const RF_PATH_SOURCE_ID = 'rf-path-src';
	export const RF_PATH_CASING_LAYER_ID = 'rf-path-casing';
	export const RF_PATH_LAYER_ID = 'rf-path';
</script>

<script lang="ts">
	import type { FeatureCollection } from 'geojson';
	import { GeoJSONSource, LineLayer } from 'svelte-maplibre-gl';

	let { data }: { data: FeatureCollection } = $props();
</script>

<GeoJSONSource id={RF_PATH_SOURCE_ID} {data} lineMetrics={true}>
	<LineLayer
		id={RF_PATH_CASING_LAYER_ID}
		layout={{ 'line-cap': 'round', 'line-join': 'round', visibility: 'visible' }}
		paint={{
			'line-color': '#ffffff',
			'line-width': 5,
			'line-opacity': 0.9
		}}
	/>
	<LineLayer
		id={RF_PATH_LAYER_ID}
		layout={{ 'line-cap': 'round', 'line-join': 'round', visibility: 'visible' }}
		paint={{
			'line-width': 3,
			'line-gradient': [
				'interpolate',
				['linear'],
				['line-progress'],
				0.0,
				'#440154',
				0.2,
				'#414487',
				0.4,
				'#2a788e',
				0.6,
				'#22a884',
				0.8,
				'#7ad151',
				1.0,
				'#fde725'
			]
		}}
	/>
</GeoJSONSource>
