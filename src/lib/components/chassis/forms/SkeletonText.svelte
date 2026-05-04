<script lang="ts">
	import { SkeletonText as CarbonSkeletonText } from 'carbon-components-svelte';

	interface Props {
		lines?: number;
		paragraph?: boolean;
		heading?: boolean;
		width?: string;
		class?: string;
	}

	let {
		lines = 3,
		paragraph = false,
		heading = false,
		width = '100%',
		class: className
	}: Props = $props();
</script>

<CarbonSkeletonText {lines} {paragraph} {heading} {width} class={className} />
