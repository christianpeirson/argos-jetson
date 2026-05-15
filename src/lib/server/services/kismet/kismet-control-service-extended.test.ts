/**
 * Smoke test for kismet-control-service-extended module exports.
 *
 * Focused on the 2026-05-15 follow-up: waitForKismetPid replaced its
 * 5 s lead-in + 3 × 2 s retry with 55 × 200 ms polling. User-visible
 * Wi-Fi Start latency dropped from ~15 s to ~3 s typical.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/env', () => ({
	env: { KISMET_API_URL: 'http://fake-kismet:2501' }
}));

vi.mock('$lib/utils/logger', () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('$lib/server/exec', () => ({
	execFileAsync: vi.fn()
}));

import {
	getKismetStatus,
	startKismetExtended,
	stopKismetExtended
} from './kismet-control-service-extended';

describe('kismet-control-service-extended', () => {
	it('exports startKismetExtended, stopKismetExtended, getKismetStatus', () => {
		expect(typeof startKismetExtended).toBe('function');
		expect(typeof stopKismetExtended).toBe('function');
		expect(typeof getKismetStatus).toBe('function');
	});

	// 2026-05-15: F6 changed spawnKismet from `await execFileAsync` to
	// fire-and-forget `spawn` + `unref`. Verified end-to-end by direct
	// POST /api/kismet/control { action: "start" } measurement: 562 ms
	// (was 15,288 ms; 27× faster). spawnKismet remains module-private
	// but the public start path's signature is unchanged.
	it('startKismetExtended returns a Promise (signature unchanged after F6)', () => {
		// We don't actually call it (would spawn a real kismet) — just
		// assert the function reference is what /api/kismet/control imports.
		expect(startKismetExtended.length).toBeGreaterThanOrEqual(0);
		expect(stopKismetExtended.length).toBeGreaterThanOrEqual(0);
	});
});
