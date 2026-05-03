<script lang="ts" module>
	export type PanelStatusState = 'loading' | 'error' | 'empty' | 'disconnected' | 'disabled';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		state: PanelStatusState;
		title: string;
		detail?: string;
		icon?: Snippet;
		onRetry?: () => void;
		retryLabel?: string;
		action?: Snippet;
		class?: string;
	}

	let {
		state,
		title,
		detail,
		icon,
		onRetry,
		retryLabel = 'RETRY',
		action,
		class: className
	}: Props = $props();

	const showRetryButton = $derived(
		!action && (state === 'error' || state === 'disconnected') && onRetry !== undefined
	);
</script>

<div
	class="panel-status panel-status--{state} {className ?? ''}"
	role="status"
	aria-live="polite"
	aria-busy={state === 'loading'}
>
	{#if icon}
		<div class="panel-status__icon" aria-hidden="true">
			{@render icon()}
		</div>
	{:else if state === 'loading'}
		<div class="panel-status__spinner" aria-hidden="true"></div>
	{/if}

	<p class="panel-status__title">{title}</p>

	{#if detail}
		<p class="panel-status__detail">{detail}</p>
	{/if}

	{#if action}
		<div class="panel-status__action">{@render action()}</div>
	{:else if showRetryButton}
		<button type="button" class="panel-status__retry" onclick={onRetry}>
			{retryLabel}
		</button>
	{/if}
</div>

<style>
	.panel-status {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px 16px;
		min-height: 120px;
		text-align: center;
		font-family:
			'Geist',
			system-ui,
			-apple-system,
			sans-serif;
	}

	.panel-status__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		color: var(--muted-foreground);
	}

	.panel-status__spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border);
		border-top-color: var(--muted-foreground);
		border-radius: 50%;
		animation: panel-status-spin 1s linear infinite;
	}

	@keyframes panel-status-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.panel-status__title {
		margin: 0;
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.2px;
		color: var(--foreground-muted, var(--foreground));
	}

	.panel-status--error .panel-status__title,
	.panel-status--disconnected .panel-status__title {
		color: var(--destructive, #ff5c33);
	}

	.panel-status--disabled .panel-status__title {
		color: var(--muted-foreground);
	}

	.panel-status__detail {
		margin: 0;
		max-width: 32ch;
		font-size: 11px;
		line-height: 1.45;
		color: var(--muted-foreground);
	}

	.panel-status__action {
		margin-top: 4px;
	}

	.panel-status__retry {
		margin-top: 4px;
		padding: 6px 16px;
		background: transparent;
		border: 1px solid var(--border);
		color: var(--foreground);
		font-family:
			'Geist',
			system-ui,
			-apple-system,
			sans-serif;
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background 0.1s;
	}

	.panel-status__retry:hover {
		background: var(--border);
	}

	.panel-status__retry:focus-visible {
		outline: 1px solid var(--ring, var(--foreground));
		outline-offset: 1px;
	}

	@media (prefers-reduced-motion: reduce) {
		.panel-status__spinner {
			animation: none;
		}
	}
</style>
