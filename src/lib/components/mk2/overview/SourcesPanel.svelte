<script lang="ts">
	import DataTable, {
		type DataTableHeader,
		type DataTableRow
	} from '$lib/components/chassis/forms/DataTable.svelte';
	import Tag from '$lib/components/chassis/forms/Tag.svelte';
	import { type SourcesState, sourcesStore } from '$lib/stores/dashboard/sources-store';
	import { SOURCE_STATE_TAG_KIND, type SourceStatus } from '$lib/types/overview-sources';

	let state = $state<SourcesState>({ sources: [], loading: false, error: null, source: 'mock' });

	$effect(() => {
		const unsub = sourcesStore.subscribe((s) => (state = s));
		return unsub;
	});

	const headers: DataTableHeader[] = [
		{ key: 'state', value: 'STATE' },
		{ key: 'name', value: 'SOURCE' },
		{ key: 'band', value: 'BAND' },
		{ key: 'rate', value: 'RATE' },
		{ key: 'since', value: 'SINCE' }
	];

	const rows = $derived<(DataTableRow & SourceStatus)[]>(state.sources.map((s) => ({ ...s })));

	const liveCount = $derived(state.sources.filter((s) => s.state === 'LIVE').length);
</script>

<section class="src-panel" aria-label="Data sources">
	<header class="src-head">
		<span class="src-tag">SRC-05</span>
		<span class="src-name">SOURCES</span>
		<span class="src-meta">{liveCount}/{state.sources.length} LIVE</span>
	</header>

	<div class="src-body">
		<DataTable {headers} {rows} size="compact" zebra stickyHeader>
			{#snippet cell({
				row,
				cell
			}: {
				row: DataTableRow;
				cell: { key: string; value: unknown };
			})}
				{#if cell.key === 'state'}
					<Tag type={SOURCE_STATE_TAG_KIND[row.state as SourceStatus['state']]} size="sm">
						{row.state}
					</Tag>
				{:else}
					{cell.value}
				{/if}
			{/snippet}
		</DataTable>
	</div>
</section>

<style>
	.src-panel {
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		background: var(--mk2-bg-2);
		border: 1px solid var(--mk2-line);
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
	}

	.src-head {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--mk2-line);
	}

	.src-tag {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-accent);
		letter-spacing: 0.12em;
	}

	.src-name {
		font-size: var(--mk2-fs-2);
		letter-spacing: 0.1em;
	}

	.src-meta {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.06em;
	}

	.src-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
	}
</style>
