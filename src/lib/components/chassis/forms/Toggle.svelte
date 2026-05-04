<script lang="ts">
	import { Toggle as CarbonToggle } from 'carbon-components-svelte';

	interface Props {
		toggled?: boolean;
		labelText: string;
		labelA?: string;
		labelB?: string;
		hideLabel?: boolean;
		disabled?: boolean;
		size?: 'default' | 'sm';
		name?: string;
		id?: string;
		class?: string;
		onToggle?: (toggled: boolean) => void;
	}

	let {
		toggled = $bindable(false),
		labelText,
		labelA = 'Off',
		labelB = 'On',
		hideLabel = false,
		disabled = false,
		size = 'default',
		name,
		id,
		class: extraClass = '',
		onToggle
	}: Props = $props();

	function handle(e: CustomEvent<{ toggled: boolean }>): void {
		toggled = e.detail.toggled;
		onToggle?.(e.detail.toggled);
	}
</script>

<CarbonToggle
	bind:toggled
	{labelText}
	{labelA}
	{labelB}
	{hideLabel}
	{disabled}
	{size}
	{name}
	{id}
	class={extraClass}
	on:toggle={handle}
/>
