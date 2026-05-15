import { describe, expect, it, vi } from 'vitest';

import { type PollerState, pollKismetDevices, resetPollerBackoff } from './kismet-poller';

function makeState(): PollerState {
	return {
		deviceCache: new Map(),
		updateThrottles: new Map(),
		lastPollTime: 0,
		isPolling: false,
		statsThrottle: 0,
		consecutiveErrors: 0,
		nextPollAtMs: 0
	};
}

describe('kismet-poller backoff', () => {
	it('skips poll when clientCount is zero (no waste fetch when no subscribers)', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const state = makeState();
		await pollKismetDevices(state, 0, 'http://x', 'k', 500, vi.fn());
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it('skips poll while another poll is in flight (isPolling guard)', async () => {
		const state = makeState();
		state.isPolling = true;
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await pollKismetDevices(state, 1, 'http://x', 'k', 500, vi.fn());
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it('increments consecutiveErrors on fetch failure but does not back off below threshold', async () => {
		const state = makeState();
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockRejectedValue(new Error('connect ECONNREFUSED'));
		const broadcast = vi.fn();
		await pollKismetDevices(state, 1, 'http://x', 'k', 500, broadcast);
		expect(state.consecutiveErrors).toBe(1);
		expect(state.nextPollAtMs).toBe(0); // below threshold
		await pollKismetDevices(state, 1, 'http://x', 'k', 500, broadcast);
		expect(state.consecutiveErrors).toBe(2);
		expect(state.nextPollAtMs).toBe(0);
		fetchSpy.mockRestore();
	});

	it('sets exponentially-increasing nextPollAtMs after threshold (3) consecutive failures', async () => {
		const state = makeState();
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockRejectedValue(new Error('connect ECONNREFUSED'));
		const broadcast = vi.fn();
		await pollKismetDevices(state, 1, 'http://x', 'k', 500, broadcast);
		await pollKismetDevices(state, 1, 'http://x', 'k', 500, broadcast);
		await pollKismetDevices(state, 1, 'http://x', 'k', 500, broadcast);
		expect(state.consecutiveErrors).toBe(3);
		const firstBackoff = state.nextPollAtMs - Date.now();
		expect(firstBackoff).toBeGreaterThan(4_500);
		expect(firstBackoff).toBeLessThanOrEqual(5_500);

		// Force time forward past backoff window so next poll runs
		state.nextPollAtMs = 0;
		await pollKismetDevices(state, 1, 'http://x', 'k', 500, broadcast);
		expect(state.consecutiveErrors).toBe(4);
		const secondBackoff = state.nextPollAtMs - Date.now();
		expect(secondBackoff).toBeGreaterThan(9_500);
		expect(secondBackoff).toBeLessThanOrEqual(10_500);
		fetchSpy.mockRestore();
	});

	it('skips fetch entirely while inside the backoff window', async () => {
		const state = makeState();
		state.consecutiveErrors = 5;
		state.nextPollAtMs = Date.now() + 60_000;
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await pollKismetDevices(state, 1, 'http://x', 'k', 500, vi.fn());
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it('resetPollerBackoff clears counters so next poll runs immediately', () => {
		const state = makeState();
		state.consecutiveErrors = 5;
		state.nextPollAtMs = Date.now() + 60_000;
		resetPollerBackoff(state);
		expect(state.consecutiveErrors).toBe(0);
		expect(state.nextPollAtMs).toBe(0);
	});
});
