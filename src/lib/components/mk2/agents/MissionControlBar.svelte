<script lang="ts">
	import type { TmuxSession } from '$lib/types/agents';

	interface Props {
		sessions: readonly TmuxSession[];
		onNew?: () => void;
		onRefresh?: () => void;
		onAttachAll?: () => void;
		onExport?: () => void;
	}

	const { sessions, onNew, onRefresh, onAttachAll, onExport }: Props = $props();

	const live = $derived(sessions.filter((s) => s.state === 'active').length);
	const attached = $derived(sessions.filter((s) => s.att).length);
	const dead = $derived(sessions.filter((s) => s.state === 'dead').length);
	const totalCpu = $derived(sessions.reduce((sum, s) => sum + s.cpu, 0));
	const totalMemGb = $derived((sessions.reduce((sum, s) => sum + s.mem, 0) / 1024).toFixed(1));
</script>

<header class="mc-bar" aria-label="Mission Control">
	<div class="mc-title">
		<span class="mc-tag">CTL-01</span>
		<span class="mc-name">MISSION CONTROL</span>
		<span class="mc-meta">{sessions.length} SESSIONS · {live} LIVE</span>
	</div>

	<div class="mc-actions" role="group" aria-label="Mission control actions">
		<button type="button" class="btn primary" onclick={onNew}>+ NEW SESSION</button>
		<button type="button" class="btn" onclick={onRefresh}>REFRESH</button>
		<button type="button" class="btn ghost" onclick={onAttachAll}>ATTACH ALL</button>
		<button type="button" class="btn ghost" onclick={onExport}>EXPORT</button>
	</div>

	<div class="mc-divider" aria-hidden="true"></div>

	<dl class="mc-metrics" aria-label="Session totals">
		<div class="mc-metric mc-metric--accent">
			<dt>LIVE</dt>
			<dd>{live}</dd>
		</div>
		<div class="mc-metric">
			<dt>ATTACHED</dt>
			<dd>{attached}</dd>
		</div>
		<div class="mc-metric">
			<dt>CPU TOTAL</dt>
			<dd>{totalCpu}%</dd>
		</div>
		<div class="mc-metric">
			<dt>MEM TOTAL</dt>
			<dd>{totalMemGb} GB</dd>
		</div>
		<div class="mc-metric">
			<dt>DEAD</dt>
			<dd>{dead}</dd>
		</div>
	</dl>
</header>

<style>
	.mc-bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		padding: 8px 12px;
		background: var(--mk2-bg-2);
		border: 1px solid var(--mk2-line);
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
	}

	.mc-title {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.mc-tag {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-accent);
		letter-spacing: 0.12em;
	}

	.mc-name {
		font-size: var(--mk2-fs-3);
		letter-spacing: 0.1em;
		color: var(--mk2-ink);
	}

	.mc-meta {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.06em;
	}

	.mc-actions {
		display: flex;
		gap: 6px;
	}

	.mc-actions .btn {
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

	.mc-actions .btn:hover {
		border-color: var(--mk2-accent);
	}

	.mc-actions .btn.primary {
		background: var(--mk2-accent);
		color: var(--mk2-bg);
		border-color: var(--mk2-accent);
	}

	.mc-actions .btn.ghost {
		color: var(--mk2-ink-3);
	}

	.mc-divider {
		height: 20px;
		width: 1px;
		background: var(--mk2-line-2);
	}

	.mc-metrics {
		display: flex;
		gap: 16px;
		margin: 0;
	}

	.mc-metric {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 60px;
	}

	.mc-metric dt {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin: 0;
	}

	.mc-metric dd {
		font-size: var(--mk2-fs-3);
		color: var(--mk2-ink);
		letter-spacing: 0.02em;
		margin: 0;
	}

	.mc-metric--accent dd {
		color: var(--mk2-accent);
	}
</style>
