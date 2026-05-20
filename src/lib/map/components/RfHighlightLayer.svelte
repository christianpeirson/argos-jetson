<script lang="ts" module>
	export const RF_HIGHLIGHT_RAYS_SOURCE_ID = 'rf-highlight-rays-src';
	export const RF_HIGHLIGHT_RINGS_SOURCE_ID = 'rf-highlight-rings-src';
	export const RF_HIGHLIGHT_RAYS_LAYER_ID = 'rf-highlight-rays';
	export const RF_HIGHLIGHT_RINGS_INNER_LAYER_ID = 'rf-highlight-rings-inner';
	export const RF_HIGHLIGHT_RINGS_OUTER_LAYER_ID = 'rf-highlight-rings-outer';
</script>

<script lang="ts">
	import type { FeatureCollection } from 'geojson';
	import { CircleLayer, GeoJSONSource, LineLayer } from 'svelte-maplibre-gl';

	const HIGHLIGHT_ACCENT = 'rgba(212, 160, 84, 0.85)';
	const HIGHLIGHT_ACCENT_FAINT = 'rgba(212, 160, 84, 0.45)';

	let {
		raysData,
		ringsData
	}: { raysData: FeatureCollection; ringsData?: FeatureCollection } = $props();
</script>

<GeoJSONSource id={RF_HIGHLIGHT_RAYS_SOURCE_ID} data={raysData}>
	<LineLayer
		id={RF_HIGHLIGHT_RAYS_LAYER_ID}
		layout={{ visibility: 'visible', 'line-cap': 'round' }}
		paint={{
			'line-color': HIGHLIGHT_ACCENT,
			'line-width': 1,
			'line-opacity': 0.55
		}}
	/>
</GeoJSONSource>

{#if ringsData}
	<GeoJSONSource id={RF_HIGHLIGHT_RINGS_SOURCE_ID} data={ringsData}>
		<CircleLayer
			id={RF_HIGHLIGHT_RINGS_OUTER_LAYER_ID}
			layout={{ visibility: 'visible' }}
			paint={{
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 22, 18, 42],
				'circle-color': 'rgba(0, 0, 0, 0)',
				'circle-stroke-width': 1,
				'circle-stroke-color': HIGHLIGHT_ACCENT_FAINT
			}}
		/>
		<CircleLayer
			id={RF_HIGHLIGHT_RINGS_INNER_LAYER_ID}
			layout={{ visibility: 'visible' }}
			paint={{
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 18, 24],
				'circle-color': 'rgba(0, 0, 0, 0)',
				'circle-stroke-width': 1.5,
				'circle-stroke-color': HIGHLIGHT_ACCENT
			}}
		/>
	</GeoJSONSource>
{/if}
