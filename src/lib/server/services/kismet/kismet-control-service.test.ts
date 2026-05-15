/**
 * Smoke tests for kismet-control-service module.
 *
 * Focused on the 2026-05-15 OTel/Jaeger scan fix: waitForKismetReady
 * now polls every 250 ms (was 1000 ms) so the typical 200-500 ms
 * kismet startup is detected at first success instead of waiting out
 * a 1 s tick. Tests the module loads cleanly + the public surface.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/env', () => ({
	env: { KISMET_API_URL: 'http://fake-kismet:2501', ARGOS_TEMP_DIR: '/tmp' }
}));

vi.mock('$lib/utils/logger', () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

vi.mock('$lib/server/exec', () => ({
	execFileAsync: vi.fn()
}));

import { isKismetRunning, startKismet } from './kismet-control-service';

describe('kismet-control-service', () => {
	it('exports startKismet + isKismetRunning (consumed by /api/kismet/start)', () => {
		expect(typeof startKismet).toBe('function');
		expect(typeof isKismetRunning).toBe('function');
	});
});
