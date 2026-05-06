<script lang="ts">
	import { Accordion, AccordionItem, ContentSwitcher, Switch } from 'carbon-components-svelte';

	import Tag from '$lib/components/chassis/forms/Tag.svelte';
	import {
		buildToolIndex,
		type CatalogTool,
		countTools,
		type ToolPillarName,
		type ToolsCatalog,
		toolsCatalog
	} from '$lib/data/tools-catalog';

	interface Props {
		open: boolean;
		catalog?: ToolsCatalog;
		onClose: () => void;
		onSelect?: (tool: CatalogTool) => void;
	}

	const { open, catalog = toolsCatalog, onClose, onSelect }: Props = $props();

	const PILLAR_ORDER: ToolPillarName[] = ['OFFNET', 'ONNET', 'OSINT'];
	let selectedPillarIndex = $state(0);
	let query = $state('');

	const counts = $derived(countTools(catalog));
	const index = $derived(buildToolIndex(catalog));

	const activePillar = $derived(catalog.root[selectedPillarIndex] ?? catalog.root[0]);

	const filteredEntries = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (q === '') return [];
		return Array.from(index.values()).filter(
			(e) =>
				e.tool.name.toLowerCase().includes(q) ||
				(e.tool.desc?.toLowerCase().includes(q) ?? false)
		);
	});

	function onSwitcherChange(e: CustomEvent<number>): void {
		selectedPillarIndex = e.detail;
	}

	function pickTool(tool: CatalogTool): void {
		onSelect?.(tool);
	}
</script>

{#if open}
	<div class="th-flyout" role="dialog" aria-modal="true" aria-label="Tools catalog">
		<header class="th-head">
			<div class="th-title">
				<span class="th-tag">TLS-09</span>
				<span class="th-name">TOOLS</span>
				<span class="th-meta">
					{counts.installed}/{counts.total} INSTALLED
				</span>
			</div>
			<input
				type="search"
				class="th-search"
				placeholder="Search tools…"
				bind:value={query}
				aria-label="Search tools"
			/>
			<button
				type="button"
				class="th-close"
				onclick={onClose}
				aria-label="Close tools catalog"
			>
				×
			</button>
		</header>

		{#if query.trim() === ''}
			<div class="th-pillars">
				<ContentSwitcher selectedIndex={selectedPillarIndex} on:change={onSwitcherChange}>
					{#each PILLAR_ORDER as p (p)}
						<Switch text={p} />
					{/each}
				</ContentSwitcher>
			</div>

			<p class="th-pillar-desc">{activePillar.desc}</p>

			<div class="th-body">
				<Accordion size="sm" align="start">
					{#each activePillar.children as cat (cat.id)}
						<AccordionItem title={cat.name} open>
							{#each cat.children as sub (sub.id)}
								<div class="th-sub">
									<header class="th-sub-head">{sub.name}</header>
									<ul class="th-sub-list" role="list">
										{#each sub.children as item (item.id)}
											{#if 'group' in item && item.group}
												<li class="th-group">
													<header class="th-group-head">
														{item.name}
													</header>
													<ul class="th-group-list" role="list">
														{#each item.children as tool (tool.id)}
															{@render toolRow(tool)}
														{/each}
													</ul>
												</li>
											{:else}
												{@render toolRow(item as CatalogTool)}
											{/if}
										{/each}
									</ul>
								</div>
							{/each}
						</AccordionItem>
					{/each}
				</Accordion>
			</div>
		{:else}
			<div class="th-search-results">
				<p class="th-search-meta">{filteredEntries.length} matches</p>
				<ul class="th-sub-list" role="list">
					{#each filteredEntries as entry (entry.tool.id)}
						<li class="th-tool">
							<button
								type="button"
								class="th-tool-row"
								onclick={() => pickTool(entry.tool)}
							>
								<div class="th-tool-info">
									<div class="th-tool-name">{entry.tool.name}</div>
									{#if entry.tool.desc}
										<div class="th-tool-desc">{entry.tool.desc}</div>
									{/if}
									<div class="th-tool-path">
										{entry.pillar} › {entry.categoryId} › {entry.subcategoryId}
									</div>
								</div>
								<div class="th-tool-tags">
									{#if entry.tool.installed}
										<Tag type="green" size="sm">INSTALLED</Tag>
									{:else}
										<Tag type="cool-gray" size="sm">NOT INSTALLED</Tag>
									{/if}
									{#if entry.tool.view}
										<Tag type="blue" size="sm">VIEW</Tag>
									{/if}
								</div>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}

{#snippet toolRow(tool: CatalogTool)}
	<li class="th-tool">
		<button type="button" class="th-tool-row" onclick={() => pickTool(tool)}>
			<div class="th-tool-info">
				<div class="th-tool-name">{tool.name}</div>
				{#if tool.desc}
					<div class="th-tool-desc">{tool.desc}</div>
				{/if}
			</div>
			<div class="th-tool-tags">
				{#if tool.installed}
					<Tag type="green" size="sm">INSTALLED</Tag>
				{:else}
					<Tag type="cool-gray" size="sm">NOT INSTALLED</Tag>
				{/if}
				{#if tool.view}
					<Tag type="blue" size="sm">VIEW</Tag>
				{/if}
			</div>
		</button>
	</li>
{/snippet}

<style>
	.th-flyout {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		background: var(--mk2-bg);
		border: 1px solid var(--mk2-line);
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
		z-index: 100;
		padding: 12px;
		gap: 12px;
		overflow: hidden;
	}

	.th-head {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.th-title {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.th-tag {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-accent);
		letter-spacing: 0.12em;
	}

	.th-name {
		font-size: var(--mk2-fs-3);
		letter-spacing: 0.1em;
	}

	.th-meta {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.06em;
	}

	.th-search {
		flex: 1;
		max-width: 360px;
		background: var(--mk2-bg-2);
		color: var(--mk2-ink);
		border: 1px solid var(--mk2-line-2);
		font-family: var(--mk2-f-mono);
		font-size: var(--mk2-fs-2);
		padding: 4px 8px;
	}

	.th-close {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		background: transparent;
		color: var(--mk2-ink-3);
		border: 1px solid var(--mk2-line-2);
		cursor: pointer;
		font-size: 16px;
	}

	.th-pillar-desc {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		margin: 0;
		letter-spacing: 0.04em;
	}

	.th-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
	}

	.th-sub {
		padding: 6px 0;
		border-bottom: 1px solid var(--mk2-line);
	}

	.th-sub-head {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-accent);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 4px 0;
	}

	.th-sub-list,
	.th-group-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.th-group {
		padding: 4px 0 4px 12px;
		border-left: 1px solid var(--mk2-line-2);
		margin-left: 4px;
	}

	.th-group-head {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.08em;
		padding: 2px 0;
	}

	.th-tool-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 6px 8px;
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--mk2-line);
		text-align: left;
		cursor: pointer;
		color: var(--mk2-ink);
		font-family: var(--mk2-f-mono);
	}

	.th-tool-row:hover {
		background: var(--mk2-bg-2);
	}

	.th-tool-info {
		flex: 1;
		min-width: 0;
	}

	.th-tool-name {
		font-size: var(--mk2-fs-2);
		color: var(--mk2-ink);
		letter-spacing: 0.02em;
	}

	.th-tool-desc {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		margin-top: 3px;
	}

	.th-tool-path {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-4);
		margin-top: 4px;
		letter-spacing: 0.06em;
	}

	.th-tool-tags {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.th-search-results {
		flex: 1;
		min-height: 0;
		overflow: auto;
	}

	.th-search-meta {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.04em;
		margin: 0 0 8px;
	}
</style>
