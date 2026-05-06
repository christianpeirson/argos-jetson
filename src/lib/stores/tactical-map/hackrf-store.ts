import { type Writable, writable } from 'svelte/store';

import type { LeafletMarker } from '$lib/types/map';

interface SimplifiedSignal {
	id: string;
	frequency: number;
	power: number;
	lat: number;
	lon: number;
	timestamp: number;
	count: number;
}

interface HackRFState {
	isSearching: boolean;
	connectionStatus: 'Connected' | 'Disconnected';
	/** Active frequency in MHz. SSE data arrives in Hz and is converted by HackRFDataService. */
	targetFrequency: number;
	signalCount: number;
	currentSignal: SimplifiedSignal | null;
	signals: Map<string, SimplifiedSignal>;
	signalMarkers: Map<string, LeafletMarker>;
}

const initialHackRFState: HackRFState = {
	isSearching: false,
	connectionStatus: 'Disconnected',
	targetFrequency: 2437, // Default WiFi channel 6
	signalCount: 0,
	currentSignal: null,
	signals: new Map(),
	signalMarkers: new Map()
};

const hackrfStore: Writable<HackRFState> = writable(initialHackRFState);

// Helper functions to update store
export const setConnectionStatus = (status: 'Connected' | 'Disconnected') => {
	hackrfStore.update((state) => ({ ...state, connectionStatus: status }));
};

export const setTargetFrequency = (frequency: number) => {
	hackrfStore.update((state) => ({ ...state, targetFrequency: frequency }));
};
