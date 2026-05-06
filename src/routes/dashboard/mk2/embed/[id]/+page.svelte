<script lang="ts">
	import { page } from '$app/state';
	import { mk2ToolsCatalog } from '$lib/data/mk2-tools-catalog';

	const id = $derived(page.params.id);
	const tool = $derived(mk2ToolsCatalog.find((t) => t.id === id) ?? null);
	const externalUrl = $derived(tool && tool.action.kind === 'external' ? tool.action.url : null);
</script>

<svelte:head>
	<title>{tool?.name ?? 'External tool'} — Argos</title>
</svelte:head>

{#if tool && externalUrl}
	<section class="embed-screen" aria-label={`${tool.name} embedded view`}>
		<header class="embed-head">
			<div class="embed-title">
				<span class="embed-tag">EXT-{tool.pillar}</span>
				<span class="embed-name">{tool.name}</span>
			</div>
			<div class="embed-actions">
				{#if tool.docsUrl}
					<a
						class="ext-btn docs"
						href={tool.docsUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						OFFICIAL DOCS ↗
					</a>
				{/if}
				<a class="ext-btn" href={externalUrl} target="_blank" rel="noopener noreferrer">
					OPEN IN NEW TAB ↗
				</a>
			</div>
		</header>
		<iframe
			src={externalUrl}
			title={`${tool.name} embedded`}
			loading="eager"
			referrerpolicy="no-referrer"
			allow="fullscreen; clipboard-read; clipboard-write"
		></iframe>
	</section>
{:else}
	<section class="embed-screen empty">
		<p>Unknown or non-external tool: <code>{id}</code></p>
	</section>
{/if}

<style>
	.embed-screen {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
		background: var(--mk2-bg);
	}

	.embed-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 14px;
		background: var(--mk2-bg-2);
		border-bottom: 1px solid var(--mk2-line);
		min-height: 40px;
	}

	.embed-title {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	.embed-tag {
		font-size: 10px;
		color: var(--mk2-accent);
		letter-spacing: 0.12em;
	}

	.embed-name {
		font-size: 13px;
		letter-spacing: 0.1em;
	}

	.embed-actions {
		display: flex;
		gap: 8px;
	}

	.ext-btn {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		font-family: var(--mk2-f-mono);
		font-size: 11px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--mk2-ink-2);
		background: transparent;
		border: 1px solid var(--mk2-line-2);
		text-decoration: none;
	}

	.ext-btn:hover {
		color: var(--mk2-ink);
		border-color: var(--mk2-accent);
	}

	.ext-btn.docs {
		background: var(--mk2-amber, #d4a054);
		color: #1a1a1a;
		border-color: var(--mk2-amber, #d4a054);
		font-weight: 500;
	}

	iframe {
		flex: 1;
		min-height: 0;
		border: 0;
		width: 100%;
		background: var(--mk2-bg);
	}

	.empty {
		padding: 32px;
		color: var(--mk2-ink-4);
	}
</style>
