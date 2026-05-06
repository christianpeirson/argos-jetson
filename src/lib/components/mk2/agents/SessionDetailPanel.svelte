<script lang="ts">
	import StructuredList from '$lib/components/chassis/forms/StructuredList.svelte';
	import Tag from '$lib/components/chassis/forms/Tag.svelte';
	import type { TmuxSession } from '$lib/types/agents';

	interface Props {
		session: TmuxSession | null;
		onAttach?: (id: string) => void;
		onDetach?: (id: string) => void;
		onRename?: (id: string) => void;
		onKill?: (id: string) => void;
	}

	const { session, onAttach, onDetach, onRename, onKill }: Props = $props();

	const columns = [
		{ key: 'field', header: 'FIELD' },
		{ key: 'value', header: 'VALUE' }
	];

	const rows = $derived(
		session
			? [
					{ id: 'cmd', field: 'CMD', value: session.cmd },
					{ id: 'last', field: 'LAST ACTIVITY', value: session.last },
					{
						id: 'wp',
						field: 'WINDOWS · PANES',
						value: `${session.windows} · ${session.panes}`
					},
					{
						id: 'cpu-mem',
						field: 'CPU · MEM',
						value: `${session.cpu}% · ${session.mem} MB`
					},
					{ id: 'tags', field: 'TAGS', value: session.tags.join(', ') || '—' },
					{ id: 'att', field: 'ATTACHED', value: session.att ? 'yes' : 'no' }
				]
			: []
	);

	const isDead = $derived(session?.state === 'dead');
	const focusLabel = $derived(session?.att ? 'FOCUS' : 'ATTACH');
</script>

{#if session}
	<section class="ses-detail" aria-label={`Session detail ${session.id}`}>
		<header class="detail-head">
			<span class={`dot dot--${session.state}`} aria-hidden="true"></span>
			<span class="detail-id">{session.id}</span>
			<span class="detail-state">{session.state}</span>
			{#if session.att}
				<Tag type="cyan" size="sm">ATTACHED</Tag>
			{/if}
			<span class="detail-fill" aria-hidden="true"></span>
			<button
				type="button"
				class="btn primary"
				onclick={() => onAttach?.(session.id)}
				disabled={isDead}
			>
				{focusLabel}
			</button>
		</header>

		<div class="detail-cmd">{session.cmd}</div>
		<div class="detail-preview">{session.preview}</div>

		<div class="detail-grid">
			<div class="metric">
				<dt>CPU</dt>
				<dd>{session.cpu}%</dd>
			</div>
			<div class="metric">
				<dt>MEM</dt>
				<dd>{session.mem}M</dd>
			</div>
			<div class="metric">
				<dt>WINDOWS</dt>
				<dd>{session.windows}</dd>
			</div>
			<div class="metric">
				<dt>PANES</dt>
				<dd>{session.panes}</dd>
			</div>
		</div>

		<div class="detail-list">
			<StructuredList {columns} {rows} />
		</div>

		<div class="detail-actions" role="group" aria-label="Session actions">
			<button
				type="button"
				class="btn ghost"
				onclick={() => onDetach?.(session.id)}
				disabled={isDead || !session.att}>DETACH</button
			>
			<button
				type="button"
				class="btn ghost"
				onclick={() => onRename?.(session.id)}
				disabled={isDead}>RENAME</button
			>
			<button
				type="button"
				class="btn danger"
				onclick={() => onKill?.(session.id)}
				disabled={isDead}>KILL</button
			>
		</div>
	</section>
{:else}
	<div class="empty">No session selected.</div>
{/if}

<style>
	.ses-detail {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		background: var(--mk2-bg);
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
		height: 100%;
		overflow: auto;
	}

	.detail-head {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.dot {
		width: 9px;
		height: 9px;
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

	.detail-id {
		font-size: var(--mk2-fs-3);
		letter-spacing: 0.04em;
	}

	.detail-state {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.detail-fill {
		flex: 1;
	}

	.detail-cmd {
		font-size: var(--mk2-fs-2);
		color: var(--mk2-ink-2);
	}

	.detail-preview {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		padding: 8px 0;
		border-top: 1px solid var(--mk2-line);
		border-bottom: 1px solid var(--mk2-line);
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.metric dt {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0;
	}

	.metric dd {
		font-size: var(--mk2-fs-3);
		color: var(--mk2-ink);
		margin: 0;
	}

	.detail-list :global(.bx--structured-list) {
		margin: 0;
	}

	.detail-actions {
		display: flex;
		gap: 6px;
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
		background: var(--mk2-accent);
		color: var(--mk2-bg);
		border-color: var(--mk2-accent);
	}

	.btn.ghost {
		color: var(--mk2-ink-3);
	}

	.btn.danger {
		color: var(--mk2-red);
		border-color: var(--mk2-red);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.empty {
		padding: 20px;
		color: var(--mk2-ink-4);
		font-family: var(--mk2-f-mono);
		font-size: var(--mk2-fs-2);
	}
</style>
