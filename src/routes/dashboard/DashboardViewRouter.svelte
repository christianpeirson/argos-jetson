<!--
  Renders the dashboard center region for the active view, via the declarative
  registry in ./dashboard-views.ts. Replaces the ~25-branch {#if $activeView}
  chain previously inlined in +page.svelte.
-->
<script lang="ts">
	import ToolUnavailableView from '$lib/components/dashboard/views/ToolUnavailableView.svelte';
	import ToolViewWrapper from '$lib/components/dashboard/views/ToolViewWrapper.svelte';
	import type { ActiveView } from '$lib/types/dashboard-view';

	import { resolveViewEntry } from './dashboard-views';

	let { activeView, onBackToMap }: { activeView: ActiveView; onBackToMap: () => void } = $props();

	const entry = $derived(resolveViewEntry(activeView));
</script>

{#if entry.kind === 'component'}
	{#await entry.load()}
		<div class="view-loading">Loading…</div>
	{:then { default: View }}
		<View />
	{:catch}
		<div class="view-loading">View failed to load — reload to retry.</div>
	{/await}
{:else if entry.kind === 'iframe'}
	<ToolViewWrapper title={entry.title} onBack={onBackToMap}>
		<iframe src={entry.src} title={entry.title} class="tool-iframe"></iframe>
	</ToolViewWrapper>
{:else}
	<ToolUnavailableView title={entry.title} />
{/if}

<style>
	.view-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-family: var(--font-mono, 'Fira Code', monospace);
		font-size: 12px;
		color: var(--muted-foreground, #888);
	}

	.tool-iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: var(--background);
	}
</style>
