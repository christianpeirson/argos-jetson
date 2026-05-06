<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export interface AccordionItemDef {
		id: string;
		title: string;
		open?: boolean;
		disabled?: boolean;
		body: Snippet;
	}
</script>

<script lang="ts">
	import { Accordion as CarbonAccordion, AccordionItem } from 'carbon-components-svelte';

	interface Props {
		items: AccordionItemDef[];
		size?: 'sm' | 'xl';
		align?: 'start' | 'end';
		disabled?: boolean;
		skeleton?: boolean;
		class?: string;
	}

	let {
		items,
		size,
		align = 'end',
		disabled = false,
		skeleton = false,
		class: extraClass = ''
	}: Props = $props();
</script>

<CarbonAccordion {size} {align} {disabled} {skeleton} class={extraClass}>
	{#each items as item (item.id)}
		<AccordionItem
			title={item.title}
			open={item.open ?? false}
			disabled={item.disabled ?? false}
		>
			{@render item.body()}
		</AccordionItem>
	{/each}
</CarbonAccordion>
