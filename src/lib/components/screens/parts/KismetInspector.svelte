<script lang="ts">
	// spec-024 PR10a T053 — Kismet device inspector aside.
	//
	// Extracted from ScreenKismet.svelte to keep that file under the
	// 300-LOC component cap. Pure presentation + a callback-emit pattern:
	// action buttons fire `onAction(actionId)` — the parent screen
	// records the AppEvent. No synthetic data; no fake responses.

	import type { KismetDevice } from '$lib/types/kismet-device';
	import { fmtNullable, fmtRelativeTime } from '$lib/utils/format-helpers';

	interface Props {
		device: KismetDevice | null;
		onAction: (id: string) => void;
	}

	let { device, onAction }: Props = $props();

	const ACTIONS: readonly { id: string; label: string }[] = [
		{ id: 'pcap-filter', label: 'PCAP FILTER' },
		{ id: 'triangulate', label: 'TRIANGULATE' },
		{ id: 'deauth', label: 'DEAUTH' },
		{ id: 'blacklist', label: 'BLACKLIST' }
	];

	function fmtChannel(d: KismetDevice): string {
		return d.channel === null ? '—' : String(d.channel);
	}
	function fmtRssi(d: KismetDevice): string {
		return d.rssiDbm === null ? '—' : `${d.rssiDbm.toFixed(0)} dBm`;
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
</script>

<aside class="inspector-region" aria-labelledby="kismet-inspector-h">
	<header class="region-head">
		<span id="kismet-inspector-h" class="region-label">INSPECTOR</span>
	</header>
	{#if device}
		<div class="kv-list">
			<div class="kv-row">
				<span class="k">MAC</span><span class="v mono">{device.mac}</span>
			</div>
			<div class="kv-row">
				<span class="k">VENDOR</span><span class="v">{fmtVendor(device)}</span>
			</div>
			<div class="kv-row">
				<span class="k">SSID</span><span class="v">{fmtSsid(device)}</span>
			</div>
			<div class="kv-row">
				<span class="k">CHANNEL</span><span class="v num">{fmtChannel(device)}</span>
			</div>
			<div class="kv-row">
				<span class="k">RSSI</span><span class="v num">{fmtRssi(device)}</span>
			</div>
			<div class="kv-row">
				<span class="k">SEEN</span><span class="v num">{fmtLastSeen(device)}</span>
			</div>
		</div>
		<div class="actions">
			{#each ACTIONS as a (a.id)}
				<button type="button" class="action-btn" onclick={() => onAction(a.id)}>
					{a.label}
				</button>
			{/each}
		</div>
	{:else}
		<div class="inspector-empty">select a device</div>
	{/if}
</aside>

<style>
	.inspector-region {
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
	.kv-list {
		display: flex;
		flex-direction: column;
		font-size: 11px;
	}
	.kv-row {
		display: grid;
		grid-template-columns: 80px 1fr;
		gap: 8px;
		padding: 4px 0;
		border-bottom: 1px dashed var(--border);
		font-variant-numeric: tabular-nums;
	}
	.kv-row .k {
		color: var(--mk2-ink-4, var(--muted-foreground));
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.kv-row .v {
		color: var(--mk2-ink, var(--foreground));
	}
	.num {
		text-align: right;
	}
	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
		margin-top: 12px;
	}
	.action-btn {
		padding: 6px 10px;
		background: transparent;
		border: 1px solid var(--mk2-line, var(--border));
		color: var(--mk2-ink, var(--foreground));
		font: 500 10px / 1 inherit;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
	}
	.action-btn:hover {
		color: var(--mk2-accent, var(--primary));
		border-color: var(--mk2-accent, var(--primary));
	}
	.inspector-empty {
		color: var(--muted-foreground);
		opacity: 0.6;
		padding: 8px;
		text-align: center;
		font-size: 11px;
	}
</style>
