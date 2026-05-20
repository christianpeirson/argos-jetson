<!-- @constitutional-exemption Article-IV-4.3 issue:#11 — Component state handling (loading/error/empty UI) deferred to UX improvement phase -->
<!-- @audit-svelte-no-at-html-tags 2026-05-05 — buildConeSVG() returns a hard-coded SVG template literal driven by a numeric heading; rule disabled for this file via config/eslint.config.js files-pattern override; no user input vector. -->
<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';

	import {
		CircleLayer,
		CustomControl,
		FillLayer,
		GeoJSONSource,
		HeatmapLayer,
		LineLayer,
		MapLibre,
		Marker,
		NavigationControl,
		Popup,
		SymbolLayer as MapLibreSymbolLayer
	} from 'svelte-maplibre-gl';

	import DeviceSymbolLayer from '$lib/map/components/DeviceSymbolLayer.svelte';
	import SatelliteLayer from '$lib/map/components/SatelliteLayer.svelte';
	import { mapInstance } from '$lib/map/map-instance.svelte';
	import {
		RF_CENTROID_HALO_LAYER_ID,
		RF_CENTROID_LAYER_ID,
		RF_CENTROID_SOURCE_ID,
		rfCentroidHaloLayer,
		rfCentroidLayer
	} from '$lib/map/layers/rf-centroid-layer';
	import {
		RF_HEATMAP_LAYER_ID,
		RF_HEATMAP_SOURCE_ID,
		rfHeatmapLayer
	} from '$lib/map/layers/rf-heatmap-layer';
	import {
		RF_HIGHLIGHT_RAYS_LAYER_ID,
		RF_HIGHLIGHT_RAYS_SOURCE_ID,
		RF_HIGHLIGHT_RINGS_INNER_LAYER_ID,
		RF_HIGHLIGHT_RINGS_OUTER_LAYER_ID,
		RF_HIGHLIGHT_RINGS_SOURCE_ID,
		rfHighlightRaysLayer,
		rfHighlightRingsInnerLayer,
		rfHighlightRingsOuterLayer
	} from '$lib/map/layers/rf-highlight-layer';
	import {
		RF_PATH_CASING_LAYER_ID,
		RF_PATH_LAYER_ID,
		RF_PATH_SOURCE_ID,
		rfPathCasingLayer,
		rfPathLayer
	} from '$lib/map/layers/rf-path-layer';
	import { isolatedDeviceMAC } from '$lib/stores/dashboard/dashboard-store';
	import { gpsStore } from '$lib/stores/tactical-map/gps-store';

	import { createMapState, MAP_UI_COLORS, onClusterClick } from './dashboard-map-logic.svelte';
	import DeviceOverlay from './map/DeviceOverlay.svelte';
	import { buildConeSVG } from './map/map-helpers';
	import TowerPopup from './map/TowerPopup.svelte';

	const ms = createMapState();

	// Publish the live MapLibre instance to the cross-tree rune singleton so
	// sibling panels (e.g. DevicesPanel.flyToDevice) can call flyTo / easeTo
	// without a setContext bridge. Cleared on unmount via the cleanup return.
	$effect(() => {
		mapInstance.map = ms.map;
		return () => {
			mapInstance.map = undefined;
		};
	});
</script>

<div class="map-area">
	{#if ms.mapReady}
		<MapLibre
			bind:map={ms.map}
			style={ms.mapStyle}
			center={[0, 0]}
			zoom={3}
			attributionControl={false}
			autoloadGlobalCss={false}
			class="map-container"
			onload={ms.handleMapLoad}
			onerror={(e) => console.error('[MapLibre] map error', e.error ?? e)}
		>
			{#if ms.satelliteUrl}
				<SatelliteLayer
					urlTemplate={ms.satelliteUrl}
					attribution={ms.satelliteAttribution}
					visible={ms.satelliteVisible}
				/>
			{/if}

			<GeoJSONSource id="detection-range-src" data={ms.detectionRangeGeoJSON}>
				<FillLayer
					id="detection-range-fill"
					paint={{
						'fill-color': ['get', 'color'],
						'fill-opacity': [
							'match',
							['get', 'band'],
							'vstrong',
							0.14,
							'strong',
							0.11,
							'good',
							0.09,
							'fair',
							0.07,
							'weak',
							0.05,
							0.07
						]
					}}
				/>
			</GeoJSONSource>

			<NavigationControl position="bottom-right" showCompass={false} />
			<!-- @constitutional-exemption Article-IV-4.2 — Map overlay control requires MapLibre-specific positioning -->
			<CustomControl position="bottom-right">
				<div class="control-stack">
					<button
						class="locate-btn"
						onclick={ms.handleLocateClick}
						title="Center on my location"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="8" /><circle
								cx="12"
								cy="12"
								r="3"
								fill="currentColor"
							/>
							<line x1="12" y1="2" x2="12" y2="4" /><line
								x1="12"
								y1="20"
								x2="12"
								y2="22"
							/>
							<line x1="2" y1="12" x2="4" y2="12" /><line
								x1="20"
								y1="12"
								x2="22"
								y2="12"
							/>
						</svg>
					</button>
				</div>
			</CustomControl>

			<GeoJSONSource id="accuracy-src" data={ms.accuracyGeoJSON}>
				<FillLayer
					id="accuracy-fill"
					paint={{ 'fill-color': ms.accuracyColor, 'fill-opacity': 0.18 }}
				/>
			</GeoJSONSource>

			<GeoJSONSource id="cell-towers-src" data={ms.cellTowerGeoJSON}>
				<CircleLayer
					id="cell-tower-circles"
					source="cell-towers-src"
					paint={{
						'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 8, 18, 12],
						'circle-color': ['get', 'color'],
						'circle-opacity': 0.25,
						'circle-stroke-width': 2.5,
						'circle-stroke-color': ['get', 'color'],
						'circle-stroke-opacity': 0.9
					}}
					onclick={ms.handleTowerCircleClick}
				/>
				<MapLibreSymbolLayer
					id="cell-tower-labels"
					minzoom={12}
					layout={{
						'text-field': ['get', 'radio'],
						'text-font': ['Stadia Regular'],
						'text-size': 9,
						'text-offset': [0, 1.6],
						'text-allow-overlap': false,
						'text-optional': true
					}}
					paint={{
						'text-color': MAP_UI_COLORS.mutedForeground.fallback,
						'text-halo-color': MAP_UI_COLORS.background.fallback,
						'text-halo-width': 1
					}}
				/>
			</GeoJSONSource>

			<GeoJSONSource id="connection-lines-src" data={ms.connectionLinesGeoJSON}>
				<LineLayer
					id="device-connection-lines"
					paint={{
						'line-color': ['get', 'color'],
						'line-width': 1.5,
						'line-opacity': 0.7
					}}
				/>
			</GeoJSONSource>

			<GeoJSONSource id="uas-lines-src" data={ms.uasLinesGeoJSON}>
				<LineLayer
					id="uas-connection-lines"
					paint={{
						'line-color': [
							'match',
							['get', 'lineType'],
							'pilot',
							'#D4A054',
							'home',
							'#8BBFA0',
							'#888'
						],
						'line-width': 1.5,
						'line-opacity': 0.6,
						'line-dasharray': [4, 2]
					}}
				/>
			</GeoJSONSource>

			<GeoJSONSource id="uas-src" data={ms.uasGeoJSON}>
				<CircleLayer
					id="uas-circles"
					paint={{
						'circle-radius': [
							'match',
							['get', 'markerType'],
							'drone',
							8,
							'pilot',
							6,
							'home',
							5,
							6
						],
						'circle-color': [
							'match',
							['get', 'markerType'],
							'drone',
							'#FF6B35',
							'pilot',
							'#4A90D9',
							'home',
							'#8BBFA0',
							'#888'
						],
						'circle-opacity': 0.9,
						'circle-stroke-width': 2,
						'circle-stroke-color': '#ffffff',
						'circle-stroke-opacity': 0.7
					}}
				/>
			</GeoJSONSource>

			<!--
				Flying-Squirrel RF heatmap — H3-binned RSSI coverage rendered via
				MapLibre's native heatmap layer. Authored FIRST among the RF layers
				so the continuous density surface sits underneath drive-path,
				centroid dots, and device markers (operator needs to see pins ON
				the heatmap, not under it).
			-->
			<GeoJSONSource id={RF_HEATMAP_SOURCE_ID} data={ms.rfHeatmapGeoJSON}>
				<HeatmapLayer
					id={RF_HEATMAP_LAYER_ID}
					layout={rfHeatmapLayer.layout}
					paint={rfHeatmapLayer.paint}
					minzoom={8}
					maxzoom={20}
				/>
			</GeoJSONSource>

			<!--
				Flying-Squirrel RF drive path — viridis-gradient line tracing the
				operator's GPS track. Authored before devices-src so device markers
				stay z-above the line. `lineMetrics={true}` is required for the
				line-progress paint expression in rfPathLayer.
			-->
			<GeoJSONSource id={RF_PATH_SOURCE_ID} data={ms.rfPathGeoJSON} lineMetrics={true}>
				<LineLayer
					id={RF_PATH_CASING_LAYER_ID}
					layout={rfPathCasingLayer.layout}
					paint={rfPathCasingLayer.paint}
				/>
				<LineLayer
					id={RF_PATH_LAYER_ID}
					layout={rfPathLayer.layout}
					paint={rfPathLayer.paint}
				/>
			</GeoJSONSource>

			<!--
				Flying-Squirrel RF AP centroids — RSSI-weighted mean position per
				BSSID. Dots sized by obsCount, colored by maxDbm. Authored before
				devices-src so cluster circles stay on top.
			-->
			<GeoJSONSource id={RF_CENTROID_SOURCE_ID} data={ms.rfCentroidGeoJSON}>
				<CircleLayer
					id={RF_CENTROID_HALO_LAYER_ID}
					layout={rfCentroidHaloLayer.layout}
					paint={rfCentroidHaloLayer.paint}
					minzoom={13}
				/>
				<CircleLayer
					id={RF_CENTROID_LAYER_ID}
					layout={rfCentroidLayer.layout}
					paint={rfCentroidLayer.paint}
					onclick={ms.handleCentroidClick}
					minzoom={13}
				/>
			</GeoJSONSource>

			<!--
				Highlight-on-select: rays from the selected centroid to every
				contributing observation, plus concentric rings around the
				centroid itself. Authored AFTER the centroid so the rings and
				rays sit on top of it rather than underneath.
			-->
			<!--
				PR-5 Confidence ellipse — RSSI-weighted 2σ region around the
				selected device. Visible at zoom 15+ so it doesn't overwhelm
				wide-area views. Minzoom chosen to match PR-2's heatmap hide
				point (17) so the grammar escalates: heatmap -> centroid ->
				ellipse as the operator zooms in on a single AP.
			-->
			<GeoJSONSource id="rf-ellipse-src" data={ms.rfEllipseGeoJSON}>
				<FillLayer
					id="rf-ellipse"
					minzoom={15}
					paint={{
						'fill-color': '#A8B8E0',
						'fill-opacity': 0.12,
						'fill-outline-color': '#A8B8E0'
					}}
				/>
			</GeoJSONSource>
			<GeoJSONSource id={RF_HIGHLIGHT_RAYS_SOURCE_ID} data={ms.rfHighlightRaysGeoJSON}>
				<LineLayer
					id={RF_HIGHLIGHT_RAYS_LAYER_ID}
					layout={rfHighlightRaysLayer.layout}
					paint={rfHighlightRaysLayer.paint}
				/>
			</GeoJSONSource>
			<GeoJSONSource id={RF_HIGHLIGHT_RINGS_SOURCE_ID} data={ms.rfHighlightRingsGeoJSON}>
				<CircleLayer
					id={RF_HIGHLIGHT_RINGS_OUTER_LAYER_ID}
					layout={rfHighlightRingsOuterLayer.layout}
					paint={rfHighlightRingsOuterLayer.paint}
				/>
				<CircleLayer
					id={RF_HIGHLIGHT_RINGS_INNER_LAYER_ID}
					layout={rfHighlightRingsInnerLayer.layout}
					paint={rfHighlightRingsInnerLayer.paint}
				/>
			</GeoJSONSource>

			<GeoJSONSource
				id="devices-src"
				data={ms.deviceGeoJSON}
				cluster={!$isolatedDeviceMAC}
				clusterRadius={50}
				clusterMaxZoom={16}
				clusterMinPoints={3}
			>
				<CircleLayer
					id="device-clusters"
					filter={['has', 'point_count']}
					paint={{
						'circle-color': MAP_UI_COLORS.secondary.fallback,
						'circle-radius': [
							'step',
							['get', 'point_count'],
							16,
							10,
							20,
							50,
							26,
							100,
							32
						],
						'circle-opacity': 0.85,
						'circle-stroke-width': 2,
						'circle-stroke-color': MAP_UI_COLORS.border.fallback
					}}
					onclick={(ev) => {
						if (ms.map) onClusterClick(ms.map, ev);
					}}
				/>
				<MapLibreSymbolLayer
					id="device-cluster-count"
					filter={['has', 'point_count']}
					layout={{
						'text-field': ['get', 'point_count_abbreviated'],
						'text-font': ['Stadia Regular'],
						'text-size': 12,
						'text-allow-overlap': true
					}}
					paint={{ 'text-color': MAP_UI_COLORS.foreground.fallback }}
				/>
				<CircleLayer
					id="device-circles"
					filter={['!', ['has', 'point_count']]}
					paint={{
						'circle-radius': [
							'interpolate',
							['linear'],
							['zoom'],
							10,
							[
								'interpolate',
								['linear'],
								['get', 'clientCount'],
								0,
								3,
								1,
								4,
								5,
								5,
								15,
								7
							],
							14,
							[
								'interpolate',
								['linear'],
								['get', 'clientCount'],
								0,
								5,
								1,
								7,
								5,
								9,
								15,
								12
							],
							18,
							[
								'interpolate',
								['linear'],
								['get', 'clientCount'],
								0,
								6,
								1,
								9,
								5,
								12,
								15,
								16
							]
						],
						'circle-color': ['get', 'color'],
						'circle-opacity': 0.9,
						'circle-stroke-width': ['case', ['>', ['get', 'clientCount'], 0], 1.5, 0.8],
						'circle-stroke-color': ['get', 'color'],
						'circle-stroke-opacity': [
							'case',
							['>', ['get', 'clientCount'], 0],
							0.7,
							0.5
						]
					}}
					onclick={ms.handleDeviceCircleClick}
				/>
			</GeoJSONSource>

			<DeviceSymbolLayer data={ms.milSymFC} visible={ms.milSymsVisible} />

			{#if ms.towerPopupLngLat && ms.towerPopupContent}
				<Popup
					lnglat={ms.towerPopupLngLat}
					class="map-popup"
					closeButton={true}
					onclose={ms.closeTowerPopup}
				>
					<TowerPopup content={ms.towerPopupContent} />
				</Popup>
			{/if}

			{#if ms.gpsLngLat && ms.showCone && ms.headingDeg !== null}
				<Marker lnglat={ms.gpsLngLat} anchor="center">
					{#snippet content()}
						<div class="heading-cone">
							<!-- @constitutional-exemption Article-IX-9.4 issue:#13 — buildConeSVG() returns hardcoded SVG string from numeric heading, no user input -->
							{@html buildConeSVG(ms.headingDeg ?? 0)}
						</div>
					{/snippet}
				</Marker>
			{/if}

			{#if ms.gpsLngLat}
				<Marker lnglat={ms.gpsLngLat} anchor="center">
					{#snippet content()}<div class="gps-dot"></div>{/snippet}
				</Marker>
			{/if}
		</MapLibre>
	{/if}

	{#if ms.popupContent}
		<DeviceOverlay content={ms.popupContent} onclose={ms.closeDevicePopup} />
	{/if}

	{#if $gpsStore.status.hasGPSFix}
		<div class="gps-legend">
			<div class="legend-line1">
				<span class="legend-gps-tag">GPS {$gpsStore.status.satellites} SAT</span>
				{#if $gpsStore.status.currentCountry.name}
					<span class="legend-sep">·</span>
					<span class="legend-location">{$gpsStore.status.currentCountry.name}</span>
				{/if}
			</div>
			<div class="legend-line2">
				<span class="legend-coord">{$gpsStore.status.formattedCoords.lat}</span>
				<span class="legend-coord">{$gpsStore.status.formattedCoords.lon}</span>
				<span class="legend-mgrs">{$gpsStore.status.mgrsCoord}</span>
				{#if $gpsStore.status.altitude != null}
					<span class="legend-asl">{Math.round($gpsStore.status.altitude)}m ASL</span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	@import './map/map-overrides.css';
	@import './map/map-markers.css';
	.map-area {
		flex: 1;
		position: relative;
		overflow: hidden;
	}
	.map-area :global(.map-container) {
		width: 100%;
		height: 100%;
	}

	.gps-legend {
		position: absolute;
		bottom: 16px;
		left: 12px;
		background: color-mix(in srgb, var(--background) 80%, transparent);
		border-radius: 2px;
		padding: 6px 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		z-index: 10;
		pointer-events: none;
	}

	.legend-line1 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-mono, 'Fira Code', monospace);
		white-space: nowrap;
	}

	.legend-line2 {
		display: flex;
		align-items: center;
		gap: 12px;
		font-family: var(--font-mono, 'Fira Code', monospace);
		white-space: nowrap;
	}

	.legend-gps-tag {
		font-size: 14px;
		font-weight: 600;
		color: var(--primary);
		letter-spacing: 1px;
	}

	.legend-sep {
		font-size: 14px;
		color: var(--muted-foreground);
	}

	.legend-location {
		font-size: 14px;
		color: var(--foreground-muted);
		letter-spacing: 0.5px;
	}

	.legend-coord {
		font-size: 14px;
		color: var(--foreground-muted);
	}

	.legend-mgrs {
		font-size: 14px;
		color: var(--muted-foreground);
		letter-spacing: 0.5px;
	}

	.legend-asl {
		font-size: 14px;
		color: var(--muted-foreground);
		letter-spacing: 0.5px;
	}
</style>
