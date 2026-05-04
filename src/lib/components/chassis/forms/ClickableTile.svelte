<script lang="ts">
	import { ClickableTile as CarbonClickableTile } from 'carbon-components-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		clicked?: boolean;
		light?: boolean;
		disabled?: boolean;
		href?: string;
		target?: '_self' | '_blank' | '_parent' | '_top';
		class?: string;
		onClick?: () => void;
		children?: Snippet;
	}

	let {
		clicked = $bindable(false),
		light = false,
		disabled = false,
		href,
		target,
		class: extraClass = '',
		onClick,
		children
	}: Props = $props();

	function handleClick(): void {
		onClick?.();
	}
</script>

<CarbonClickableTile
	bind:clicked
	{light}
	{disabled}
	{href}
	{target}
	class={extraClass}
	on:click={handleClick}
>
	{@render children?.()}
</CarbonClickableTile>
