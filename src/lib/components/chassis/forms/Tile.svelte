<script lang="ts">
	import { Tile as CarbonTile } from 'carbon-components-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		light?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { light = false, class: extraClass = '', children }: Props = $props();
</script>

<CarbonTile {light} class={extraClass}>
	{@render children?.()}
</CarbonTile>
