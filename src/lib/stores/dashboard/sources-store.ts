/**
 * Sources store — drives OVERVIEW SOURCES panel.
 *
 * Spec-026 phase 9.4. v1 ships with mock data mirroring the design archive's
 * `SOURCES` constant. A future refactor will derive this from real telemetry
 * stores (hackrf / kismet / gsm-evil / tak / ubertooth / gnss) by composing
 * existing per-feed status streams.
 */

import { writable } from 'svelte/store';

import type { SourceStatus } from '$lib/types/overview-sources';

const MOCK_SOURCES: SourceStatus[] = [
	{
		id: 'hackrf',
		name: 'HackRF One',
		state: 'LIVE',
		since: '0:35',
		band: '24–1700 MHz',
		rate: '20 MSps',
		health: 'ok'
	},
	{
		id: 'kismet',
		name: 'Kismet',
		state: 'LIVE',
		since: '0:35',
		band: '2.4 / 5 GHz',
		rate: '214 dev',
		health: 'ok'
	},
	{
		id: 'gsm-evil',
		name: 'GSM-Evil',
		state: 'LIVE',
		since: '0:34',
		band: '900 / 1800',
		rate: '8 imsi/m',
		health: 'ok'
	},
	{
		id: 'tak',
		name: 'TAK Broadcast',
		state: 'LIVE',
		since: '0:33',
		band: 'CoT 8087',
		rate: '14 msg',
		health: 'ok'
	},
	{
		id: 'ubertooth',
		name: 'Ubertooth',
		state: 'IDLE',
		since: '—',
		band: 'BLE 2.4 GHz',
		rate: '—',
		health: 'idle'
	},
	{
		id: 'gnss',
		name: 'GNSS-RTK',
		state: 'DEG',
		since: '0:31',
		band: 'L1 / L2',
		rate: '1 Hz',
		health: 'warn'
	}
];

export interface SourcesState {
	sources: SourceStatus[];
	loading: boolean;
	error: string | null;
	source: 'mock' | 'composite';
}

const initial: SourcesState = {
	sources: MOCK_SOURCES,
	loading: false,
	error: null,
	source: 'mock'
};

const store = writable<SourcesState>(initial);

export const sourcesStore = {
	subscribe: store.subscribe,
	set(sources: SourceStatus[]): void {
		store.set({ sources, loading: false, error: null, source: 'composite' });
	}
};
