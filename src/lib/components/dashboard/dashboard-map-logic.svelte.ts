/** Reactive logic for DashboardMap: effects, derived state, and event handlers. */
import type { FeatureCollection } from 'geojson';
import type { LngLatLike } from 'maplibre-gl';
import type maplibregl from 'maplibre-gl';
import { fromStore } from 'svelte/store';

import { RF_CENTROID_HALO_LAYER_ID, RF_CENTROID_LAYER_ID } from '$lib/map/layers/rf-centroid-layer';
import type { SatelliteLayer } from '$lib/map/layers/satellite-layer';
import type { SymbolLayer } from '$lib/map/layers/symbol-layer';
import { promotedDevices, visibilityMode } from '$lib/map/visibility-engine';
import { selectDevice } from '$lib/stores/dashboard/agent-context-store';
import {
	activeBands,
	isolatedDeviceMAC,
	isolateDevice,
	layerVisibility
} from '$lib/stores/dashboard/dashboard-store';
import { GOOGLE_SATELLITE_STYLE, mapSettings } from '$lib/stores/dashboard/map-settings-store';
import { rfOverlays } from '$lib/stores/dashboard/rf-overlay-store';
import { uasStore } from '$lib/stores/dragonsync/uas-store';
import { rfVisualization } from '$lib/stores/rf-visualization.svelte';
import { kismetStore } from '$lib/stores/tactical-map/kismet-store';
import { takCotMessages } from '$lib/stores/tak-store';
import { themeStore } from '$lib/stores/theme-store.svelte';
import { HackRFDataService } from '$lib/tactical-map/hackrf-data-service';
import { ellipseToPolygon } from '$lib/utils/ellipse-geometry';

import { MAP_UI_COLORS } from './map/map-colors';
import { buildConnectionLinesGeoJSON, buildDeviceGeoJSON } from './map/map-geojson';
import { createGpsDerivedState, hasRealGPSFix } from './map/map-gps-derived.svelte';
import {
	type CellTowerFetchState,
	handleClusterClick as onClusterClick,
	handleDeviceClick as deviceClickHandler,
	handleTowerClick as towerClickHandler,
	maybeFetchCellTowers,
	type PopupState,
	syncClusterVisibility,
	syncLayerVisibility,
	syncThemePaint,
	type TowerPopupState,
	updateSymbolLayer
} from './map/map-handlers';
import { setupMap } from './map/map-setup';
import { applyDimOthers } from './map/rf-highlight-paint';
import { clearAllOverlays, syncRFOverlays } from './map/rf-propagation-overlay.svelte';
import { buildUASConnectionLinesGeoJSON, buildUASGeoJSON } from './map/uas-geojson';

// PopupState and TowerPopupState consumed by map-handlers.ts and map-handlers-helpers.ts
// fallow-ignore-next-line unused-type
export type { PopupState, TowerPopupState };
export { MAP_UI_COLORS, onClusterClick, towerClickHandler };

/** Create all reactive map state and effects. Call once from the component. */
export function createMapState() {
	const kismet$ = fromStore(kismetStore);
	const takCot$ = fromStore(takCotMessages);
	const isolatedMAC$ = fromStore(isolatedDeviceMAC);
	const bands$ = fromStore(activeBands);
	const visMode$ = fromStore(visibilityMode);
	const promoted$ = fromStore(promotedDevices);
	const layerVis$ = fromStore(layerVisibility);
	const mapS$ = fromStore(mapSettings);
	const rfOverlays$ = fromStore(rfOverlays);

	let map: maplibregl.Map | undefined = $state();
	let symbolLayer: SymbolLayer | undefined = $state();
	let satLayer: SatelliteLayer | undefined = $state();
	let initialViewSet = false;
	let cssReady = $state(false);
	let stadiaChecked = $state(false);
	let stadiaOk = $state(false);
	let mapStyle: maplibregl.StyleSpecification | string = $derived.by(() => {
		const settings = mapS$.current;
		if (settings.type === 'satellite') {
			return GOOGLE_SATELLITE_STYLE;
		}
		// Vector/tactical: use Stadia if available, otherwise fall back to satellite tiles
		return stadiaOk ? '/api/map-tiles/styles/alidade_smooth_dark.json' : GOOGLE_SATELLITE_STYLE;
	});
	let cellTowerGeoJSON: FeatureCollection = $state({ type: 'FeatureCollection', features: [] });
	const towerFetchState: CellTowerFetchState = { lastLat: 0, lastLon: 0 };
	let _popupLngLat: LngLatLike | null = $state(null);
	let popupContent: PopupState | null = $state(null);
	let towerPopupLngLat: LngLatLike | null = $state(null);
	let towerPopupContent: TowerPopupState | null = $state(null);

	const gpsDerived = createGpsDerivedState({
		get current() {
			return cssReady;
		}
	});

	// HackRF SSE data service — populates hackrfStore.targetFrequency
	const hackrfService = new HackRFDataService();
	$effect(() => {
		hackrfService.start();
		return () => hackrfService.stop();
	});

	const deviceGeoJSON: FeatureCollection = $derived(
		buildDeviceGeoJSON(
			kismet$.current,
			isolatedMAC$.current,
			bands$.current,
			visMode$.current,
			promoted$.current
		)
	);
	const visibleDeviceMACs: Set<string> = $derived(
		new Set(deviceGeoJSON.features.map((f) => f.properties?.mac as string).filter(Boolean))
	);
	const connectionLinesGeoJSON: FeatureCollection = $derived(
		buildConnectionLinesGeoJSON(
			kismet$.current,
			isolatedMAC$.current,
			layerVis$.current.connectionLines,
			visibleDeviceMACs
		)
	);

	const uas$ = fromStore(uasStore);
	const uasGeoJSON: FeatureCollection = $derived(buildUASGeoJSON(uas$.current));
	const uasLinesGeoJSON: FeatureCollection = $derived(
		buildUASConnectionLinesGeoJSON(uas$.current)
	);

	// Flying-Squirrel-style RF overlays — read directly from the runes store.
	// `rfVisualization.features` is a class $state field, so these $derived
	// reads are tracked and the GeoJSONSource data prop updates when load()
	// writes new features.
	const rfPathGeoJSON: FeatureCollection = $derived(rfVisualization.features.path);
	const rfCentroidGeoJSON: FeatureCollection = $derived(rfVisualization.features.centroids);
	const rfHeatmapGeoJSON: FeatureCollection = $derived(rfVisualization.features.heatmap);

	// Highlight-on-select: look up the selected centroid's coordinates in
	// the centroid feature collection. Returned as [lon, lat] or null when
	// the device has no centroid (e.g. observations load before centroids).
	const selectedCentroidCoords: [number, number] | null = $derived.by(() => {
		const id = rfVisualization.selectedDeviceId;
		if (!id) return null;
		const match = rfVisualization.features.centroids.features.find(
			(f) => (f.properties as { deviceId?: string } | null)?.deviceId === id
		);
		if (!match) return null;
		return match.geometry.coordinates as [number, number];
	});

	// Rays: one LineString per observation, from the selected centroid to
	// that observation's point. Fed to the `rf-highlight-rays` LineLayer.
	const rfHighlightRaysGeoJSON: FeatureCollection = $derived.by(() => {
		const centroid = selectedCentroidCoords;
		if (!centroid) return { type: 'FeatureCollection', features: [] };
		const obs = rfVisualization.selectedObservations.features;
		return {
			type: 'FeatureCollection',
			features: obs.map((o) => ({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [centroid, o.geometry.coordinates as [number, number]]
				},
				properties: o.properties ?? {}
			}))
		};
	});

	// Confidence ellipse (PR-5). FeatureCollection with zero or one polygon
	// feature — empty until the operator selects a device AND the observation
	// fetch returned an ellipse for it.
	const rfEllipseGeoJSON: FeatureCollection = $derived.by(() => {
		const ell = rfVisualization.selectedEllipse;
		if (!ell) return { type: 'FeatureCollection', features: [] };
		return { type: 'FeatureCollection', features: [ellipseToPolygon(ell)] };
	});

	// Rings: a single Point at the selected centroid's location. The two
	// concentric ring CircleLayers render around it.
	const rfHighlightRingsGeoJSON: FeatureCollection = $derived.by(() => {
		const centroid = selectedCentroidCoords;
		if (!centroid) return { type: 'FeatureCollection', features: [] };
		return {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					geometry: { type: 'Point', coordinates: centroid },
					properties: { deviceId: rfVisualization.selectedDeviceId }
				}
			]
		};
	});

	// Mirror the dashboard-store's isolatedDeviceMAC into the RF store so
	// that selecting an AP anywhere (map or panel) triggers the highlight
	// fetch. The store's setter no-ops on redundant sets so this is cheap.
	$effect(() => {
		rfVisualization.setSelectedDevice(isolatedMAC$.current);
	});

	// Fire one load on mount. The store internally LRU-caches by filter hash,
	// so redundant calls are cheap; session-aware refetch is Phase A.3 work.
	$effect(() => {
		void rfVisualization.load();
	});

	// Resolve the active session on mount so the heatmap/centroid/path layers
	// scope to the CURRENT Kismet/BD run — not the union across all sessions.
	// Before this, the layers only resolved after the operator opened the
	// SessionSelector panel, which meant a fresh "Start Kismet" left the map
	// showing pre-session test data instead of the observations just persisted.
	$effect(() => {
		if (!rfVisualization.sessionsLoaded && !rfVisualization.sessionsLoading) {
			void rfVisualization.loadSessions();
		}
	});

	// Live-refresh: open an SSE stream to /api/rf/stream for the active
	// session. Reconnects automatically when the user switches sessions.
	// Closed on component teardown so we don't leak EventSources.
	$effect(() => {
		const sid = rfVisualization.activeSessionId;
		rfVisualization.connectLive(sid);
		return () => rfVisualization.disconnectLive();
	});

	$effect(() => {
		fetch('/api/map-tiles/styles/alidade_smooth_dark.json', { method: 'HEAD' })
			.then((res) => {
				stadiaOk = res.ok;
				stadiaChecked = true;
				mapSettings.stadiaAvailable.set(res.ok);
			})
			.catch(() => {
				stadiaOk = false;
				stadiaChecked = true;
				mapSettings.stadiaAvailable.set(false);
			});
	});
	$effect(() => {
		queueMicrotask(() => {
			cssReady = true;
		});
	});
	$effect(() => {
		if (!satLayer) return;
		const settings = mapS$.current;
		if (settings.type === 'satellite') {
			satLayer.add(settings.url, settings.attribution);
			satLayer.setVisible(true);
		} else satLayer.setVisible(false);
	});
	$effect(() => {
		if (symbolLayer)
			updateSymbolLayer(
				symbolLayer,
				deviceGeoJSON,
				kismet$.current.deviceAffiliations,
				takCot$.current
			);
	});
	$effect(() => {
		const { lat, lon } = gpsDerived.gps$.current.position;
		if (initialViewSet || !map) return;
		if (!hasRealGPSFix(lat, lon, gpsDerived.gps$.current.status.hasGPSFix)) return;
		map.flyTo({ center: [lon, lat], zoom: 15 });
		initialViewSet = true;
	});
	$effect(() => {
		// cssReady is set via queueMicrotask after the component mounts, which
		// yields past the first paint frame. Gating here ensures the cell tower
		// fetch (/api/cell-towers/nearby) does not fire on the LCP critical path.
		if (!cssReady) return;
		const { lat, lon } = gpsDerived.gps$.current.position;
		maybeFetchCellTowers(lat, lon, towerFetchState).then((r) => {
			if (r) cellTowerGeoJSON = r;
		});
	});
	$effect(() => {
		if (map) syncLayerVisibility(map, layerVis$.current, isolatedMAC$.current, symbolLayer);
	});
	$effect(() => {
		if (map)
			syncClusterVisibility(
				map,
				isolatedMAC$.current,
				layerVis$.current.deviceDots !== false
			);
	});
	$effect(() => {
		const _p = themeStore.palette;
		if (map) syncThemePaint(map);
	});
	$effect(() => {
		const overlays = rfOverlays$.current;
		const rfVis = layerVis$.current.rfPropagation !== false;
		if (map) syncRFOverlays(map, overlays, rfVis);
	});
	// Teardown: clear RF overlays only when the map instance is destroyed.
	// NOT inside the above $effect — Svelte 5 cleanup runs before every re-run,
	// which would wipe overlays immediately after syncRFOverlays adds them.
	$effect(() => {
		const m = map;
		if (!m) return;
		return () => clearAllOverlays(m);
	});

	// Dim every non-selected RF layer to ~30% while a device is isolated.
	// Uses `*-opacity` (not `visibility`) so operator layer toggles still
	// independently control whether the layer renders at all.
	$effect(() => {
		if (map) applyDimOthers(map, rfVisualization.selectedDeviceId);
	});

	function applyDeviceClick(m: maplibregl.Map, ev: maplibregl.MapMouseEvent) {
		const result = deviceClickHandler(m, ev, kismet$.current.deviceAffiliations);
		if (!result) return;
		_popupLngLat = result.lngLat;
		popupContent = result.content;
		selectDevice(result.content.mac, { ...result.content });
		if (result.content.clientCount > 0) isolateDevice(result.content.mac);
		else if (result.content.parentAP) isolateDevice(result.content.parentAP);
		else isolateDevice(null);
	}
	function handleMapLoad() {
		if (!map || satLayer) return;
		const m = map;
		const init = () => {
			const r = setupMap(
				m,
				(ev) => applyDeviceClick(m, ev),
				closeDevicePopup,
				layerVis$.current
			);
			satLayer = r.satLayer;
			symbolLayer = r.symbolLayer;
			// Feed current zoom into the RF filter so the aggregation endpoint
			// can pick an H3 resolution that matches the viewport. Seeded on
			// load and updated on zoomend so pan-only interactions don't refetch.
			rfVisualization.setFilters({ zoom: m.getZoom() });
			void rfVisualization.load();
			m.on('zoomend', () => {
				rfVisualization.setFilters({ zoom: m.getZoom() });
				void rfVisualization.load();
			});
		};
		if (!map.loaded()) map.once('load', init);
		else init();
	}
	function handleLocateClick() {
		if (map && gpsDerived.gpsLngLat)
			map.flyTo({ center: gpsDerived.gpsLngLat as [number, number], zoom: 18 });
	}
	function handleDeviceCircleClick(ev: maplibregl.MapMouseEvent) {
		if (map) applyDeviceClick(map, ev);
	}
	function handleTowerCircleClick(ev: maplibregl.MapMouseEvent) {
		if (!map) return;
		const result = towerClickHandler(map, ev);
		if (result) {
			towerPopupLngLat = result.lngLat;
			towerPopupContent = result.content;
		}
	}
	// fallow-ignore-next-line complexity
	function handleCentroidClick(ev: maplibregl.MapMouseEvent) {
		if (!map) return;
		const features = map.queryRenderedFeatures(ev.point, {
			layers: [RF_CENTROID_LAYER_ID, RF_CENTROID_HALO_LAYER_ID]
		});
		const deviceId = (features[0]?.properties as { deviceId?: string } | undefined)?.deviceId;
		if (deviceId) isolateDevice(deviceId);
	}
	function closeTowerPopup(): void {
		towerPopupLngLat = null;
		towerPopupContent = null;
	}
	function closeDevicePopup() {
		_popupLngLat = null;
		popupContent = null;
		isolateDevice(null);
	}
	return {
		get map() {
			return map;
		},
		set map(v) {
			map = v;
		},
		get mapStyle() {
			return mapStyle;
		},
		get mapReady() {
			return stadiaChecked;
		},
		get cellTowerGeoJSON() {
			return cellTowerGeoJSON;
		},
		get popupContent() {
			return popupContent;
		},
		get towerPopupLngLat() {
			return towerPopupLngLat;
		},
		get towerPopupContent() {
			return towerPopupContent;
		},
		get accuracyColor() {
			return gpsDerived.accuracyColor;
		},
		get accuracyGeoJSON() {
			return gpsDerived.accuracyGeoJSON;
		},
		get detectionRangeGeoJSON() {
			return gpsDerived.detectionRangeGeoJSON;
		},
		get deviceGeoJSON() {
			return deviceGeoJSON;
		},
		get connectionLinesGeoJSON() {
			return connectionLinesGeoJSON;
		},
		get uasGeoJSON() {
			return uasGeoJSON;
		},
		get uasLinesGeoJSON() {
			return uasLinesGeoJSON;
		},
		get rfPathGeoJSON() {
			return rfPathGeoJSON;
		},
		get rfCentroidGeoJSON() {
			return rfCentroidGeoJSON;
		},
		get rfHeatmapGeoJSON() {
			return rfHeatmapGeoJSON;
		},
		get rfHighlightRaysGeoJSON() {
			return rfHighlightRaysGeoJSON;
		},
		get rfHighlightRingsGeoJSON() {
			return rfHighlightRingsGeoJSON;
		},
		get rfEllipseGeoJSON() {
			return rfEllipseGeoJSON;
		},
		get gpsLngLat() {
			return gpsDerived.gpsLngLat;
		},
		get headingDeg() {
			return gpsDerived.headingDeg;
		},
		get showCone() {
			return gpsDerived.showCone;
		},
		handleMapLoad,
		handleLocateClick,
		handleDeviceCircleClick,
		handleTowerCircleClick,
		handleCentroidClick,
		closeTowerPopup,
		closeDevicePopup
	};
}
