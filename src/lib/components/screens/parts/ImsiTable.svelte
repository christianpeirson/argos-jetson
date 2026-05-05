<script lang="ts">
	// spec-024 PR10b T052 — Mk II GSM IMSI capture table.
	//
	// Sortable 7-column table reading from gsmStore.sortedRows. Click
	// row → gsmStore.select(id), which lazy-fetches the cell tower
	// location for the inspector strip. Empty-state row when no IMSIs
	// have been captured yet — never fabricates rows.

	import { gsmStore } from '$lib/state/gsm.svelte';
	import type { ImsiRow, ImsiSortKey } from '$lib/types/imsi-row';
	import { fmtNullable, fmtRelativeTime } from '$lib/utils/format-helpers';

	interface ColumnDef {
		key: ImsiSortKey;
		label: string;
		num: boolean;
	}

	const COLUMNS: readonly ColumnDef[] = [
		{ key: 'imsi', label: 'IMSI', num: false },
		{ key: 'tmsi', label: 'TMSI', num: false },
		{ key: 'mcc', label: 'MCC', num: true },
		{ key: 'mnc', label: 'MNC', num: true },
		{ key: 'lac', label: 'LAC', num: true },
		{ key: 'ci', label: 'CI', num: true },
		{ key: 'datetime', label: 'SEEN', num: true }
	];

	function fmtDatetime(r: ImsiRow): string {
		return fmtRelativeTime(r.datetime, { showDays: true });
	}

	function arrowFor(key: ImsiSortKey): string {
		if (gsmStore.sortKey !== key) return '';
		return gsmStore.sortDir === 'asc' ? '▲' : '▼';
	}

	function selectRow(id: number): void {
		gsmStore.select(gsmStore.selectedId === id ? null : id);
	}
</script>

<section class="table-region" aria-labelledby="gsm-table-h">
	<header class="region-head">
		<span id="gsm-table-h" class="region-label">IMSI CAPTURES</span>
		<span class="meta"
			>{gsmStore.rows.length} ·
			{gsmStore.running ? 'live' : 'idle'}</span
		>
	</header>
	<div class="table-wrap">
		<table class="imsi-table" aria-label="GSM IMSI captures">
			<thead>
				<tr>
					{#each COLUMNS as col (col.key)}
						<th
							scope="col"
							class:num={col.num}
							class:active={gsmStore.sortKey === col.key}
						>
							<button type="button" onclick={() => gsmStore.toggleSort(col.key)}>
								{col.label}
								<span class="arrow">{arrowFor(col.key)}</span>
							</button>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if gsmStore.sortedRows.length === 0}
					<tr>
						<td colspan={COLUMNS.length} class="empty">
							{gsmStore.running ? 'no captures yet' : 'scanner stopped'}
						</td>
					</tr>
				{:else}
					{#each gsmStore.sortedRows as r (r.id)}
						<tr
							class:selected={r.id === gsmStore.selectedId}
							onclick={() => selectRow(r.id)}
						>
							<td class="mono">{r.imsi}</td>
							<td class="mono">{fmtNullable(r.tmsi)}</td>
							<td class="num">{fmtNullable(r.mcc)}</td>
							<td class="num">{fmtNullable(r.mnc)}</td>
							<td class="num">{fmtNullable(r.lac)}</td>
							<td class="num">{fmtNullable(r.ci)}</td>
							<td class="num">{fmtDatetime(r)}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<style>
	.table-region {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 12px;
		border: 1px solid var(--border);
		background: var(--card);
		min-height: 0;
		font-family: 'Fira Code', monospace;
	}
	.region-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.region-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted-foreground);
	}
	.meta {
		font-size: 10px;
		color: var(--mk2-ink-4, var(--muted-foreground));
		font-variant-numeric: tabular-nums;
	}
	.table-wrap {
		overflow: auto;
		min-height: 0;
		flex: 1;
	}
	.imsi-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.imsi-table th,
	.imsi-table td {
		padding: 4px 6px;
		text-align: left;
		border-bottom: 1px dashed var(--border);
	}
	.imsi-table th {
		position: sticky;
		top: 0;
		background: var(--card);
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted-foreground);
		font-weight: 500;
	}
	.imsi-table th button {
		background: transparent;
		border: 0;
		color: inherit;
		font: inherit;
		padding: 0;
		cursor: pointer;
		display: inline-flex;
		gap: 4px;
		align-items: baseline;
	}
	.imsi-table th.active button {
		color: var(--mk2-accent, var(--primary));
	}
	.imsi-table tbody tr {
		cursor: pointer;
	}
	.imsi-table tbody tr:hover {
		background: color-mix(in srgb, var(--mk2-accent, currentColor) 8%, transparent);
	}
	.imsi-table tbody tr.selected {
		background: color-mix(in srgb, var(--mk2-accent, currentColor) 16%, transparent);
	}
	.num {
		text-align: right;
	}
	.mono {
		font-family: inherit;
	}
	.arrow {
		font-size: 8px;
		opacity: 0.7;
	}
	.empty {
		color: var(--muted-foreground);
		opacity: 0.6;
		padding: 8px;
		text-align: center;
	}
</style>
