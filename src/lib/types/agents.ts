/**
 * AGENTS Mission Control — type definitions for tmux session + workflow data.
 *
 * Spec-026 phase 9.3 — UI v2 design parity. Mirrors the SESSIONS / WORKFLOWS
 * data shapes from `docs/UI/Argos (1).zip` `screen-agents.jsx`.
 */

export const SESSION_STATES = ['active', 'idle', 'paused', 'dead'] as const;
export type SessionState = (typeof SESSION_STATES)[number];

export interface TmuxSession {
	id: string;
	cmd: string;
	windows: number;
	panes: number;
	cpu: number;
	mem: number;
	att: boolean;
	last: string;
	state: SessionState;
	tags: readonly string[];
	preview: string;
}

export const WORKFLOW_CATEGORIES = [
	'RECON',
	'GSM/SDR',
	'BLUE-TEAM',
	'POST-OPS',
	'CUSTOM',
	'ARCHIVED'
] as const;
export type WorkflowCategory = (typeof WORKFLOW_CATEGORIES)[number];

export interface Workflow {
	cat: WorkflowCategory;
	name: string;
	desc: string;
	steps: number;
	last: string;
	hot?: boolean;
}

export const SESSION_FILTERS = ['ALL', 'ACTIVE', 'IDLE', 'DEAD'] as const;
export type SessionFilter = (typeof SESSION_FILTERS)[number];

export const SESSION_VIEW_MODES = ['grid', 'list', 'split'] as const;
export type SessionViewMode = (typeof SESSION_VIEW_MODES)[number];

export type SessionAction = 'attach' | 'detach' | 'kill' | 'rename';

export interface SessionActionRequest {
	action: SessionAction;
	name?: string;
}

export function filterSessions(
	sessions: readonly TmuxSession[],
	filter: SessionFilter
): TmuxSession[] {
	if (filter === 'ALL') return [...sessions];
	if (filter === 'ACTIVE') return sessions.filter((s) => s.state === 'active');
	if (filter === 'IDLE')
		return sessions.filter((s) => s.state === 'idle' || s.state === 'paused');
	return sessions.filter((s) => s.state === 'dead');
}
