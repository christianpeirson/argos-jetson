<script lang="ts" module>
	export type TagKind =
		| 'red'
		| 'magenta'
		| 'purple'
		| 'blue'
		| 'cyan'
		| 'teal'
		| 'green'
		| 'gray'
		| 'cool-gray'
		| 'warm-gray'
		| 'high-contrast'
		| 'outline';
</script>

<script lang="ts">
	import { Tag as CarbonTag } from 'carbon-components-svelte';
	import type { Component, Snippet } from 'svelte';

	interface Props {
		type?: TagKind;
		filter?: boolean;
		interactive?: boolean;
		disabled?: boolean;
		size?: 'sm' | 'default';
		title?: string;
		icon?: Component;
		class?: string;
		onClose?: () => void;
		onClick?: () => void;
		children?: Snippet;
	}

	let {
		type = 'gray',
		filter = false,
		interactive = false,
		disabled = false,
		size = 'default',
		title,
		icon,
		class: extraClass = '',
		onClose,
		onClick,
		children
	}: Props = $props();

	function handleClose(): void {
		onClose?.();
	}

	function handleClick(): void {
		onClick?.();
	}
</script>

<CarbonTag
	{type}
	{filter}
	{interactive}
	{disabled}
	{size}
	{title}
	{icon}
	class={extraClass}
	on:close={handleClose}
	on:click={handleClick}
>
	{@render children?.()}
</CarbonTag>
