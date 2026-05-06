<script lang="ts" module>
	export interface ContentSwitcherOption {
		text: string;
		disabled?: boolean;
	}
</script>

<script lang="ts">
	import { ContentSwitcher as CarbonContentSwitcher, Switch } from 'carbon-components-svelte';

	interface Props {
		options: ContentSwitcherOption[];
		selectedIndex?: number;
		size?: 'sm' | 'xl';
		class?: string;
		onChange?: (index: number, text: string) => void;
	}

	let {
		options,
		selectedIndex = $bindable(0),
		size,
		class: extraClass = '',
		onChange
	}: Props = $props();

	function handleChange(e: CustomEvent<number>): void {
		selectedIndex = e.detail;
		onChange?.(e.detail, options[e.detail]?.text ?? '');
	}
</script>

<CarbonContentSwitcher bind:selectedIndex {size} class={extraClass} on:change={handleChange}>
	{#each options as option (option.text)}
		<Switch text={option.text} disabled={option.disabled ?? false} />
	{/each}
</CarbonContentSwitcher>
