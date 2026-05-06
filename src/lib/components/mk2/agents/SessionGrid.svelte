<script lang="ts">
	import type { TmuxSession } from '$lib/types/agents';

	import SessionCard from './SessionCard.svelte';

	interface Props {
		sessions: readonly TmuxSession[];
		selectedId?: string | null;
		onOpen?: (id: string) => void;
		onNew?: () => void;
	}

	const { sessions, selectedId = null, onOpen, onNew }: Props = $props();
</script>

<div class="ses-grid">
	{#each sessions as session (session.id)}
		<SessionCard {session} selected={selectedId === session.id} {onOpen} />
	{/each}

	<button type="button" class="ses-new" onclick={onNew}>
		<span class="plus" aria-hidden="true">+</span>
		<span>NEW SESSION</span>
	</button>
</div>

<style>
	.ses-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 8px;
		padding: 12px;
	}

	.ses-new {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 8px;
		padding: 16px;
		background: transparent;
		border: 1px dashed var(--mk2-line-2);
		color: var(--mk2-ink-3);
		font-family: var(--mk2-f-mono);
		font-size: var(--mk2-fs-2);
		letter-spacing: 0.1em;
		cursor: pointer;
		text-transform: uppercase;
		min-height: 140px;
	}

	.ses-new:hover {
		border-color: var(--mk2-accent);
		color: var(--mk2-accent);
	}

	.plus {
		font-size: 20px;
		font-weight: 300;
	}
</style>
