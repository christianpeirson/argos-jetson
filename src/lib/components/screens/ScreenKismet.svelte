<script lang="ts">
	// spec-024 PR10a T053 — Mk II Kismet screen.
	//
	// Sortable device table on the left, KismetInspector aside on the
	// right. Both panels read from the kismetStore runes singleton.
	// Inspector buttons emit through onAction, which records an
	// AppEvent into PR5c's eventBuffer so the operator audit trail
	// captures intent. Per-action backend wiring is deferred to
	// follow-up PRs as endpoints land. Per repo rule (no synthetic
	// data) the buttons never fake a backend response.

	import { onDestroy, onMount } from 'svelte';

	import KismetInspector from '$lib/components/screens/parts/KismetInspector.svelte';
	import { recordEvent } from '$lib/state/events.svelte';
	import { kismetStore } from '$lib/state/kismet.svelte';
	import type { KismetDevice, KismetSortKey } from '$lib/types/kismet-device';
	import { fmtNullable, fmtRelativeTime } from '$lib/utils/format-helpers';

	onMount(() => kismetStore.start());
	onDestroy(() => kismetStore.stop());

	interface ColumnDef {
		key: KismetSortKey;
		label: string;
		num: boolean;
	}

	const COLUMNS: readonly ColumnDef[] = [
		{ key: 'mac', label: 'MAC', num: false },
		{ key: 'vendor', label: 'VENDOR', num: false },
		{ key: 'ssid', label: 'SSID', num: false },
		{ key: 'channel', label: 'CH', num: true },
		{ key: 'rssiDbm', label: 'RSSI', num: true },
		{ key: 'lastSeen', label: 'SEEN', num: true }
	];

	function fmtChannel(d: KismetDevice): string {
		return d.channel === null ? '—' : String(d.channel);
	}
	function fmtRssi(d: KismetDevice): string {
		return d.rssiDbm === null ? '—' : d.rssiDbm.toFixed(0);
	}
	function fmtVendor(d: KismetDevice): string {
		return fmtNullable(d.vendor);
	}
	function fmtSsid(d: KismetDevice): string {
		return fmtNullable(d.ssid);
	}
	function fmtLastSeen(d: KismetDevice): string {
		return fmtRelativeTime(d.lastSeen);
	}

	function arrowFor(key: KismetSortKey): string {
		if (kismetStore.sortKey !== key) return '';
		return kismetStore.sortDir === 'asc' ? '▲' : '▼';
	}

	function selectRow(mac: string): void {
		kismetStore.select(kismetStore.selectedMac === mac ? null : mac);
	}

	function runAction(id: string): void {
		const sel = kismetStore.selected;
		if (!sel) return;
		recordEvent('info', 'kismet', { action: id, mac: sel.mac, ssid: sel.ssid });
	}
</script>

<div class="kismet-screen" data-screen="kismet">
	<section class="table-region" aria-labelledby="kismet-table-h">
		<header class="region-head">
			<span id="kismet-table-h" class="region-label">DEVICES</span>
			<span class="meta">
				{kismetStore.devices.length} ·
				{kismetStore.connected ? 'live' : (kismetStore.lastError ?? 'idle')}
			</span>
		</header>
		<div class="table-wrap">
			<table class="dev-table" aria-label="Kismet devices">
				<thead>
					<tr>
						{#each COLUMNS as col (col.key)}
							<th
								scope="col"
								class:num={col.num}
								class:active={kismetStore.sortKey === col.key}
							>
								<button
									type="button"
									onclick={() => kismetStore.toggleSort(col.key)}
								>
									{col.label}
									<span class="arrow">{arrowFor(col.key)}</span>
								</button>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#if kismetStore.sortedDevices.length === 0}
						<tr>
							<td colspan={COLUMNS.length} class="empty">
								{kismetStore.connected ? 'no devices' : 'awaiting kismet'}
							</td>
						</tr>
					{:else}
						{#each kismetStore.sortedDevices as d (d.mac)}
							<tr
								class:selected={d.mac === kismetStore.selectedMac}
								onclick={() => selectRow(d.mac)}
							>
								<td class="mono">{d.mac}</td>
								<td>{fmtVendor(d)}</td>
								<td>{fmtSsid(d)}</td>
								<td class="num">{fmtChannel(d)}</td>
								<td class="num rssi">{fmtRssi(d)}</td>
								<td class="num">{fmtLastSeen(d)}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</section>

	<KismetInspector device={kismetStore.selected} onAction={runAction} />
</div>

<style>
	.kismet-screen {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		gap: 12px;
		padding: 12px;
		height: 100%;
		min-height: 0;
		font-family: 'Fira Code', monospace;
	}
	.table-region {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 12px;
		border: 1px solid var(--border);
		background: var(--card);
		min-height: 0;
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
	.dev-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.dev-table th,
	.dev-table td {
		padding: 4px 6px;
		text-align: left;
		border-bottom: 1px dashed var(--border);
	}
	.dev-table th {
		position: sticky;
		top: 0;
		background: var(--card);
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted-foreground);
		font-weight: 500;
	}
	.dev-table th button {
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
	.dev-table th.active button {
		color: var(--mk2-accent, var(--primary));
	}
	.dev-table tbody tr {
		cursor: pointer;
	}
	.dev-table tbody tr:hover {
		background: color-mix(in srgb, var(--mk2-accent, currentColor) 8%, transparent);
	}
	.dev-table tbody tr.selected {
		background: color-mix(in srgb, var(--mk2-accent, currentColor) 16%, transparent);
	}
	.num {
		text-align: right;
	}
	.rssi {
		color: var(--mk2-ink, var(--foreground));
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
