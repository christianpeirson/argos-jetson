/**
 * High-level start/stop/status orchestration for the GNU Radio VNC stack.
 *
 * Mirrors wireshark-vnc-control-service.ts. The optional `flowgraph` path is
 * validated (must be absolute, end in .grc, exist on disk if running);
 * mock spawn in tests bypasses the disk check via NODE_ENV=test / VITEST.
 */

import { existsSync, statSync } from 'fs';
import { resolve as resolvePath } from 'path';

import { logger } from '$lib/utils/logger';

import { createVncShutdownHandler } from '../vnc-common/spawn-helpers';
import {
	getCurrentFlowgraph,
	isAnyProcessAlive,
	killAllProcesses,
	spawnGnuRadioCompanion,
	spawnGrcMaximizer,
	spawnWebsockify,
	spawnWindowManager,
	spawnXtigervnc
} from './gnu-radio-vnc-processes';
import {
	GNU_RADIO_WS_PATH,
	GNU_RADIO_WS_PORT,
	type GnuRadioVncControlResult,
	type GnuRadioVncStatusResult
} from './gnu-radio-vnc-types';

function isTestEnv(): boolean {
	return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
}

function validateFlowgraph(path: string): string | null {
	const resolved = resolvePath(path);
	if (!resolved.endsWith('.grc')) return 'flowgraph path must end in .grc';
	if (isTestEnv()) return null;
	if (!existsSync(resolved)) return `flowgraph file not found: ${resolved}`;
	if (!statSync(resolved).isFile()) return `flowgraph path is not a regular file: ${resolved}`;
	return null;
}

function buildAlreadyRunningResult(): GnuRadioVncControlResult {
	return {
		success: true,
		message: 'GNU Radio VNC stack already running',
		wsPort: GNU_RADIO_WS_PORT,
		wsPath: GNU_RADIO_WS_PATH,
		flowgraph: getCurrentFlowgraph() ?? undefined
	};
}

function buildStartedResult(resolvedFlowgraph: string | undefined): GnuRadioVncControlResult {
	return {
		success: true,
		message: 'GNU Radio VNC stack started',
		wsPort: GNU_RADIO_WS_PORT,
		wsPath: GNU_RADIO_WS_PATH,
		flowgraph: resolvedFlowgraph
	};
}

function resolveFlowgraphOrError(flowgraph: string | undefined): {
	resolved: string | undefined;
	error: GnuRadioVncControlResult | null;
} {
	if (!flowgraph) return { resolved: undefined, error: null };
	const err = validateFlowgraph(flowgraph);
	if (err) {
		return {
			resolved: undefined,
			error: { success: false, message: 'invalid flowgraph', error: err }
		};
	}
	return { resolved: resolvePath(flowgraph), error: null };
}

async function performStartup(resolvedFlowgraph: string | undefined): Promise<Error | null> {
	try {
		spawnXtigervnc();
		await new Promise((r) => setTimeout(r, 250));
		// Window manager spawned BEFORE the GUI app so client decorations
		// (titlebar/resize handles) are negotiated correctly via _NET_FRAME_EXTENTS
		// at the first map. Order matters: openbox must claim the root window
		// before gnuradio-companion creates its top-level.
		spawnWindowManager();
		await new Promise((r) => setTimeout(r, 250));
		spawnWebsockify();
		spawnGnuRadioCompanion(resolvedFlowgraph);
		// Detached, polls in background; falls back silently if wmctrl missing.
		spawnGrcMaximizer();
		return null;
	} catch (err) {
		return err instanceof Error ? err : new Error(String(err));
	}
}

// Reap the VNC stack on Argos server shutdown (SIGTERM/SIGINT). The view no
// longer stops GNU Radio on navigation — only the Stop button does — so without
// this the stack would orphan when the server restarts. Idempotent.
const registerShutdownHandler = createVncShutdownHandler('gnu-radio-vnc', killAllProcesses);

export async function startGnuRadioVnc(flowgraph?: string): Promise<GnuRadioVncControlResult> {
	registerShutdownHandler();
	if (isAnyProcessAlive()) return buildAlreadyRunningResult();

	const { resolved, error } = resolveFlowgraphOrError(flowgraph);
	if (error) return error;

	const startupErr = await performStartup(resolved);
	if (startupErr) {
		logger.error('GRC VNC spawn failed', { error: startupErr.message });
		await killAllProcesses();
		return {
			success: false,
			message: 'failed to start GNU Radio VNC stack',
			error: startupErr.message
		};
	}

	return buildStartedResult(resolved);
}

export async function stopGnuRadioVnc(): Promise<GnuRadioVncControlResult> {
	if (!isAnyProcessAlive() && !getCurrentFlowgraph()) {
		return { success: true, message: 'GNU Radio VNC stack already stopped' };
	}
	await killAllProcesses();
	return { success: true, message: 'GNU Radio VNC stack stopped' };
}

export function getGnuRadioVncStatus(): GnuRadioVncStatusResult {
	const running = isAnyProcessAlive();
	return {
		success: true,
		isRunning: running,
		status: running ? 'active' : 'inactive',
		wsPort: GNU_RADIO_WS_PORT,
		wsPath: GNU_RADIO_WS_PATH,
		flowgraph: getCurrentFlowgraph()
	};
}
