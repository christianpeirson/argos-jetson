<script lang="ts">
	import '../app.css';
	// 2026-05-13: load Carbon Components Svelte's g100 dark theme so the
	// `bx--*` class hierarchy used by Reports / Wi-Fi tabs / Bluetooth toolbar
	// / Modal renders styled. Spec-026 Phase 0 left the Lunaris-Carbon overlay
	// scaffold empty (per-component @use migrations are Phase 1+), but Carbon
	// components are already in use across the dashboard — without this global
	// import they render as unstyled HTML with `bx--*` classes that resolve to
	// no rules. See design-system rules + memory project_argos_unified_source_tree.md.
	import 'carbon-components-svelte/css/g100.css';
	// spec 026 Phase 1 — Lunaris-on-Carbon theme overlay (currently a stub
	// with no @carbon/styles imports; subsequent commits add per-component
	// imports). Loaded AFTER carbon g100 so Lunaris token overrides cascade.
	import '$lib/styles/lunaris-carbon-theme.scss';

	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	import { page } from '$app/state';
	import ToastRegion from '$lib/components/chassis/ToastRegion.svelte';
	import { accentStore, densityStore } from '$lib/state/ui.svelte';
	import { markCSSLoaded } from '$lib/utils/css-loader';

	interface Props {
		children: Snippet;
	}
	let { children }: Props = $props();

	// spec-024 PR11 (T054) — Mk II is the default UI. `?ui=lunaris` is the
	// one-release escape hatch back to the legacy Lunaris shell; T055 next
	// release deletes both that escape and the legacy chassis. Reads:
	//   default                       → body[data-ui="mk2"]
	//   ?ui=lunaris                   → no data-ui attribute (Lunaris :root)
	//   ?ui=mk2 (old bookmark)        → still mk2 (idempotent)
	$effect(() => {
		const isLunaris = page.url.searchParams.get('ui') === 'lunaris';
		if (isLunaris) {
			document.body.removeAttribute('data-ui');
		} else {
			document.body.setAttribute('data-ui', 'mk2');
		}
	});

	// spec-024 PR2 T017 — Mk II tweaks: mirror accent + density stores onto
	// <body data-accent="..."> + <body data-density="..."> so the pre-wired
	// CSS selectors in app.css apply live without any component coupling.
	// Lunaris escape hatch strips both attributes so legacy mode stays clean.
	$effect(() => {
		const isLunaris = page.url.searchParams.get('ui') === 'lunaris';
		if (isLunaris) {
			document.body.removeAttribute('data-accent');
		} else {
			document.body.setAttribute('data-accent', accentStore.value);
		}
	});

	$effect(() => {
		const isLunaris = page.url.searchParams.get('ui') === 'lunaris';
		if (isLunaris) {
			document.body.removeAttribute('data-density');
		} else {
			document.body.setAttribute('data-density', densityStore.value);
		}
	});

	// CSS loading detection to prevent FOUC
	onMount(() => {
		markCSSLoaded();
	});
</script>

<svelte:head>
	<title>Argos — SDR & Network Analysis Console</title>
	<meta
		name="description"
		content="Army EW training console for SDR signal analysis, network reconnaissance, GPS tracking, and tactical communications."
	/>
</svelte:head>

<ToastRegion />

<main class="page-loading">
	{@render children()}
</main>
