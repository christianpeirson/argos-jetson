<script lang="ts">
	import { eventBuffer } from '$lib/state/events.svelte';
	import type { AppEvent, AppEventLevel } from '$lib/types/event';

	interface Props {
		onSelect: (evt: AppEvent) => void;
		selectedId?: string | null;
		maxRows?: number;
	}

	const { onSelect, selectedId = null, maxRows = 25 }: Props = $props();

	const visibleEvents = $derived(eventBuffer.events.slice(0, maxRows));

	const LEVEL_LABEL: Record<AppEventLevel, string> = {
		info: 'INF',
		warn: 'WRN',
		error: 'ALM'
	};

	function timeLabel(ts: number): string {
		const d = new Date(ts);
		return `${d.toLocaleTimeString('en-GB', { hour12: false })}Z`;
	}
</script>

<section class="ev-band" aria-label="Event stream">
	<header class="ev-head">
		<span class="ev-tag">LOG-07</span>
		<span class="ev-name">EVENT STREAM</span>
		<span class="ev-meta">
			{eventBuffer.events.length} EVENTS · CLICK FOR DETAIL
		</span>
	</header>

	{#if visibleEvents.length === 0}
		<div class="empty">no events</div>
	{:else}
		<ul class="ev-list" role="list">
			{#each visibleEvents as evt (evt.id)}
				<li>
					<button
						type="button"
						class="ev-row"
						class:sel={selectedId === evt.id}
						data-level={evt.level}
						onclick={() => onSelect(evt)}
					>
						<span class="ev-t">{timeLabel(evt.timestamp)}</span>
						<span class="ev-code" data-level={evt.level}>{LEVEL_LABEL[evt.level]}</span>
						<span class="ev-src">{evt.source}</span>
						<span class="ev-msg">{(evt.payload?.message as string) ?? evt.source}</span>
						<span class="ev-chev" aria-hidden="true">›</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.ev-band {
		display: flex;
		flex-direction: column;
		min-height: 0;
		max-height: 240px;
		background: var(--mk2-bg-2);
		border: 1px solid var(--mk2-line);
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
	}

	.ev-head {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--mk2-line);
	}

	.ev-tag {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-accent);
		letter-spacing: 0.12em;
	}

	.ev-name {
		font-size: var(--mk2-fs-2);
		letter-spacing: 0.1em;
	}

	.ev-meta {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.06em;
	}

	.ev-list {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		flex: 1;
	}

	.ev-row {
		display: grid;
		grid-template-columns: 80px 40px 100px 1fr 16px;
		gap: 8px;
		align-items: center;
		width: 100%;
		padding: 4px 10px;
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--mk2-line);
		color: var(--mk2-ink-2);
		font-family: var(--mk2-f-mono);
		font-size: var(--mk2-fs-2);
		text-align: left;
		cursor: pointer;
	}

	.ev-row:hover {
		background: var(--mk2-bg);
		color: var(--mk2-ink);
	}

	.ev-row.sel {
		background: var(--mk2-bg);
		border-left: 2px solid var(--mk2-accent);
		padding-left: 8px;
	}

	.ev-t {
		color: var(--mk2-ink-3);
		font-size: var(--mk2-fs-1);
	}

	.ev-code {
		font-size: var(--mk2-fs-1);
		letter-spacing: 0.1em;
		color: var(--mk2-ink-3);
	}

	.ev-code[data-level='info'] {
		color: var(--mk2-ink-3);
	}
	.ev-code[data-level='warn'] {
		color: var(--mk2-amber);
	}
	.ev-code[data-level='error'] {
		color: var(--mk2-red);
	}

	.ev-src {
		color: var(--mk2-ink-3);
		font-size: var(--mk2-fs-1);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.ev-msg {
		color: var(--mk2-ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ev-chev {
		color: var(--mk2-ink-4);
		text-align: right;
	}

	.empty {
		padding: 12px;
		color: var(--mk2-ink-4);
		font-size: var(--mk2-fs-2);
	}
</style>
