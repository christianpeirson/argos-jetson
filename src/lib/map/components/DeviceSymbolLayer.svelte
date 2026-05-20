<script lang="ts">
	import type { Feature, FeatureCollection } from 'geojson';
	import type maplibregl from 'maplibre-gl';
	import { GeoJSONSource, getMapContext, SymbolLayer } from 'svelte-maplibre-gl';

	import { SymbolFactory } from '$lib/map/symbols/symbol-factory';
	import { logger } from '$lib/utils/logger';

	type LayerClickEvent = maplibregl.MapMouseEvent & {
		features?: maplibregl.MapGeoJSONFeature[];
	};

	let {
		data,
		visible = true,
		onclick
	}: {
		data: FeatureCollection;
		visible?: boolean;
		onclick?: (ev: LayerClickEvent) => void;
	} = $props();

	const ctx = getMapContext();
	const registered = new Set<string>();

	function getValidSidc(f: Feature): string {
		const sidc = f.properties?.sidc;
		return typeof sidc === 'string' ? sidc : '';
	}

	function shouldSkipRegistration(sidc: string): boolean {
		return !ctx.map || registered.has(sidc) || ctx.map.hasImage(sidc);
	}

	function attachImageToMap(sidc: string, img: HTMLImageElement): void {
		if (ctx.map && !ctx.map.hasImage(sidc)) ctx.map.addImage(sidc, img);
	}

	async function registerSymbolImage(sidc: string): Promise<void> {
		if (shouldSkipRegistration(sidc)) return;
		registered.add(sidc);
		try {
			const dataUrl = await SymbolFactory.createSymbolDataUrl(sidc, { size: 32 });
			if (!dataUrl) {
				registered.delete(sidc);
				return;
			}
			const img = new Image();
			img.onload = () => attachImageToMap(sidc, img);
			img.src = dataUrl;
		} catch (error) {
			registered.delete(sidc);
			logger.warn('DeviceSymbolLayer image registration failed', { sidc, error });
		}
	}

	$effect(() => {
		for (const f of data.features) {
			const sidc = getValidSidc(f);
			if (sidc) void registerSymbolImage(sidc);
		}
	});
</script>

<GeoJSONSource id="mil-sym-source" {data}>
	<SymbolLayer
		id="mil-sym-layer"
		layout={{
			'icon-image': ['get', 'sidc'],
			'icon-size': 1.0,
			'icon-allow-overlap': true,
			'text-field': ['get', 'label'],
			'text-font': ['Stadia Regular'],
			'text-size': 12,
			'text-offset': [0, 1.5],
			'text-anchor': 'top',
			visibility: visible ? 'visible' : 'none'
		}}
		paint={{
			'text-color': 'hsl(0, 0%, 100%)',
			'text-halo-color': 'hsl(0, 0%, 0%)',
			'text-halo-width': 1
		}}
		{onclick}
	/>
</GeoJSONSource>
