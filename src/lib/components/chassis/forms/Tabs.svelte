<script lang="ts" module>
	import type { Component } from 'svelte';

	export interface TabDef {
		id: string;
		label: string;
		badge?: string | number;
		hasItems?: boolean;
		disabled?: boolean;
		icon?: Component;
		secondaryLabel?: string;
	}
</script>

<script lang="ts">
	import { Tab as CarbonTab, Tabs as CarbonTabs } from 'carbon-components-svelte';

	interface Props {
		tabs: TabDef[];
		selectedId?: string;
		type?: 'default' | 'container';
		autoWidth?: boolean;
		fullWidth?: boolean;
		iconDescription?: string;
		class?: string;
		onChange?: (id: string) => void;
	}

	let {
		tabs,
		selectedId = $bindable(tabs[0]?.id ?? ''),
		type = 'default',
		autoWidth = false,
		fullWidth = false,
		iconDescription = 'Show menu options',
		class: className,
		onChange
	}: Props = $props();

	const selectedIndex = $derived(
		Math.max(
			0,
			tabs.findIndex((t) => t.id === selectedId)
		)
	);

	$effect(() => {
		if (tabs.length === 0) {
			if (selectedId !== '') selectedId = '';
			return;
		}
		if (!tabs.some((t) => t.id === selectedId)) {
			selectedId = tabs[0].id;
		}
	});

	function handleChange(e: CustomEvent<number>): void {
		const next = tabs[e.detail];
		if (next && next.id !== selectedId) {
			selectedId = next.id;
			onChange?.(next.id);
		}
	}
</script>

<CarbonTabs
	selected={selectedIndex}
	{type}
	{autoWidth}
	{fullWidth}
	{iconDescription}
	class={className}
	on:change={handleChange}
>
	{#each tabs as tab (tab.id)}
		<CarbonTab
			label={tab.label}
			disabled={tab.disabled ?? false}
			icon={tab.icon}
			secondaryLabel={tab.secondaryLabel ?? ''}
			class={tab.hasItems ? 'lunaris-has-items' : undefined}
		>
			{#if tab.badge !== undefined}
				<span class="lunaris-tab-with-badge">
					<span>{tab.label}</span>
					<span class="lunaris-tab-badge" aria-label={`${tab.badge} items`}
						>{tab.badge}</span
					>
				</span>
			{:else}
				{tab.label}
			{/if}
		</CarbonTab>
	{/each}
</CarbonTabs>

<style>
	:global(
		.bx--tabs__nav-item.lunaris-has-items:not(.bx--tabs__nav-item--selected) .bx--tabs__nav-link
	) {
		color: var(--warning);
	}

	.lunaris-tab-with-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.lunaris-tab-badge {
		font-size: 0.85em;
		font-variant-numeric: tabular-nums;
		color: inherit;
		opacity: 0.7;
	}

	:global(.bx--tabs__nav-item--selected) .lunaris-tab-badge {
		opacity: 1;
	}
</style>
