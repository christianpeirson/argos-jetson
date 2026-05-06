/**
 * WebSocket broadcasts + child-process event wiring for Blue Dragon.
 *
 * `broadcastStatus` fans out via `WebSocketManager` every status transition
 * so the UI status LED stays in sync. Process listeners route to
 * `handleProcessExit`, which clears runtime state and broadcasts the
 * 'stopped' transition.
 *
 * @module
 */

import type { ChildProcess } from 'node:child_process';

import { errMsg } from '$lib/server/api/error-utils';
import { env } from '$lib/server/env';
import { WebSocketManager } from '$lib/server/kismet/web-socket-manager';
import type { BluetoothDevice } from '$lib/types/bluedragon';
import { logger } from '$lib/utils/logger';

import { PcapStreamParser } from './pcap-stream-parser';
import { cleanupFifo, clearPidFile } from './pid-fifo';
import { getBluedragonStatusSync, state } from './state';

const BD_PCAP_PATH = env.BD_PCAP_PATH;
const PARSER_START_DELAY_MS = 1000;

export function broadcastDevice(op: 'upsert' | 'remove', device: BluetoothDevice): void {
	WebSocketManager.getInstance().broadcast({
		type: 'bluetooth_device_update',
		data: { op, device: device as unknown as Record<string, unknown> },
		timestamp: new Date().toISOString()
	});
}

export function broadcastStatus(): void {
	const status = getBluedragonStatusSync();
	WebSocketManager.getInstance().broadcast({
		type: 'bluetooth_status_update',
		data: status as unknown as Record<string, unknown>,
		timestamp: new Date().toISOString()
	});
}

export function attachProcessListeners(proc: ChildProcess): void {
	proc.stdout?.on('data', (chunk) => {
		const text = chunk.toString().trim();
		if (text) logger.debug('[bluedragon] stdout', { text: text.slice(0, 200) });
	});

	proc.stderr?.on('data', (chunk) => {
		const text = chunk.toString().trim();
		if (text) logger.debug('[bluedragon] stderr', { text: text.slice(0, 200) });
	});

	proc.on('exit', (code, signal) => {
		logger.info('[bluedragon] Process exited', { code, signal });
		handleProcessExit();
	});

	proc.on('error', (err) => {
		logger.error('[bluedragon] Process error', { err: errMsg(err) });
		handleProcessExit();
	});
}

function startParser(): void {
	if (!state.aggregator) return;
	const parser = new PcapStreamParser({
		pcapPath: BD_PCAP_PATH,
		onFrame: (frame) => state.aggregator?.ingest(frame),
		onError: (err) => logger.error('[bluedragon] Parser error', { err: String(err) }),
		onExit: (code) => logger.info('[bluedragon] Parser exited', { code })
	});
	parser.start();
	state.parser = parser;
	logger.info('[bluedragon] Parser attached');
}

/** Schedule the pcap parser to attach after the blue-dragon child has had
 * time to open the FIFO for writing. */
export function scheduleParserStart(): void {
	state.parserStartTimer = setTimeout(() => {
		if (state.status === 'starting' || state.status === 'running') startParser();
	}, PARSER_START_DELAY_MS);
}

/** Tear down runtime state after the process exits (from exit handler or
 * deliberate stop). Idempotent. */
function handleProcessExit(): void {
	clearRuntimeState();
	broadcastStatus();
}

/** Drop refs, stop parser/aggregator, clean FIFO + PID file. */
export function clearRuntimeState(): void {
	if (state.parserStartTimer) {
		clearTimeout(state.parserStartTimer);
		state.parserStartTimer = null;
	}
	state.parser?.stop();
	state.parser = null;
	state.aggregator?.stop();
	state.aggregator = null;
	state.process = null;
	state.pid = null;
	state.startedAt = null;
	state.profile = null;
	state.options = null;
	state.status = 'stopped';
	cleanupFifo();
	clearPidFile();
}
