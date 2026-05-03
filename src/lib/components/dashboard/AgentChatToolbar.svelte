<!-- Agent chat toolbar — status badge and clear button -->
<script lang="ts">
	import { Trash2 } from '@lucide/svelte';

	import TooltipIcon from '$lib/components/chassis/forms/TooltipIcon.svelte';

	interface Props {
		llmProvider: 'anthropic' | 'unavailable';
		isCheckingLLM: boolean;
		onClear: () => void;
	}

	let { llmProvider, isCheckingLLM, onClear }: Props = $props();
</script>

<div class="chat-toolbar">
	<div class="toolbar-left">
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="agent-icon"
		>
			<path d="M12 2L2 7l10 5 10-5-10-5z" />
			<path d="M2 17l10 5 10-5" />
			<path d="M2 12l10 5 10-5" />
		</svg>
		<span class="toolbar-title">Argos Agent</span>
		{#if !isCheckingLLM}
			<span class="llm-badge" class:online={llmProvider !== 'unavailable'}>
				{llmProvider === 'anthropic' ? 'Claude' : 'Offline'}
			</span>
		{/if}
	</div>
	<div class="toolbar-right">
		<TooltipIcon tooltipText="Clear chat" icon={Trash2} onClick={onClear} />
	</div>
</div>

<style>
	.chat-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 36px;
		min-height: 36px;
		padding: 0 12px;
		background: var(--card);
		border-bottom: 1px solid var(--border);
	}

	.toolbar-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.agent-icon {
		color: var(--interactive, #4a8af4);
	}

	.toolbar-title {
		color: var(--foreground);
		font-weight: 500;
	}

	.llm-badge {
		padding: 2px 8px;
		border-radius: 3px;
		background: var(--border);
		color: var(--muted-foreground);
		font-size: 11px;
		text-transform: uppercase;
	}

	.llm-badge.online {
		background: color-mix(in srgb, var(--success) 20%, transparent);
		color: var(--success);
	}

	.toolbar-right {
		display: flex;
		gap: 4px;
	}
</style>
