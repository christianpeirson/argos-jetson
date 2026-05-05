/**
 * Shared spawn helpers for the VNC stack services
 * (webtak-vnc, sdrpp, sparrow, wireshark).
 *
 * Each service used to ship copy-paste-evolved versions of the same Xtigervnc
 * spawn, dark-background cosmetic, and window-centerer logic. This module
 * holds the canonical implementations; the per-service files now hand in
 * their constants and callbacks.
 *
 * @module
 */

import { type ChildProcess, spawn } from 'child_process';
import { connect as netConnect } from 'net';

import { execFileAsync } from '$lib/server/exec';
import { delay } from '$lib/utils/delay';
import { logger } from '$lib/utils/logger';

import { resolveWebsockifyBin, resolveXtigervncBin } from './resolve-bin';

export interface XtigervncOptions {
	display: string;
	geometry: string;
	depth: number;
	port: number;
}

/** Lifecycle callbacks shared by every detached child spawn helper. */
export interface SpawnCallbacks {
	/** Service log scope (e.g. "sdrpp-vnc"). */
	scope: string;
	/** Called when the process emits 'exit'. Implementations typically null out the module-scoped ref. */
	onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
	/** Called when the process emits 'error'. Implementations typically record the error and null out the module-scoped ref. */
	onError: (err: Error) => void;
}

/**
 * Spawn a detached child with `{ stdio: 'ignore' }` and wire the standard
 * unref + exit-log + error-forward shape that every VNC stack helper repeats.
 */
function spawnDetached(
	bin: string,
	args: readonly string[],
	label: string,
	callbacks: SpawnCallbacks
): ChildProcess {
	const proc = spawn(bin, args as string[], { stdio: 'ignore', detached: true });
	proc.unref();
	proc.on('exit', (code, signal) => {
		logger.info(`[${callbacks.scope}] ${label} exited`, { code, signal });
		callbacks.onExit(code, signal);
	});
	proc.on('error', (err) => {
		callbacks.onError(err);
	});
	return proc;
}

/** Spawn Xtigervnc as a combined X server + VNC server. */
export function spawnXtigervnc(opts: XtigervncOptions, callbacks: SpawnCallbacks): ChildProcess {
	return spawnDetached(
		resolveXtigervncBin(),
		[
			opts.display,
			'-geometry',
			opts.geometry,
			'-depth',
			String(opts.depth),
			'-SecurityTypes',
			'None',
			'-localhost',
			'-rfbport',
			String(opts.port),
			'-AlwaysShared'
		],
		'Xtigervnc',
		callbacks
	);
}

/** Set X11 background to match Lunaris dark theme (#111111). Cosmetic-only — failures are logged but not fatal. */
export function setVncBackground(display: string, scope: string): void {
	const bg = spawn('/usr/bin/xsetroot', ['-solid', '#111111'], {
		env: { ...process.env, DISPLAY: display },
		stdio: 'ignore'
	});
	// Handler before unref: an unhandled 'error' event on xsetroot (missing
	// binary, ENOEXEC) would otherwise crash the Node process. Cosmetic-only
	// — a failed background set doesn't break the VNC stack.
	bg.on('error', (err) => {
		logger.warn(`[${scope}] xsetroot spawn failed (cosmetic)`, {
			error: err.message
		});
	});
	bg.unref();
}

/** Center a window matching `windowSearchName` within the VNC framebuffer using xdotool. */
export function centerVncWindow(display: string, windowSearchName: string): void {
	const script = `
		WID=$(xdotool search --name "${windowSearchName}" 2>/dev/null | head -1)
		if [ -n "$WID" ]; then
			eval $(xdotool getwindowgeometry --shell "$WID")
			SCREEN_W=$(xdpyinfo | grep dimensions | awk '{print $2}' | cut -dx -f1)
			SCREEN_H=$(xdpyinfo | grep dimensions | awk '{print $2}' | cut -dx -f2)
			X=$(( (SCREEN_W - WIDTH) / 2 ))
			Y=$(( (SCREEN_H - HEIGHT) / 2 ))
			xdotool windowmove "$WID" "$X" "$Y"
		fi
	`;
	const proc = spawn('/bin/bash', ['-c', script], {
		env: { ...process.env, DISPLAY: display },
		stdio: 'ignore'
	});
	proc.unref();
}

/**
 * Throw the latched spawn error if any of the service's child processes have
 * recorded one. Used by the per-service control-service start orchestrators
 * after each `await delay(...)` so a quietly-failed spawn surfaces before the
 * next step rather than at the readiness probe.
 */
export function throwIfSpawnError(get: () => Error | null): void {
	const err = get();
	if (err) throw err;
}

type LifecycleSignal = 'SIGTERM' | 'SIGINT' | 'exit';

/**
 * Build a once-only signal handler registrar bound to the given service
 * scope + tear-down callback. Replaces the copy-paste-evolved
 * `registerShutdownHandler` triplet that every VNC control-service used to
 * own. Defaults to `SIGTERM` + `SIGINT`; webtak adds `exit` to clean up its
 * Chromium profile dir.
 */
export function createVncShutdownHandler(
	scope: string,
	killAll: () => Promise<void>,
	signals: readonly LifecycleSignal[] = ['SIGTERM', 'SIGINT']
): () => void {
	let registered = false;
	return () => {
		if (registered) return;
		registered = true;
		const handler = () => {
			logger.info(`[${scope}] received shutdown signal, tearing down stack`);
			void killAll();
		};
		for (const sig of signals) {
			process.once(sig, handler);
		}
	};
}

/**
 * Per-service spawn-error tracker. Replaces the copy-paste-evolved
 * `recordSpawnError`/`clearSpawnError`/`getSpawnError` triplet that each
 * VNC service used to ship.
 */
export function createSpawnErrorTracker(scope: string): {
	record: (label: string, err: Error) => void;
	clear: () => void;
	get: () => Error | null;
} {
	let spawnError: Error | null = null;
	return {
		record(label, err) {
			logger.error(`[${scope}] ${label} error`, { error: err.message });
			if (!spawnError) spawnError = new Error(`${label}: ${err.message}`);
		},
		clear() {
			spawnError = null;
		},
		get() {
			return spawnError;
		}
	};
}

export interface WebsockifyOptions {
	wsPort: number;
	vncPort: number;
}

/** Spawn websockify to bridge a VNC TCP port to a WebSocket. */
export function spawnWebsockify(opts: WebsockifyOptions, callbacks: SpawnCallbacks): ChildProcess {
	return spawnDetached(
		resolveWebsockifyBin(),
		[String(opts.wsPort), `localhost:${opts.vncPort}`],
		'websockify',
		callbacks
	);
}

/**
 * Send a signal to a child process, preferring the process group (negative
 * pid) so detached spawn'd children don't orphan their own descendants.
 * Falls back to the direct pid send, then silently swallows ESRCH on
 * already-dead processes.
 */
function sendSignal(ref: ChildProcess, signal: NodeJS.Signals): void {
	const pid = ref.pid;
	if (pid == null) return;
	try {
		process.kill(-pid, signal);
	} catch {
		try {
			ref.kill(signal);
		} catch {
			/* already dead */
		}
	}
}

/**
 * Send SIGTERM, wait 500ms, then SIGKILL any process that hasn't exited.
 *
 * Uses `ref.exitCode === null` rather than `ref.killed` because Node sets
 * `killed=true` the moment a signal is *sent* successfully — long before the
 * child actually exits — so checking `killed` would skip the SIGKILL escalation.
 */
export async function killVncProcess(
	ref: ChildProcess | null,
	name: string,
	scope: string
): Promise<void> {
	if (!ref || ref.pid == null) return;
	if (ref.exitCode !== null) return;
	sendSignal(ref, 'SIGTERM');
	await delay(500);
	if (ref.exitCode === null) sendSignal(ref, 'SIGKILL');
	logger.info(`[${scope}] killed process`, { name });
}

/** Probe whether a TCP port on localhost is accepting connections. */
export function isPortOpen(port: number, timeoutMs = 1000): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = netConnect({ host: 'localhost', port });
		const done = (ok: boolean) => {
			socket.destroy();
			resolve(ok);
		};
		socket.setTimeout(timeoutMs);
		socket.once('connect', () => done(true));
		socket.once('error', () => done(false));
		socket.once('timeout', () => done(false));
	});
}

/**
 * Non-fatal fuser-kill of anything bound to the given TCP ports. Failures
 * (port not bound) are swallowed — fuser exits non-zero when nothing matches.
 */
export async function killOrphansByPort(...ports: number[]): Promise<void> {
	try {
		await execFileAsync('/usr/bin/fuser', ['-k', ...ports.map((p) => `${p}/tcp`)]);
	} catch {
		/* fuser exits non-zero when nothing to kill — that's fine */
	}
}

/**
 * Probe whether websockify is responding on a given WebSocket port. Any HTTP
 * status (websockify returns 405 for HEAD) counts as alive.
 */
export async function isWebsockifyResponding(wsPort: number): Promise<boolean> {
	try {
		const res = await fetch(`http://localhost:${wsPort}/`, {
			method: 'HEAD',
			signal: AbortSignal.timeout(1000)
		});
		return res.status > 0;
	} catch {
		return false;
	}
}

/**
 * Poll every 200ms until both the VNC TCP port and websockify HTTP port are
 * accepting connections. Returns false on timeout.
 */
export async function waitForStackReady(
	vncPort: number,
	wsPort: number,
	maxAttempts = 25
): Promise<boolean> {
	for (let i = 0; i < maxAttempts; i++) {
		const [vncOk, wsOk] = await Promise.all([
			isPortOpen(vncPort),
			isWebsockifyResponding(wsPort)
		]);
		if (vncOk && wsOk) return true;
		await delay(200);
	}
	return false;
}
