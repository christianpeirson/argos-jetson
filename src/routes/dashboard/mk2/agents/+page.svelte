<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import DockShell, { type DockMode } from '$lib/components/chassis/DockShell.svelte';
	import MissionControlBar from '$lib/components/mk2/agents/MissionControlBar.svelte';
	import SessionDetailPanel from '$lib/components/mk2/agents/SessionDetailPanel.svelte';
	import SessionFilterTabs from '$lib/components/mk2/agents/SessionFilterTabs.svelte';
	import SessionGrid from '$lib/components/mk2/agents/SessionGrid.svelte';
	import SessionViewToggle from '$lib/components/mk2/agents/SessionViewToggle.svelte';
	import WorkflowsPanel from '$lib/components/mk2/agents/WorkflowsPanel.svelte';
	import {
		type TmuxSessionsState,
		tmuxSessionsStore
	} from '$lib/stores/dashboard/tmux-sessions-store';
	import { type WorkflowsState, workflowsStore } from '$lib/stores/dashboard/workflows-store';
	import { filterSessions, type SessionFilter, type SessionViewMode } from '$lib/types/agents';

	let filter = $state<SessionFilter>('ALL');
	let viewMode = $state<SessionViewMode>('grid');
	let dock = $state<DockMode>('right');
	let selectedId = $state<string | null>(null);

	let sessions = $state<TmuxSessionsState>({
		sessions: [],
		loading: false,
		error: null,
		source: 'mock'
	});
	let workflows = $state<WorkflowsState>({
		workflows: [],
		loading: false,
		error: null,
		source: 'mock'
	});

	const unsubSessions = tmuxSessionsStore.subscribe((s) => (sessions = s));
	const unsubWorkflows = workflowsStore.subscribe((s) => (workflows = s));

	onMount(() => {
		tmuxSessionsStore.startPolling(5000);
	});

	onDestroy(() => {
		tmuxSessionsStore.stopPolling();
		unsubSessions();
		unsubWorkflows();
	});

	const visibleSessions = $derived(filterSessions(sessions.sessions, filter));
	const selectedSession = $derived(
		selectedId ? (sessions.sessions.find((s) => s.id === selectedId) ?? null) : null
	);

	function handleOpen(id: string): void {
		selectedId = id;
	}
</script>

<div class="agents-page">
	<MissionControlBar sessions={sessions.sessions} onRefresh={() => tmuxSessionsStore.refresh()} />

	<div class="agents-toolbar">
		<SessionFilterTabs value={filter} onChange={(next) => (filter = next)} />
		<SessionViewToggle value={viewMode} onChange={(next) => (viewMode = next)} />
	</div>

	<div class="agents-body">
		<DockShell {dock} primaryLabel="TMUX session grid" secondaryLabel="Workflows panel">
			{#snippet primary()}
				<div class="primary-pane">
					{#if viewMode === 'grid'}
						<SessionGrid sessions={visibleSessions} {selectedId} onOpen={handleOpen} />
					{:else if viewMode === 'list'}
						<div class="placeholder">List view ships in 9.3 follow-up</div>
					{:else}
						<div class="split-view">
							<div class="split-list">
								<SessionGrid
									sessions={visibleSessions}
									{selectedId}
									onOpen={handleOpen}
								/>
							</div>
							<div class="split-detail">
								<SessionDetailPanel
									session={selectedSession}
									onAttach={handleOpen}
								/>
							</div>
						</div>
					{/if}
				</div>
			{/snippet}
			{#snippet secondary()}
				<WorkflowsPanel
					workflows={workflows.workflows}
					{dock}
					onDock={(next) => (dock = next)}
				/>
			{/snippet}
		</DockShell>
	</div>
</div>

<style>
	.agents-page {
		display: flex;
		flex-direction: column;
		gap: 8px;
		height: 100%;
		padding: 8px;
		font-family: var(--mk2-f-mono);
	}

	.agents-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.agents-body {
		flex: 1;
		min-height: 0;
		border: 1px solid var(--mk2-line);
	}

	.primary-pane {
		height: 100%;
		overflow: auto;
		background: var(--mk2-bg);
	}

	.placeholder {
		padding: 20px;
		color: var(--mk2-ink-4);
	}

	.split-view {
		display: grid;
		grid-template-columns: 1fr 1fr;
		height: 100%;
	}

	.split-list,
	.split-detail {
		min-width: 0;
		overflow: auto;
	}

	.split-detail {
		border-left: 1px solid var(--mk2-line);
	}
</style>
