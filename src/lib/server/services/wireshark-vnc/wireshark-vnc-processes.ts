/**
 * Low-level process helpers for the Wireshark VNC stack.
 *
 * Three-process stack: Xtigervnc (virtual display), Wireshark (Qt GUI),
 * and websockify (VNC-to-WebSocket bridge for noVNC).
 *
 * Modeled on sdrpp-vnc-processes.ts. Key differences:
 *   - Qt frontend needs QT_QPA_PLATFORM=xcb (Wayland backend crashes under TigerVNC).
 *   - No window-centering step — Wireshark restores its own layout on relaunch.
 *   - Capture interface + display filter are dynamic (change per start request).
 */

import { type ChildProcess, spawn } from 'child_process';
import { readFile } from 'fs/promises';

import { env } from '$lib/server/env';
import { execFileAsync } from '$lib/server/exec';
import { logger } from '$lib/utils/logger';

import { resolveBin } from '../vnc-common/resolve-bin';
import {
	isPortOpen,
	isWebsockifyResponding as isWebsockifyRespondingShared,
	killOrphansByPort as killOrphansByPortShared,
	killVncProcess,
	setVncBackground as setVncBackgroundShared,
	spawnWebsockify as spawnWebsockifyShared,
	spawnXtigervnc as spawnXtigervncShared,
	waitForStackReady as waitForStackReadyShared
} from '../vnc-common/spawn-helpers';
import {
	WIRESHARK_DEPTH,
	WIRESHARK_GEOMETRY,
	WIRESHARK_PROFILE,
	WIRESHARK_VNC_DISPLAY,
	WIRESHARK_VNC_PORT,
	WIRESHARK_WS_PORT
} from './wireshark-vnc-types';

const resolveWiresharkBin = () =>
	resolveBin(
		[env.ARGOS_VNC_WIRESHARK_BIN, '/usr/bin/wireshark', '/usr/local/bin/wireshark'],
		'wireshark',
		'ARGOS_VNC_WIRESHARK_BIN'
	);

const resolveTsharkBin = () =>
	resolveBin(
		[env.ARGOS_VNC_TSHARK_BIN, '/usr/bin/tshark', '/usr/local/bin/tshark'],
		'tshark',
		'ARGOS_VNC_TSHARK_BIN'
	);

// ───────────────────────────── module state ──────────────────────────────
// Persisted on globalThis so Vite HMR reloads don't orphan the running
// processes (module `let` bindings would be lost on every server-file edit).
// The shape is typed in src/app.d.ts.

function ensureState() {
	// globalThis.__argos_wiresharkVnc_state is typed in src/app.d.ts.
	if (!globalThis.__argos_wiresharkVnc_state) {
		globalThis.__argos_wiresharkVnc_state = {
			xvncProcess: null,
			wiresharkProcess: null,
			websockifyProcess: null,
			currentIface: null,
			currentFilter: null,
			// Latched error from any child's async 'error' event. Cleared at stack start.
			spawnError: null
		};
	}
	return globalThis.__argos_wiresharkVnc_state;
}

const state = ensureState();

function recordSpawnError(label: string, err: Error): void {
	logger.error(`[wireshark-vnc] ${label} error`, { error: err.message });
	if (!state.spawnError) state.spawnError = new Error(`${label}: ${err.message}`);
}

export function clearSpawnError(): void {
	state.spawnError = null;
}

export function getSpawnError(): Error | null {
	return state.spawnError;
}

export function getCurrentIface(): string | null {
	return state.currentIface;
}

export function getCurrentFilter(): string | null {
	return state.currentFilter;
}

export function setCurrentCapture(iface: string, filter: string): void {
	state.currentIface = iface;
	state.currentFilter = filter;
}

function clearCurrentCapture(): void {
	state.currentIface = null;
	state.currentFilter = null;
}

// ────────────────────────────── preflights ──────────────────────────────

/** Regex fingerprints that mark tshark's `-Y` compile failures on stderr. */
const TSHARK_FILTER_ERROR_PATTERNS = [
	/is neither a field nor a protocol name/i,
	/isn'?t a valid display filter/i,
	/^tshark:\s*".*?"\s+is/im,
	/^tshark:\s*invalid\s+display\s+filter/im
];

function matchTsharkFilterError(output: string): string | null {
	if (!TSHARK_FILTER_ERROR_PATTERNS.some((re) => re.test(output))) return null;
	const firstLine = output.split(/\r?\n/).find((l) => l.trim().length > 0);
	return (firstLine ?? output).trim();
}

/**
 * Compile-check a Wireshark display filter via `tshark -Y <filter> -r /dev/null`.
 *
 * Returns `null` when the filter parses cleanly, else the tshark diagnostic.
 * tshark's subsequent pcap read error on `/dev/null` is ignored — it only
 * fires AFTER the filter compiles, so its absence or presence is not
 * evidence against filter validity.
 */
interface TsharkExecError {
	stderr?: string;
	stdout?: string;
	code?: string | number;
	killed?: boolean;
	signal?: string;
}

function tsharkFailureTag(e: TsharkExecError): string {
	if (e.killed) return 'timeout/killed';
	return `code=${e.code ?? 'unknown'}`;
}

function tsharkFailureDetail(e: TsharkExecError, err: unknown): string {
	const trimmed = e.stderr?.trim();
	if (trimmed) return trimmed;
	if (err instanceof Error) return err.message;
	return String(err);
}

/**
 * Classify a tshark execution failure: returns the filter diagnostic when the
 * stderr matches a known invalid-filter pattern, otherwise throws so the caller
 * doesn't treat a preflight failure (missing binary, timeout) as a valid filter.
 */
function classifyTsharkFailure(err: unknown): string {
	const e = err as TsharkExecError;
	const combined = `${e.stderr ?? ''}\n${e.stdout ?? ''}`;
	const diagnostic = matchTsharkFilterError(combined);
	if (diagnostic !== null) return diagnostic;
	throw new Error(
		`tshark preflight failed [${tsharkFailureTag(e)}]: ${tsharkFailureDetail(e, err)}`
	);
}

export async function validateDisplayFilter(filter: string): Promise<string | null> {
	try {
		await execFileAsync(resolveTsharkBin(), ['-Y', filter, '-r', '/dev/null'], {
			timeout: 5000
		});
		return null;
	} catch (err) {
		return classifyTsharkFailure(err);
	}
}

// fallow-ignore-next-line complexity
async function lookupWiresharkGid(): Promise<number | null> {
	let etcGroup: string;
	try {
		etcGroup = await readFile('/etc/group', 'utf-8');
	} catch (err) {
		// ENOENT is expected on non-Linux / minimal containers — no wireshark
		// group to check. Anything else (EACCES, EIO) is unusual and worth a
		// breadcrumb so a silent null-return doesn't mask a real problem.
		const code = (err as NodeJS.ErrnoException).code;
		if (code && code !== 'ENOENT') {
			logger.warn('[wireshark-vnc] /etc/group read failed', { code });
		}
		return null;
	}
	const match = /^wireshark:[^:]*:(\d+):/m.exec(etcGroup);
	return match ? Number.parseInt(match[1], 10) : null;
}

/**
 * Assert the Argos process is a member of the `wireshark` group on Linux.
 *
 * `dumpcap` ships mode `0754 root:wireshark` — exec is gated on group
 * membership independently of CAP_NET_RAW. Sessions started before
 * `usermod -aG wireshark` do NOT inherit the new supplementary group; user
 * must relaunch via `sg wireshark -c '…'` or restart the systemd unit.
 *
 * Silently no-ops when `/etc/group` has no `wireshark` entry (dev machines
 * without wireshark installed) or when `process.getgroups` is unavailable.
 */
export async function assertWiresharkGroupMember(): Promise<void> {
	const getGroups = (process as { getgroups?: () => number[] }).getgroups;
	if (typeof getGroups !== 'function') return;
	const groups = getGroups();
	const wiresharkGid = await lookupWiresharkGid();
	if (wiresharkGid == null) return;
	if (groups.includes(wiresharkGid)) return;
	throw new Error(
		`Argos process is not in the 'wireshark' group (gid ${wiresharkGid}). ` +
			`dumpcap refuses exec → Wireshark will launch but show "Permission denied" ` +
			`on capture. Fix: add user to group (sudo usermod -aG wireshark <user>) ` +
			`then relaunch Argos via 'sg wireshark -c …' or restart the systemd unit — ` +
			`existing login sessions do NOT inherit the new group.`
	);
}

// ─────────────────────────────── spawn ──────────────────────────────────

/** Spawn Xtigervnc as a combined X server + VNC server on `:96`. */
export function spawnXtigervnc(): void {
	const child = spawnXtigervncShared(
		{
			display: WIRESHARK_VNC_DISPLAY,
			geometry: WIRESHARK_GEOMETRY,
			depth: WIRESHARK_DEPTH,
			port: WIRESHARK_VNC_PORT
		},
		{
			scope: 'wireshark-vnc',
			onExit: () => {
				if (state.xvncProcess === child) state.xvncProcess = null;
			},
			onError: (err) => {
				recordSpawnError('Xtigervnc', err);
				if (state.xvncProcess === child) state.xvncProcess = null;
			}
		}
	);
	state.xvncProcess = child;
}

/** Set X11 background to match Lunaris dark theme (#111111). */
export function setVncBackground(): void {
	setVncBackgroundShared(WIRESHARK_VNC_DISPLAY, 'wireshark-vnc');
}

/**
 * Spawn the Wireshark Qt GUI rendering into the Xtigervnc display.
 *
 * Flags:
 *   -i <iface>              — capture interface
 *   -k                      — start capture immediately
 *   -Y <filter>             — apply display filter on launch
 *   -C <profile>            — load isolated profile (prevents clobbering user prefs)
 *   -o gui.update.enabled:FALSE — disable phone-home update checks
 *
 * Source: https://www.wireshark.org/docs/wsug_html_chunked/ChCustCommandLine
 */
export function spawnWiresharkGui(iface: string, filter: string): void {
	const child = spawn(
		resolveWiresharkBin(),
		[
			'-C',
			WIRESHARK_PROFILE,
			'-o',
			'gui.update.enabled:FALSE',
			'-i',
			iface,
			'-k',
			'-Y',
			filter
		],
		{
			env: {
				...process.env,
				DISPLAY: WIRESHARK_VNC_DISPLAY,
				// Qt on Wayland hangs inside a TigerVNC session — force X11 backend.
				QT_QPA_PLATFORM: 'xcb'
			},
			stdio: 'ignore',
			detached: true
		}
	);
	state.wiresharkProcess = child;
	child.unref();
	child.on('exit', (code, signal) => {
		logger.info('[wireshark-vnc] wireshark exited', { code, signal });
		if (state.wiresharkProcess === child) state.wiresharkProcess = null;
	});
	child.on('error', (err) => {
		recordSpawnError('wireshark', err);
		if (state.wiresharkProcess === child) state.wiresharkProcess = null;
	});
}

/** Spawn websockify to bridge the VNC port to a WebSocket. */
export function spawnWebsockify(): void {
	const child = spawnWebsockifyShared(
		{ wsPort: WIRESHARK_WS_PORT, vncPort: WIRESHARK_VNC_PORT },
		{
			scope: 'wireshark-vnc',
			onExit: () => {
				if (state.websockifyProcess === child) state.websockifyProcess = null;
			},
			onError: (err) => {
				recordSpawnError('websockify', err);
				if (state.websockifyProcess === child) state.websockifyProcess = null;
			}
		}
	);
	state.websockifyProcess = child;
}

// ─────────────────────────────── health ─────────────────────────────────

/** Probe whether the VNC TCP port is accepting connections. */
export function isVncPortOpen(): Promise<boolean> {
	return isPortOpen(WIRESHARK_VNC_PORT);
}

/** Probe whether websockify is responding. */
export async function isWebsockifyResponding(): Promise<boolean> {
	return isWebsockifyRespondingShared(WIRESHARK_WS_PORT);
}

/** Poll until both VNC and websockify are alive. */
export async function waitForStackReady(maxAttempts = 25): Promise<boolean> {
	return waitForStackReadyShared(WIRESHARK_VNC_PORT, WIRESHARK_WS_PORT, maxAttempts);
}

// ─────────────────────────────── cleanup ────────────────────────────────

/** Send SIGTERM, wait 500ms, then SIGKILL any surviving process. */
export async function killProcess(ref: ChildProcess | null, name: string): Promise<void> {
	return killVncProcess(ref, name, 'wireshark-vnc');
}

/** Non-fatal fuser-kill of anything bound to the VNC or WebSocket ports. */
export async function killOrphansByPort(): Promise<void> {
	return killOrphansByPortShared(WIRESHARK_VNC_PORT, WIRESHARK_WS_PORT);
}

/** Tear down all three processes in reverse spawn order. */
export async function killAllProcesses(): Promise<void> {
	await killProcess(state.websockifyProcess, 'websockify');
	state.websockifyProcess = null;
	await killProcess(state.wiresharkProcess, 'wireshark');
	state.wiresharkProcess = null;
	await killProcess(state.xvncProcess, 'Xtigervnc');
	state.xvncProcess = null;
	clearCurrentCapture();
}

/** Check whether all three managed processes are still alive. */
export function isStackAlive(): boolean {
	return (
		state.xvncProcess !== null &&
		state.wiresharkProcess !== null &&
		state.websockifyProcess !== null
	);
}
