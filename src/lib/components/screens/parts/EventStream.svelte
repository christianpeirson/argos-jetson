<script lang="ts">
	// spec-024 PR5c T033 — rolling event log for the OVERVIEW screen.
	//
	// Reads from the client-side eventBuffer ($state) and renders the
	// most-recent-first list. Click a row → opens EventDetailDialog with
	// the row's AppEvent. No backend dependency; the buffer is fed by
	// other client stores via recordEvent() (see state/missions.svelte.ts).

	import { eventBuffer } from '$lib/state/events.svelte';
	import type { AppEvent } from '$lib/types/event';

	import EventDetailDialog from './EventDetailDialog.svelte';

	let dialogOpen = $state(false);
	let selected = $state<AppEvent | null>(null);

	function open(evt: AppEvent): void {
		selected = evt;
		dialogOpen = true;
	}

	function timeLabel(ts: number): string {
		const d = new Date(ts);
		return d.toLocaleTimeString('en-GB', { hour12: false });
	}
</script>

<div class="event-stream">
	{#if eventBuffer.events.length === 0}
		<div class="empty">no events</div>
	{:else}
		<ul role="list" class="rows">
			{#each eventBuffer.events as evt (evt.id)}
				<li>
					<button
						type="button"
						class="row"
						data-level={evt.level}
						onclick={() => open(evt)}
					>
						<span class="time">{timeLabel(evt.timestamp)}</span>
						<span class="level">{evt.level.toUpperCase()}</span>
						<span class="src">{evt.source}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<EventDetailDialog bind:open={dialogOpen} event={selected} />

<style>
	.event-stream {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow: auto;
		font-family: 'Fira Code', monospace;
	}

	.empty {
		color: var(--muted-foreground);
		font-size: 11px;
		opacity: 0.6;
		padding: 8px 4px;
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.row {
		display: grid;
		grid-template-columns: 80px 50px 1fr;
		gap: 8px;
		width: 100%;
		padding: 4px 6px;
		background: transparent;
		border: 0;
		border-bottom: 1px dashed var(--border);
		color: var(--mk2-ink, var(--foreground));
		font: 400 11px/1.3 inherit;
		font-variant-numeric: tabular-nums;
		text-align: left;
		cursor: pointer;
	}

	.row:hover {
		background: color-mix(in srgb, var(--mk2-accent, currentColor) 8%, transparent);
	}

	.time {
		color: var(--mk2-ink-4, var(--muted-foreground));
	}

	.level {
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.row[data-level='warn'] .level {
		color: var(--mk2-warn, #d4a054);
	}

	.row[data-level='error'] .level {
		color: var(--mk2-err, #ff5c33);
	}

	.src {
		color: var(--mk2-ink, var(--foreground));
	}
</style>
