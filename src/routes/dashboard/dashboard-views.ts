/**
 * Declarative view registry for the dashboard center region. Replaces the
 * ~25-branch `{#if $activeView}` chain that lived inline in +page.svelte.
 *
 * Each ActiveView maps to one entry; <DashboardViewRouter> renders it:
 *  - kind 'component' — lazy-imported view component (code-split island; the map
 *    entry is the one Part B will gate client-only for the SSR flip).
 *  - kind 'iframe'    — a ToolViewWrapper around an <iframe> (bettercap).
 *  - kind 'unavailable' — ToolUnavailableView with a title (tools with no UI).
 *
 * Views not listed fall back to 'unavailable' with the raw view name — same as
 * the old `{:else}` branch. Full-width views (reports/tak-config/globalprotect/
 * gsm-evil) stay in +page.svelte's fullWidth snippet; this registry owns only the
 * center content region.
 */
import type { Component } from 'svelte';

import type { ActiveView } from '$lib/types/dashboard-view';

type ComponentEntry = { kind: 'component'; load: () => Promise<{ default: Component }> };
type IframeEntry = { kind: 'iframe'; title: string; src: string };
type UnavailableEntry = { kind: 'unavailable'; title: string };
export type ViewEntry = ComponentEntry | IframeEntry | UnavailableEntry;

// Component views (prop-less; each renders its own ToolViewWrapper + back-to-map).
// Literal import paths — Vite requires statically-analyzable dynamic imports.
const COMPONENT_VIEWS: Partial<Record<ActiveView, () => Promise<{ default: Component }>>> = {
	map: () => import('$lib/components/dashboard/DashboardMap.svelte'),
	kismet: () => import('$lib/components/dashboard/views/KismetView.svelte'),
	openwebrx: () => import('$lib/components/dashboard/views/OpenWebRXView.svelte'),
	novasdr: () => import('$lib/components/dashboard/views/NovaSDRView.svelte'),
	sdrpp: () => import('$lib/components/dashboard/views/SDRppView.svelte'),
	'gnu-radio': () => import('$lib/components/dashboard/views/GnuRadioView.svelte'),
	wireshark: () => import('$lib/components/dashboard/views/WiresharkView.svelte'),
	'uas-scan': () => import('$lib/components/dashboard/views/UASScanView.svelte'),
	wigletotak: () => import('$lib/components/dashboard/views/WigleToTAKView.svelte'),
	bluehood: () => import('$lib/components/dashboard/views/BluehoodView.svelte'),
	'logs-analytics': () => import('$lib/components/dashboard/views/LogsAnalyticsView.svelte'),
	sightline: () => import('$lib/components/dashboard/views/SightlineView.svelte'),
	'sparrow-wifi': () => import('$lib/components/dashboard/views/SparrowView.svelte'),
	spiderfoot: () => import('$lib/components/dashboard/views/SpiderfootView.svelte'),
	webtak: () => import('$lib/components/dashboard/views/WebTAKView.svelte')
};

// Tools with no built-in UI — preserve the exact titles from the old chain.
const UNAVAILABLE_TITLES: Partial<Record<ActiveView, string>> = {
	hackrf: 'HackRF Spectrum Analyzer',
	'rtl-433': 'RTL-433 Decoder',
	btle: 'BTLE Scanner',
	droneid: 'Drone ID',
	pagermon: 'Pagermon',
	'rf-emitter': 'RF Emitter',
	wifite: 'Wifite2'
};

/** Resolve the center-region entry for a view (mirrors the old if/else chain). */
export function resolveViewEntry(view: ActiveView): ViewEntry {
	const load = COMPONENT_VIEWS[view];
	if (load) return { kind: 'component', load };
	if (view === 'bettercap')
		return { kind: 'iframe', title: 'Bettercap', src: 'http://localhost:80' };
	const title = UNAVAILABLE_TITLES[view] ?? view;
	return { kind: 'unavailable', title };
}
