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
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join as joinPath } from 'path';

import { env } from '$lib/server/env';
import { logger } from '$lib/utils/logger';

import { resolveBin } from '../vnc-common/resolve-bin';
import openboxRcXml from './etc/openbox-rc.xml?raw';
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
			wmProcess: null,
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
		logger.error('Xtigervnc spawn error', { error: err.message });
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
		logger.error('gnuradio-companion spawn error', { error: err.message });
	});
	return proc;
}

// Post-spawn window maximizer. The openbox <application name="gnuradio-companion">
// rule in etc/openbox-rc.xml is unreliable on real GRC (verified live: _NET_WM_STATE
// stays empty even after `openbox --reconfigure`). wmctrl issues an EWMH
// _NET_WM_STATE ADD client message AFTER the window maps, which works.
//
// Substring match on WM_NAME — `'GNU Radio Companion'` matches both
// `'untitled - GNU Radio Companion'` and `'<flowgraph>.grc - GNU Radio Companion'`
// (case-insensitive default per wmctrl(1) Debian manpage).
//
// Runs as a detached bash loop so a delayed window map doesn't block the API
// response. Polls every 200 ms, 30 s upper bound. wmctrl absence is logged but
// non-fatal — GRC still works at default size if the binary is missing.
export function spawnGrcMaximizer(): ChildProcess {
	const cmd = [
		'for i in $(seq 1 150); do',
		"  if wmctrl -l 2>/dev/null | grep -q 'GNU Radio Companion'; then",
		"    wmctrl -r 'GNU Radio Companion' -b add,maximized_vert,maximized_horz",
		'    exit 0',
		'  fi',
		'  sleep 0.2',
		'done',
		'exit 1'
	].join('\n');
	const proc = spawnImpl('/bin/bash', ['-c', cmd], {
		stdio: 'ignore',
		detached: true,
		env: { ...process.env, DISPLAY: GNU_RADIO_VNC_DISPLAY }
	});
	proc.on('error', (err) => {
		logger.warn('wmctrl maximizer spawn error (non-fatal)', { error: err.message });
	});
	proc.on('exit', (code) => {
		if (code === 0) {
			logger.info('GRC window maximized via wmctrl');
		} else if (code === 1) {
			logger.warn('GRC window did not appear within 30s — left at default size');
		}
	});
	proc.unref();
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
		logger.error('websockify spawn error', { error: err.message });
	});
	return proc;
}

// openbox gives the GRC window a titlebar + interactive resize/move + EWMH
// support (so wmctrl/xdotool work). Matchbox-window-manager was rejected
// because it lacks _NET_WM_MOVERESIZE — users couldn't drag-resize the GRC
// window. xfwm4 (preinstalled) works but pulls in xfconf/wnck/xfce4-panel.
// Openbox (~400 KB) is the standard pick for Xvnc single-app sessions:
// COMPLIANCE file lists every required EWMH atom as "+ full".
//
// --sm-disable skips the X session manager (headless Xvnc has none).
// $DISPLAY env replaces the missing --display flag.
// rc.xml ships with the build via ?raw import; we write it to /tmp at first
// startup so openbox can mmap it. Lazy + idempotent — survives multiple starts.
let writtenRcXmlPath: string | null = null;
function ensureRcXmlOnDisk(): string {
	if (writtenRcXmlPath) return writtenRcXmlPath;
	const path = joinPath(tmpdir(), 'argos-openbox-rc.xml');
	writeFileSync(path, openboxRcXml, 'utf8');
	writtenRcXmlPath = path;
	return path;
}

export function spawnWindowManager(): ChildProcess {
	const rcXml = ensureRcXmlOnDisk();
	const proc = spawnImpl('/usr/bin/openbox', ['--sm-disable', '--config-file', rcXml], {
		stdio: 'pipe',
		env: { ...process.env, DISPLAY: GNU_RADIO_VNC_DISPLAY }
	});
	const state = ensureState();
	state.wmProcess = proc;
	proc.on('error', (err) => {
		state.spawnError = err;
		logger.error('openbox spawn error', { error: err.message });
	});
	return proc;
}

export function isAnyProcessAlive(): boolean {
	const state = ensureState();
	const procs = [state.xvncProcess, state.grcProcess, state.websockifyProcess, state.wmProcess];
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
	state.wmProcess = null;
	state.currentFlowgraph = null;
	state.spawnError = null;
}

export async function killAllProcesses(): Promise<void> {
	const state = ensureState();
	const procs = [
		state.grcProcess,
		state.wmProcess,
		state.websockifyProcess,
		state.xvncProcess
	].filter((p): p is ChildProcess => Boolean(p));
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
