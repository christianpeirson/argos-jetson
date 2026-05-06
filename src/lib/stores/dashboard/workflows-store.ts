/**
 * Workflows store — drives WORKFLOWS panel in AGENTS Mission Control.
 *
 * Spec-026 phase 9.3 (UI v2 design parity). v1 ships with mock data from the
 * design archive. The `runWorkflow()` action is intentionally a no-op pending
 * the workflow-execution semantics decision (open question #1 in the Phase 9
 * plan: tmux send-keys vs. spawn vs. external runner).
 */

import { writable } from 'svelte/store';

import type { Workflow } from '$lib/types/agents';

const MOCK_WORKFLOWS: Workflow[] = [
	{
		cat: 'RECON',
		name: 'recon-full',
		desc: 'survey · harvest · triage',
		steps: 7,
		last: 'ran 12m ago'
	},
	{
		cat: 'RECON',
		name: 'wifi-survey',
		desc: 'kismet + wigle + tak push',
		steps: 4,
		last: 'ran 4h ago'
	},
	{
		cat: 'RECON',
		name: 'bt-sweep',
		desc: 'bluetoothctl · btlejack',
		steps: 3,
		last: 'ran 2d ago'
	},
	{
		cat: 'GSM/SDR',
		name: 'imsi-harvest',
		desc: 'grgsm → pipe → csv',
		steps: 3,
		last: 'running now',
		hot: true
	},
	{
		cat: 'GSM/SDR',
		name: 'p25-trunk',
		desc: 'trunk-recorder · p25',
		steps: 4,
		last: 'ran 1h ago'
	},
	{
		cat: 'BLUE-TEAM',
		name: 'blue-team-check',
		desc: 'self-scan + alert',
		steps: 5,
		last: 'yesterday'
	},
	{
		cat: 'BLUE-TEAM',
		name: 'integrity-audit',
		desc: 'rkhunter + chkrootkit',
		steps: 6,
		last: 'ran 3d ago'
	},
	{
		cat: 'POST-OPS',
		name: 'triage-report',
		desc: 'claude · markdown + tak',
		steps: 4,
		last: 'ran 28m ago'
	},
	{
		cat: 'POST-OPS',
		name: 'artifact-rotate',
		desc: 'pcap → cold storage',
		steps: 2,
		last: 'ran 4h ago'
	},
	{ cat: 'CUSTOM', name: 'custom-playbook', desc: 'user-defined', steps: 0, last: 'never' },
	{
		cat: 'CUSTOM',
		name: 'kaserne-night',
		desc: 'op-specific · 2025-04',
		steps: 9,
		last: 'ran yesterday'
	},
	{ cat: 'ARCHIVED', name: 'legacy-recon-v1', desc: 'deprecated', steps: 5, last: '2024-11-02' },
	{ cat: 'ARCHIVED', name: 'old-gsm-sweep', desc: 'deprecated', steps: 3, last: '2024-09-17' }
];

export interface WorkflowsState {
	workflows: Workflow[];
	loading: boolean;
	error: string | null;
	source: 'mock' | 'api';
}

const initial: WorkflowsState = {
	workflows: MOCK_WORKFLOWS,
	loading: false,
	error: null,
	source: 'mock'
};

const store = writable<WorkflowsState>(initial);

async function fetchOnce(): Promise<void> {
	store.update((s) => ({ ...s, loading: true, error: null }));
	try {
		const res = await fetch('/api/workflows');
		if (!res.ok) {
			store.update((s) => ({
				...s,
				loading: false,
				error: `workflows: ${res.status} ${res.statusText}`
			}));
			return;
		}
		const data = (await res.json()) as { workflows: Workflow[] };
		store.set({ workflows: data.workflows, loading: false, error: null, source: 'api' });
	} catch (err) {
		store.update((s) => ({
			...s,
			loading: false,
			error: err instanceof Error ? err.message : String(err)
		}));
	}
}

export const workflowsStore = {
	subscribe: store.subscribe,
	refresh: fetchOnce
};
