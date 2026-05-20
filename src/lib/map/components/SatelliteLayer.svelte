<script lang="ts">
	import { RasterLayer, RasterTileSource } from 'svelte-maplibre-gl';

	let {
		urlTemplate,
		attribution = '© Google',
		visible = false,
		beforeId
	}: {
		urlTemplate: string;
		attribution?: string;
		visible?: boolean;
		beforeId?: string;
	} = $props();
</script>

<RasterTileSource id="satellite-hybrid-source" tiles={[urlTemplate]} tileSize={256} {attribution}>
	<RasterLayer
		id="satellite-hybrid-layer"
		paint={{ 'raster-opacity': visible ? 1 : 0 }}
		layout={{ visibility: visible ? 'visible' : 'none' }}
		{beforeId}
	/>
</RasterTileSource>
