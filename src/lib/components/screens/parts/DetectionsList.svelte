<script lang="ts">
	// spec-024 PR5c T032 — ranked detections table.
	//
	// Reads from detectionsStore.ranked ($derived RSSI desc, max 20).
	// Every column projects from real DB columns or pure derivations of
	// real observations (see state/detections.svelte.ts). Empty state
	// renders when no signals are in the rolling 30 s window — no fabricated
	// rows. The store starts on mount and stops on destroy so the SSE
	// connection lifetime matches OVERVIEW screen visibility.

	import { onDestroy, onMount } from 'svelte';

	import { detectionsStore } from '$lib/state/detections.svelte';
	import type { Detection } from '$lib/types/detection';

	onMount(() => detectionsStore.start());
	onDestroy(() => detectionsStore.stop());

	function fmtBearing(d: Detection): string {
		return d.bearingDeg === null
			? '—'
			: `${Math.round(d.bearingDeg).toString().padStart(3, '0')}°`;
	}

	function fmtDistance(d: Detection): string {
		if (d.distanceM === null) return '—';
		return d.distanceM < 1000
			? `${Math.round(d.distanceM)}m`
			: `${(d.distanceM / 1000).toFixed(1)}km`;
	}

	function fmtRssi(d: Detection): string {
		return Number.isFinite(d.rssiDbm) ? d.rssiDbm.toFixed(0) : '—';
	}

	function fmtConfidence(d: Detection): string {
		return d.confidence === null ? '—' : `${Math.round(d.confidence * 100)}%`;
	}

	function fmtDesignator(d: Detection): string {
		return d.designator ?? d.signalId.slice(0, 12);
	}
</script>

<div class="detections">
	<div class="head">
		<span>SIGNAL</span>
		<span>BEAR</span>
		<span>DIST</span>
		<span>RSSI</span>
		<span>CONF</span>
	</div>
	{#if detectionsStore.ranked.length === 0}
		<div class="empty">
			{detectionsStore.connected ? 'no signals in window' : 'awaiting SSE'}
		</div>
	{:else}
		<ul role="list" class="rows">
			{#each detectionsStore.ranked as d (d.signalId)}
				<li class="row">
					<span class="sig" title={d.signalId}>{fmtDesignator(d)}</span>
					<span class="num">{fmtBearing(d)}</span>
					<span class="num">{fmtDistance(d)}</span>
					<span class="num rssi">{fmtRssi(d)}</span>
					<span class="num">{fmtConfidence(d)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.detections {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		font-family: 'Fira Code', monospace;
	}

	.head,
	.row {
		display: grid;
		grid-template-columns: minmax(100px, 1.4fr) 56px 56px 48px 56px;
		gap: 8px;
		padding: 4px 6px;
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}

	.head {
		color: var(--muted-foreground);
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		border-bottom: 1px solid var(--border);
	}

	.head > span:not(:first-child),
	.row .num {
		text-align: right;
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: auto;
		min-height: 0;
	}

	.row {
		border-bottom: 1px dashed var(--border);
	}

	.sig {
		color: var(--mk2-accent, var(--primary));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rssi {
		color: var(--mk2-ink, var(--foreground));
	}

	.empty {
		color: var(--muted-foreground);
		font-size: 11px;
		opacity: 0.6;
		padding: 8px 4px;
	}
</style>
