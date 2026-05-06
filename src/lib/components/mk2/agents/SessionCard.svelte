<script lang="ts">
	import Tag from '$lib/components/chassis/forms/Tag.svelte';
	import type { SessionState, TmuxSession } from '$lib/types/agents';

	interface Props {
		session: TmuxSession;
		selected?: boolean;
		onOpen?: (id: string) => void;
	}

	const { session, selected = false, onOpen }: Props = $props();

	function dotClass(state: SessionState): string {
		return `dot dot--${state}`;
	}

	const isDead = $derived(session.state === 'dead');
	const focusLabel = $derived(session.att ? 'FOCUS' : 'ATTACH');
</script>

<article
	class={['ses-card', selected && 'sel', isDead && 'dead'].filter(Boolean).join(' ')}
	aria-label={`Session ${session.id}`}
>
	<header class="card-head">
		<div class="head-left">
			<span class={dotClass(session.state)} aria-hidden="true"></span>
			<span class="card-id">{session.id}</span>
		</div>
		<div class="head-right">
			{#if session.att}
				<span class="att" title="Attached" aria-label="Attached">A</span>
			{/if}
			<span class="card-state">{session.state}</span>
		</div>
	</header>

	<div class="card-cmd">{session.cmd}</div>
	<div class="card-preview">{session.preview}</div>

	<div class="card-meta">
		<span>W{session.windows}·P{session.panes}</span>
		<span aria-hidden="true">·</span>
		<span>{session.cpu}% CPU</span>
		<span aria-hidden="true">·</span>
		<span>{session.mem}M</span>
		<span class="meta-fill" aria-hidden="true"></span>
		<span>{session.last}</span>
	</div>

	<div class="card-tags">
		{#each session.tags as tag (tag)}
			<Tag type="cool-gray" size="sm">{tag}</Tag>
		{/each}
	</div>

	<div class="card-actions">
		<button
			type="button"
			class="btn primary"
			onclick={() => onOpen?.(session.id)}
			disabled={isDead}
		>
			{focusLabel}
		</button>
	</div>
</article>

<style>
	.ses-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 12px;
		background: var(--mk2-bg-2);
		border: 1px solid var(--mk2-line);
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
	}

	.ses-card.sel {
		border-color: var(--mk2-accent);
	}

	.ses-card.dead {
		opacity: 0.55;
	}

	.card-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.head-left,
	.head-right {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.card-id {
		font-size: var(--mk2-fs-3);
		letter-spacing: 0.04em;
	}

	.card-state {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}

	.dot--active {
		background: var(--mk2-green);
	}
	.dot--paused {
		background: var(--mk2-amber);
	}
	.dot--idle {
		background: var(--mk2-ink-4);
	}
	.dot--dead {
		background: var(--mk2-red);
	}

	.att {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-accent);
		border: 1px solid var(--mk2-accent);
		padding: 0 4px;
		letter-spacing: 0.06em;
	}

	.card-cmd {
		font-size: var(--mk2-fs-2);
		color: var(--mk2-ink-2);
		letter-spacing: 0.02em;
	}

	.card-preview {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.02em;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		display: flex;
		gap: 6px;
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.04em;
	}

	.meta-fill {
		flex: 1;
	}

	.card-tags {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.card-actions {
		display: flex;
		gap: 4px;
		margin-top: auto;
	}

	.btn {
		font-family: var(--mk2-f-mono);
		font-size: var(--mk2-fs-2);
		letter-spacing: 0.08em;
		padding: 4px 10px;
		background: transparent;
		color: var(--mk2-ink);
		border: 1px solid var(--mk2-line-2);
		cursor: pointer;
		text-transform: uppercase;
	}

	.btn:hover:not(:disabled) {
		border-color: var(--mk2-accent);
	}

	.btn.primary {
		flex: 1;
		background: var(--mk2-accent);
		color: var(--mk2-bg);
		border-color: var(--mk2-accent);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
