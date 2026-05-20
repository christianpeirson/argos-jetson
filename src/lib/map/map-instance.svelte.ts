/**
 * Cross-tree map-instance singleton.
 *
 * `DashboardMap.svelte` owns the `<MapLibre>` mount and binds the live
 * MapLibre `Map` instance into this rune-state via `$effect`. Sibling
 * panels (e.g. `DevicesPanel`) read `mapInstance.map` and call methods
 * (`flyTo`, `easeTo`, etc.) directly.
 *
 * Replaces the previous `setContext('dashboardMap', { getMap, flyTo })`
 * pattern in DashboardMap.svelte. The Svelte context API only flows
 * down the component tree, but Argos panels are siblings of the map
 * (both nested inside DashboardShell, not inside <MapLibre>) — so the
 * library's own `getMapContext()` from `svelte-maplibre-gl` doesn't
 * reach them either. A module-scoped `$state` rune singleton is the
 * idiomatic Svelte 5 way to share reactive state across non-ancestor
 * components without context plumbing.
 *
 * Discovery: `rtk grep -rn 'mapInstance' src` lists every consumer.
 */
import type maplibregl from 'maplibre-gl';

class MapInstanceState {
	map = $state<maplibregl.Map | undefined>(undefined);
}

export const mapInstance = new MapInstanceState();
