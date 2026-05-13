import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '$lib/server/env';

import {
	getGnuRadioVncStatus,
	startGnuRadioVnc,
	stopGnuRadioVnc
} from './gnu-radio-vnc-control-service';
import { _setSpawnImplForTest } from './gnu-radio-vnc-processes';

beforeEach(() => {
	// CI Ubuntu runner doesn't have the real binaries; stub env to /bin/sh so
	// resolveBin returns successfully. spawn DI seam below ensures nothing is
	// actually executed.
	env.ARGOS_VNC_XTIGERVNC_BIN = '/bin/sh';
	env.ARGOS_VNC_WEBSOCKIFY_BIN = '/bin/sh';
	env.ARGOS_VNC_GNURADIO_COMPANION_BIN = '/bin/sh';

	_setSpawnImplForTest(() => {
		const proc = {
			pid: Math.floor(Math.random() * 10000) + 1000,
			exitCode: null,
			on: vi.fn(),
			once: vi.fn(),
			kill: vi.fn(),
			stdout: { on: vi.fn() },
			stderr: { on: vi.fn() }
		};
		return proc as never;
	});
});

afterEach(() => {
	_setSpawnImplForTest(null);
	delete globalThis.__argos_gnuradioVnc_state;
	delete env.ARGOS_VNC_XTIGERVNC_BIN;
	delete env.ARGOS_VNC_WEBSOCKIFY_BIN;
	delete env.ARGOS_VNC_GNURADIO_COMPANION_BIN;
});

describe('gnu-radio-vnc-control-service', () => {
	it('start returns wsPort 6084 + wsPath /websockify on success', async () => {
		const r = await startGnuRadioVnc();
		expect(r.success).toBe(true);
		expect(r.wsPort).toBe(6084);
		expect(r.wsPath).toBe('/websockify');
	});

	it('status reports running after start', async () => {
		await startGnuRadioVnc();
		const s = getGnuRadioVncStatus();
		expect(s.isRunning).toBe(true);
		expect(s.status).toBe('active');
	});

	it('stop clears state', async () => {
		await startGnuRadioVnc();
		const r = await stopGnuRadioVnc();
		expect(r.success).toBe(true);
		const s = getGnuRadioVncStatus();
		expect(s.isRunning).toBe(false);
		expect(s.flowgraph).toBeNull();
	}, 5000);

	it('start with flowgraph records currentFlowgraph in status', async () => {
		await startGnuRadioVnc('/tmp/argos-grc-demo.grc');
		const s = getGnuRadioVncStatus();
		expect(s.flowgraph).toBe('/tmp/argos-grc-demo.grc');
	});

	it('start while running returns idempotent success', async () => {
		await startGnuRadioVnc();
		const r2 = await startGnuRadioVnc();
		expect(r2.success).toBe(true);
		expect(r2.message).toMatch(/already running/i);
	});

	it('rejects flowgraph path that does not end in .grc', async () => {
		const r = await startGnuRadioVnc('/tmp/notaflowgraph.txt');
		expect(r.success).toBe(false);
		expect(r.error).toMatch(/\.grc/);
	});
});
