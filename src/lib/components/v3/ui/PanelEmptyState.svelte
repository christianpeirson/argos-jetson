<!--
	PanelEmptyState — Lunaris empty-state primitive.

	Used inside panels/tables when the underlying collection is empty but the
	data source is healthy (not an error, not a loading state). Renders an
	optional icon, a required title, an optional description, and an optional
	action slot (button / link).

	Typography per Lunaris: this is UI chrome, so uses Geist via the design
	system. Colors are CSS var tokens only — no hardcoded hex. Component
	exposes no interactive behavior of its own; it is a presentational shell.

	Props (Svelte 5 runes, $props() with $$Generic-free typing):
		- title: string — bold label, e.g. "No devices detected"
		- description?: string — muted secondary line with corrective action
		- icon?: Snippet — leading icon (render inside a 28px circle slot)
		- action?: Snippet — trailing action area (button, link, etc.)

	Example:
		<PanelEmptyState title="No devices yet" description="Start Kismet to populate this panel.">
			{#snippet icon()}<Radio size={20} />{/snippet}
			{#snippet action()}<button onclick={startKismet}>Start Kismet</button>{/snippet}
		</PanelEmptyState>
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		description?: string;
		icon?: Snippet;
		action?: Snippet;
	};

	const { title, description, icon, action }: Props = $props();
</script>

<div class="panel-empty-state" role="status" aria-live="polite">
	{#if icon}
		<div class="icon-slot" aria-hidden="true">
			{@render icon()}
		</div>
	{/if}
	<p class="title">{title}</p>
	{#if description}
		<p class="description">{description}</p>
	{/if}
	{#if action}
		<div class="action-slot">
			{@render action()}
		</div>
	{/if}
</div>

<style>
	.panel-empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px 16px;
		min-height: 120px;
		color: var(--muted-foreground);
		text-align: center;
		/* Chrome text in Lunaris = Geist. Fall back to system sans-serif so
		   the primitive still renders correctly if Geist fails to load. */
		font-family:
			'Geist',
			system-ui,
			-apple-system,
			sans-serif;
	}

	.icon-slot {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		color: var(--muted-foreground);
	}

	.title {
		margin: 0;
		font-size: 12px;
		font-weight: 500;
		color: var(--foreground-muted, var(--foreground));
		letter-spacing: 0.2px;
	}

	.description {
		margin: 0;
		max-width: 32ch;
		font-size: 11px;
		line-height: 1.45;
		color: var(--muted-foreground);
	}

	.action-slot {
		margin-top: 4px;
	}
</style>
