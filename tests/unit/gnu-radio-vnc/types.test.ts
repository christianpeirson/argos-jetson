/**
 * Unit tests for GNU Radio VNC service type definitions and constants.
 *
 * Locks in the wire-level contract for the spec-027 GNU Radio noVNC tile:
 * display number, ports, geometry, and result-shape interfaces. Behavioural
 * code lives in PR-B (process spawners + control service); this file only
 * exists to satisfy the dangerfile tests-required gate for the new
 * `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-types.ts` module.
 */

import { describe, expect, it } from 'vitest';

import {
	GNU_RADIO_DEPTH,
	GNU_RADIO_GEOMETRY,
	GNU_RADIO_VNC_DISPLAY,
	GNU_RADIO_VNC_PORT,
	GNU_RADIO_WS_PATH,
	GNU_RADIO_WS_PORT,
	type GnuRadioVncControlResult,
	type GnuRadioVncStatusResult
} from '../../../src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-types';

describe('gnu-radio-vnc-types constants', () => {
	it('uses display :95 to avoid collision with Wireshark/SDR++/Sparrow/WebTAK', () => {
		expect(GNU_RADIO_VNC_DISPLAY).toBe(':95');
	});

	it('binds VNC TCP on port 5995', () => {
		expect(GNU_RADIO_VNC_PORT).toBe(5995);
	});

	it('binds websockify on port 6084', () => {
		expect(GNU_RADIO_WS_PORT).toBe(6084);
	});

	it('exposes websockify under /websockify path', () => {
		expect(GNU_RADIO_WS_PATH).toBe('/websockify');
	});

	it('uses 1440x900 geometry to match Wireshark visual parity', () => {
		expect(GNU_RADIO_GEOMETRY).toBe('1440x900');
	});

	it('uses 24-bit color depth', () => {
		expect(GNU_RADIO_DEPTH).toBe(24);
	});

	it('keeps VNC + websockify ports outside the IANA ephemeral range start (≤6084)', () => {
		expect(GNU_RADIO_VNC_PORT).toBeLessThan(49152);
		expect(GNU_RADIO_WS_PORT).toBeLessThan(49152);
	});

	it('keeps VNC + websockify ports distinct', () => {
		expect(GNU_RADIO_VNC_PORT).not.toBe(GNU_RADIO_WS_PORT);
	});
});

describe('GnuRadioVncControlResult shape', () => {
	it('accepts a successful start response with ws metadata', () => {
		const result: GnuRadioVncControlResult = {
			success: true,
			message: 'started',
			wsPort: GNU_RADIO_WS_PORT,
			wsPath: GNU_RADIO_WS_PATH,
			flowgraph: '/tmp/demo.grc'
		};
		expect(result.success).toBe(true);
		expect(result.wsPort).toBe(6084);
	});

	it('accepts an error response without ws metadata', () => {
		const result: GnuRadioVncControlResult = {
			success: false,
			message: 'spawn failed',
			error: 'ENOENT: gnuradio-companion not on PATH'
		};
		expect(result.success).toBe(false);
		expect(result.wsPort).toBeUndefined();
		expect(result.flowgraph).toBeUndefined();
	});
});

describe('GnuRadioVncStatusResult shape', () => {
	it('reports active when running', () => {
		const result: GnuRadioVncStatusResult = {
			success: true,
			isRunning: true,
			status: 'active',
			wsPort: GNU_RADIO_WS_PORT,
			wsPath: GNU_RADIO_WS_PATH,
			flowgraph: '/tmp/demo.grc'
		};
		expect(result.isRunning).toBe(true);
		expect(result.status).toBe('active');
	});

	it('reports inactive with null flowgraph when stopped', () => {
		const result: GnuRadioVncStatusResult = {
			success: true,
			isRunning: false,
			status: 'inactive',
			wsPort: GNU_RADIO_WS_PORT,
			wsPath: GNU_RADIO_WS_PATH,
			flowgraph: null
		};
		expect(result.isRunning).toBe(false);
		expect(result.flowgraph).toBeNull();
	});
});
