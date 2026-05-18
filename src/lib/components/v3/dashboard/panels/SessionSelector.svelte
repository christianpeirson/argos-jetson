<!--
	Session selector dropdown for the RF visualization. Fetches the
	list of known capture sessions from /api/sessions and lets the
	operator scope all RF layers (heatmap / drive path / centroids)
	to a single session. "All sessions" = null filter (server returns
	union across the whole `signals` table).

	Three visible states: Loading (in-flight fetch), Error (failed
	fetch with Retry), Ready (dropdown). Empty list is covered by
	the always-present "All sessions" option in Ready state.
-->
<script lang="ts">
	import { SelectItem } from 'carbon-components-svelte';

	import InlineNotification from '$lib/components/chassis/forms/InlineNotification.svelte';
	import Select from '$lib/components/chassis/forms/Select.svelte';
	import { rfVisualization } from '$lib/stores/rf-visualization.svelte';

	// Load sessions once on mount. Guard with sessionsLoading + sessionsLoadFailed
	// so the effect can't retry on its own — a transient network failure leaves
	// sessionsLoaded=false, which without a failure flag would let any future
	// dep change trigger another fetch. One shot per mount.
	$effect(() => {
		if (
			!rfVisualization.sessionsLoaded &&
			!rfVisualization.sessionsLoading &&
			!rfVisualization.sessionsLoadFailed
		) {
			void rfVisualization.loadSessions();
		}
	});

	function labelFor(s: { label: string | null; startedAt: number; id: string }): string {
		if (s.label) return s.label;
		if (s.startedAt === 0) return `legacy (pre-session data)`;
		return new Date(s.startedAt).toISOString().replace('T', ' ').slice(0, 16);
	}

	function handleChange(value: string | number | undefined): void {
		const v = value === undefined ? '' : String(value);
		void rfVisualization.setSession(v === '' ? null : v);
	}

	function retryLoad(): void {
		void rfVisualization.loadSessions();
	}
</script>

<div class="session-selector">
	<div class="session-label-row">
		<label class="session-label" for="rf-session-select">SESSION</label>
		{#if rfVisualization.isLive}
			<span class="live-chip" title="Live SSE stream open">● LIVE</span>
		{/if}
	</div>
	{#if rfVisualization.sessionsLoading}
		<div class="session-status">Loading sessions…</div>
	{:else if rfVisualization.sessionsLoadFailed}
		<InlineNotification
			kind="error"
			title="Failed to load sessions"
			subtitle={rfVisualization.error ?? ''}
			hideCloseButton
			lowContrast
		/>
		<button type="button" class="session-retry" onclick={retryLoad}>Retry</button>
	{:else if rfVisualization.sessionsList.length === 0}
		<div class="session-status">
			No capture sessions yet. Start a Kismet scan to create one.
		</div>
	{:else}
		<Select
			id="rf-session-select"
			noLabel
			value={rfVisualization.activeSessionId ?? ''}
			onChange={handleChange}
			size="sm"
		>
			<SelectItem value="" text="All sessions" />
			{#each rfVisualization.sessionsList as session (session.id)}
				<SelectItem value={session.id} text={labelFor(session)} />
			{/each}
		</Select>
	{/if}
</div>

<style>
	.session-selector {
		display: flex;
		flex-direction: column;
		gap: 0.35em;
		padding: 0.5em 0.75em;
	}
	.session-label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5em;
	}
	.session-label {
		font-size: 0.68em;
		letter-spacing: 0.08em;
		color: var(--muted-foreground);
	}
	.live-chip {
		font-family: 'Fira Code', ui-monospace, monospace;
		font-size: 0.62em;
		letter-spacing: 0.12em;
		color: var(--success);
		padding: 0.08em 0.4em;
		border: 1px solid var(--success);
		border-radius: 3px;
	}
	.session-status {
		font-size: 0.78em;
		padding: 0.35em 0.5em;
		color: var(--muted-foreground);
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 4px;
	}
	.session-retry {
		flex: 0 0 auto;
		background: transparent;
		color: inherit;
		border: 1px solid currentcolor;
		border-radius: 3px;
		padding: 0.15em 0.55em;
		font-family: inherit;
		font-size: 0.78em;
		cursor: pointer;
	}
	.session-retry:hover {
		background: var(--destructive);
		color: var(--destructive-foreground);
	}
</style>
