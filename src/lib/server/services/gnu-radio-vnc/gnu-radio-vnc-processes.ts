/**
 * Low-level process helpers for the GNU Radio VNC stack.
 *
 * Three-process stack: Xtigervnc (virtual display), gnuradio-companion (GTK GUI),
 * and websockify (VNC-to-WebSocket bridge for noVNC).
 *
 * Modeled on wireshark-vnc-processes.ts. Key differences:
 *   - GRC frontend is GTK by default; QT_QPA_PLATFORM=xcb still set because
 *     Qt block sinks (qt_sink/qt_freq_sink) inside running flowgraphs spawn
 *     Qt windows that hang under Wayland.
 *   - Optional flowgraph path passed as positional arg to gnuradio-companion.
 *   - No capture interface / display filter (flowgraph is the only dynamic input).
 */

import { type ChildProcess, spawn as nodeSpawn } from 'child_process';

import { env } from '$lib/server/env';
import { logger } from '$lib/utils/logger';

import { resolveBin } from '../vnc-common/resolve-bin';
import {
	GNU_RADIO_DEPTH,
	GNU_RADIO_GEOMETRY,
	GNU_RADIO_VNC_DISPLAY,
	GNU_RADIO_VNC_PORT,
	GNU_RADIO_WS_PORT
} from './gnu-radio-vnc-types';

// ───────────────────────────── DI seam ─────────────────────────────
// vi.spyOn fails on frozen ESM namespaces (memory: feedback_esm_vi_spyon_di_seam.md).
// Tests call _setSpawnImplForTest(impl) to inject a mock; null restores nodeSpawn.

type SpawnFn = typeof nodeSpawn;
let spawnImpl: SpawnFn = nodeSpawn;

export function _setSpawnImplForTest(impl: SpawnFn | null): void {
	spawnImpl = impl ?? nodeSpawn;
}

// ───────────────────────────── bin resolvers ──────────────────────────────

const resolveXtigervncBin = () =>
	resolveBin(
		[env.ARGOS_VNC_XTIGERVNC_BIN, '/usr/bin/Xtigervnc', '/usr/local/bin/Xtigervnc'],
		'Xtigervnc',
		'ARGOS_VNC_XTIGERVNC_BIN'
	);

const resolveWebsockifyBin = () =>
	resolveBin(
		[env.ARGOS_VNC_WEBSOCKIFY_BIN, '/usr/bin/websockify', '/usr/local/bin/websockify'],
		'websockify',
		'ARGOS_VNC_WEBSOCKIFY_BIN'
	);

const resolveGrcBin = () =>
	resolveBin(
		[
			env.ARGOS_VNC_GNURADIO_COMPANION_BIN,
			'/usr/bin/gnuradio-companion',
			'/usr/local/bin/gnuradio-companion'
		],
		'gnuradio-companion',
		'ARGOS_VNC_GNURADIO_COMPANION_BIN'
	);

// ───────────────────────────── module state ──────────────────────────────

function ensureState() {
	if (!globalThis.__argos_gnuradioVnc_state) {
		globalThis.__argos_gnuradioVnc_state = {
			xvncProcess: null,
			grcProcess: null,
			websockifyProcess: null,
			currentFlowgraph: null,
			spawnError: null
		};
	}
	return globalThis.__argos_gnuradioVnc_state;
}

// ───────────────────────────── spawners ──────────────────────────────

function buildGrcEnv(): NodeJS.ProcessEnv {
	return {
		...process.env,
		DISPLAY: GNU_RADIO_VNC_DISPLAY,
		QT_QPA_PLATFORM: 'xcb',
		XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid?.() ?? 1000}`
	};
}

export function spawnXtigervnc(): ChildProcess {
	const bin = resolveXtigervncBin();
	const args = [
		GNU_RADIO_VNC_DISPLAY,
		'-geometry',
		GNU_RADIO_GEOMETRY,
		'-depth',
		String(GNU_RADIO_DEPTH),
		'-SecurityTypes',
		'None',
		'-localhost',
		'-rfbport',
		String(GNU_RADIO_VNC_PORT)
	];
	const proc = spawnImpl(bin, args, { stdio: 'pipe' });
	const state = ensureState();
	state.xvncProcess = proc;
	proc.on('error', (err) => {
		state.spawnError = err;
		logger.error({ err }, 'Xtigervnc spawn error');
	});
	return proc;
}

export function spawnGnuRadioCompanion(flowgraph?: string): ChildProcess {
	const bin = resolveGrcBin();
	const args = flowgraph ? ['--log', 'info', flowgraph] : ['--log', 'info'];
	const proc = spawnImpl(bin, args, {
		stdio: 'pipe',
		env: buildGrcEnv()
	});
	const state = ensureState();
	state.grcProcess = proc;
	state.currentFlowgraph = flowgraph ?? null;
	proc.on('error', (err) => {
		state.spawnError = err;
		logger.error({ err }, 'gnuradio-companion spawn error');
	});
	return proc;
}

export function spawnWebsockify(): ChildProcess {
	const bin = resolveWebsockifyBin();
	const args = [String(GNU_RADIO_WS_PORT), `localhost:${GNU_RADIO_VNC_PORT}`];
	const proc = spawnImpl(bin, args, { stdio: 'pipe' });
	const state = ensureState();
	state.websockifyProcess = proc;
	proc.on('error', (err) => {
		state.spawnError = err;
		logger.error({ err }, 'websockify spawn error');
	});
	return proc;
}

export function isAnyProcessAlive(): boolean {
	const state = ensureState();
	const procs = [state.xvncProcess, state.grcProcess, state.websockifyProcess];
	return procs.some((p) => p && p.pid !== undefined && p.exitCode === null);
}

function gracefulSignal(p: ChildProcess, signal: 'SIGTERM' | 'SIGKILL'): void {
	try {
		p.kill(signal);
	} catch {
		/* already dead */
	}
}

function clearGnuRadioState(): void {
	const state = ensureState();
	state.xvncProcess = null;
	state.grcProcess = null;
	state.websockifyProcess = null;
	state.currentFlowgraph = null;
	state.spawnError = null;
}

export async function killAllProcesses(): Promise<void> {
	const state = ensureState();
	const procs = [state.grcProcess, state.websockifyProcess, state.xvncProcess].filter(
		(p): p is ChildProcess => Boolean(p)
	);
	for (const p of procs) gracefulSignal(p, 'SIGTERM');
	await new Promise((r) => setTimeout(r, 2000));
	for (const p of procs) {
		if (p.exitCode === null) gracefulSignal(p, 'SIGKILL');
	}
	clearGnuRadioState();
}

export function getCurrentFlowgraph(): string | null {
	return ensureState().currentFlowgraph;
}
