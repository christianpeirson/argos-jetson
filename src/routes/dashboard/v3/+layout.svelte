<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	import { v3ThemeStore } from '$lib/stores/v3-theme-store.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Stamp data-ui='v3' (+ mode / palette) onto <body> so the [data-ui='v3']
	// token scope in src/app.css applies. The root +layout.svelte's Mk II
	// $effects early-return on /dashboard/v3 routes (the isV3 guard), so this
	// layout is the sole owner of the <body> attributes on the V3 surface.
	onMount(() => {
		v3ThemeStore.hydrate();
	});
</script>

{@render children()}
