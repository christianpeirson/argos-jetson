<script lang="ts" module>
	export interface StructuredListColumn {
		key: string;
		header: string;
		head?: boolean;
	}

	export interface StructuredListRowData {
		id: string;
		[key: string]: unknown;
	}
</script>

<script lang="ts">
	import {
		StructuredList as CarbonStructuredList,
		StructuredListBody,
		StructuredListCell,
		StructuredListHead,
		StructuredListRow
	} from 'carbon-components-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		columns: StructuredListColumn[];
		rows: StructuredListRowData[];
		condensed?: boolean;
		flush?: boolean;
		selection?: boolean;
		class?: string;
		cell?: Snippet<[{ row: StructuredListRowData; column: StructuredListColumn }]>;
	}

	let {
		columns,
		rows,
		condensed = false,
		flush = false,
		selection = false,
		class: extraClass = '',
		cell
	}: Props = $props();
</script>

<CarbonStructuredList {condensed} {flush} {selection} class={extraClass}>
	<StructuredListHead>
		<StructuredListRow head>
			{#each columns as column (column.key)}
				<StructuredListCell head>{column.header}</StructuredListCell>
			{/each}
		</StructuredListRow>
	</StructuredListHead>
	<StructuredListBody>
		{#each rows as row (row.id)}
			<StructuredListRow>
				{#each columns as column (column.key)}
					<StructuredListCell>
						{#if cell}
							{@render cell({ row, column })}
						{:else}
							{row[column.key] ?? ''}
						{/if}
					</StructuredListCell>
				{/each}
			</StructuredListRow>
		{/each}
	</StructuredListBody>
</CarbonStructuredList>
