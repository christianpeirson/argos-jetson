/**
 * Tmux sessions store — drives AGENTS Mission Control screen.
 *
 * Spec-026 phase 9.3 (UI v2 design parity). v1 ships with mock data shipped
 * from the design archive so the UI can be visually verified end-to-end before
 * the `/api/agent/sessions` backend lands. Set `useMock: false` once the
 * backend is wired.
 */

import { derived, type Readable, writable } from 'svelte/store';

import type { SessionFilter, TmuxSession } from '$lib/types/agents';
import { filterSessions } from '$lib/types/agents';

const MOCK_SESSIONS: TmuxSession[] = [
	{
		id: 'recon-01',
		cmd: 'claude · recon sweep',
		windows: 4,
		panes: 7,
		cpu: 12,
		mem: 184,
		att: true,
		last: '202455Z',
		state: 'active',
		tags: ['recon', 'wlan'],
		preview: '● Running: airodump-ng wlan1mon · 902 beacons · 2 hidden SSIDs flagged'
	},
	{
		id: 'kismet-live',
		cmd: 'kismet_server -c wlan1',
		windows: 2,
		panes: 3,
		cpu: 38,
		mem: 412,
		att: true,
		last: '202455Z',
		state: 'active',
		tags: ['wifi'],
		preview: 'new AP · E8:48:B8:2E:07:AA · kaserne-mesh · WPA3'
	},
	{
		id: 'gsm-harvest',
		cmd: 'grgsm_livemon + imsi-pipe',
		windows: 3,
		panes: 5,
		cpu: 27,
		mem: 298,
		att: false,
		last: '202451Z',
		state: 'active',
		tags: ['gsm', 'hackrf'],
		preview: 'IMSI 460030912349182 · CN · FLAG · ARFCN 62'
	},
	{
		id: 'pcap-rotor',
		cmd: 'tcpdump · rotating ring',
		windows: 1,
		panes: 2,
		cpu: 4,
		mem: 72,
		att: false,
		last: '202450Z',
		state: 'active',
		tags: ['capture'],
		preview: 'ring[04] 412 MB · rotating to ring[05]'
	},
	{
		id: 'bettercap-04',
		cmd: 'bettercap -iface wlan1mon',
		windows: 2,
		panes: 4,
		cpu: 18,
		mem: 156,
		att: false,
		last: '202448Z',
		state: 'active',
		tags: ['mitm'],
		preview: 'arp.spoof module failed · iface busy'
	},
	{
		id: 'tak-bridge',
		cmd: 'pytak · tak-cot-forwarder',
		windows: 1,
		panes: 1,
		cpu: 2,
		mem: 48,
		att: false,
		last: '202447Z',
		state: 'active',
		tags: ['c2'],
		preview: 'CoT forwarded · 42 tracks · uptime 3h 14m'
	},
	{
		id: 'notes',
		cmd: 'nvim engagement-log.md',
		windows: 1,
		panes: 1,
		cpu: 1,
		mem: 32,
		att: false,
		last: '202412Z',
		state: 'idle',
		tags: ['ops'],
		preview: 'idle 4m 43s · buffer clean'
	},
	{
		id: 'trunk-rec',
		cmd: 'trunk-recorder · p25',
		windows: 1,
		panes: 2,
		cpu: 0,
		mem: 118,
		att: false,
		last: '201840Z',
		state: 'paused',
		tags: ['sdr'],
		preview: 'paused · 14 calls in queue · last p25 851.2375 MHz'
	},
	{
		id: 'post-01',
		cmd: 'claude · triage + report',
		windows: 2,
		panes: 3,
		cpu: 0,
		mem: 0,
		att: false,
		last: '201701Z',
		state: 'dead',
		tags: ['post'],
		preview: 'process exited · code 0 · 7m ago'
	}
];

export interface TmuxSessionsState {
	sessions: TmuxSession[];
	loading: boolean;
	error: string | null;
	source: 'mock' | 'api';
}

const initial: TmuxSessionsState = {
	sessions: MOCK_SESSIONS,
	loading: false,
	error: null,
	source: 'mock'
};

const store = writable<TmuxSessionsState>(initial);

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function fetchOnce(): Promise<void> {
	store.update((s) => ({ ...s, loading: true, error: null }));
	try {
		const res = await fetch('/api/agent/sessions');
		if (!res.ok) {
			store.update((s) => ({
				...s,
				loading: false,
				error: `sessions: ${res.status} ${res.statusText}`
			}));
			return;
		}
		const data = (await res.json()) as { sessions: TmuxSession[] };
		store.set({ sessions: data.sessions, loading: false, error: null, source: 'api' });
	} catch (err) {
		store.update((s) => ({
			...s,
			loading: false,
			error: err instanceof Error ? err.message : String(err)
		}));
	}
}

export const tmuxSessionsStore = {
	subscribe: store.subscribe,
	startPolling(intervalMs = 5000): void {
		if (pollTimer != null) return;
		void fetchOnce();
		pollTimer = setInterval(fetchOnce, intervalMs);
	},
	stopPolling(): void {
		if (pollTimer != null) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	},
	refresh: fetchOnce
};

export function filteredSessionsStore(filter: Readable<SessionFilter>): Readable<TmuxSession[]> {
	return derived([store, filter], ([$state, $filter]) =>
		filterSessions($state.sessions, $filter)
	);
}
