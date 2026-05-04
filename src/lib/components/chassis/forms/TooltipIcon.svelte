<script lang="ts">
	import { TooltipIcon as CarbonTooltipIcon } from 'carbon-components-svelte';
	import type { Component } from 'svelte';

	interface Props {
		tooltipText: string;
		icon: Component;
		size?: 16 | 20 | 24 | 32;
		direction?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
		enterDelayMs?: number;
		leaveDelayMs?: number;
		disabled?: boolean;
		open?: boolean;
		id?: string;
		class?: string;
		onClick?: (event: MouseEvent) => void;
		onOpen?: () => void;
		onClose?: () => void;
	}

	let {
		tooltipText,
		icon,
		size = 16,
		direction = 'bottom',
		align = 'center',
		enterDelayMs = 100,
		leaveDelayMs = 300,
		disabled = false,
		open = $bindable(false),
		id,
		class: className,
		onClick,
		onOpen,
		onClose
	}: Props = $props();
</script>

<CarbonTooltipIcon
	{tooltipText}
	{icon}
	{size}
	{direction}
	{align}
	{enterDelayMs}
	{leaveDelayMs}
	{disabled}
	bind:open
	{id}
	class={className}
	on:click={(e) => onClick?.(e)}
	on:open={() => onOpen?.()}
	on:close={() => onClose?.()}
/>
