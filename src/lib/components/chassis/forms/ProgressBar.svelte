<script lang="ts">
	import { ProgressBar as CarbonProgressBar } from 'carbon-components-svelte';

	interface Props {
		labelText: string;
		helperText?: string;
		hideLabel?: boolean;
		max?: number;
		value?: number;
		size?: 'sm' | 'md';
		kind?: 'default' | 'inline' | 'indented';
		status?: 'active' | 'finished' | 'error';
		id?: string;
		class?: string;
	}

	let {
		labelText,
		helperText = '',
		hideLabel = false,
		max = 100,
		value,
		size = 'md',
		kind = 'default',
		status = 'active',
		id,
		class: extraClass = ''
	}: Props = $props();
</script>

<CarbonProgressBar
	{labelText}
	{helperText}
	{hideLabel}
	{max}
	{value}
	{size}
	{kind}
	{status}
	{id}
	class={extraClass}
/>
