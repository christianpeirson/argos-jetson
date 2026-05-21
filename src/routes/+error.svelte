<!--
  Root error boundary (ARGOS-5). Before this, v1 routes had no +error.svelte, so
  a thrown load error or an uncaught render error left a blank screen. Renders the
  status + message and offers recovery (reload / back to dashboard).
-->
<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="error-page" role="alert">
	<p class="error-status">{page.status}</p>
	<h1 class="error-title">Something went wrong</h1>
	<p class="error-message">
		{page.error?.message ?? 'An unexpected error occurred while loading this view.'}
	</p>
	<div class="error-actions">
		<button class="error-btn" onclick={() => location.reload()}>Reload</button>
		<a class="error-link" href="/dashboard">Back to dashboard</a>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 100vh;
		padding: 24px;
		text-align: center;
		font-family: var(--font-mono, 'Fira Code', monospace);
		background: var(--background, #0a0a0a);
		color: var(--foreground, #e0e0e0);
	}

	.error-status {
		font-size: 48px;
		font-weight: 700;
		margin: 0;
		color: var(--muted-foreground, #888);
	}

	.error-title {
		font-size: 16px;
		font-weight: 600;
		letter-spacing: 1px;
		margin: 0;
	}

	.error-message {
		font-size: 12px;
		color: var(--muted-foreground, #888);
		max-width: 480px;
		margin: 0 0 12px;
	}

	.error-actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.error-btn {
		background: var(--primary, #4a90d9);
		color: #fff;
		border: none;
		padding: 6px 16px;
		font-family: inherit;
		font-size: 12px;
		cursor: pointer;
	}

	.error-btn:focus-visible {
		outline: 2px solid var(--foreground, #fff);
		outline-offset: 2px;
	}

	.error-link {
		color: var(--muted-foreground, #888);
		font-size: 12px;
	}
</style>
