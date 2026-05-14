/**
 * DragonSync live log streamer — spawns `journalctl -f` for the three scan
 * services and exposes their stdout as an SSE-framed `ReadableStream`.
 *
 * Used by `/api/dragonsync/logs` to feed the UAS Scan View terminal.
 *
 * @module
 */

import { type ChildProcessByStdio, spawn } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';
import type { Readable } from 'node:stream';

import { logger } from '$lib/utils/logger';

type JournalctlProcess = ChildProcessByStdio<null, Readable, Readable>;

const JOURNALCTL_ARGS = [
	'journalctl',
	'-u',
	'dragonsync',
	'-u',
	'zmq-decoder',
	'-u',
	'wardragon-fpv-detect',
	'-u',
	'argos-c2-scanner',
	'-f',
	'--output=short-iso',
	'--no-pager'
];

const LINE_RATE_CAP_PER_SECOND = 200;
const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Create a Server-Sent-Events byte stream backed by `sudo journalctl -f` for
 * the DragonSync + zmq-decoder + wardragon-fpv-detect units.
 *
 * Caller is responsible for abort — when `signal.abort()` fires (e.g. the
 * HTTP client disconnected), the journalctl child is killed and the stream
 * closes cleanly.
 */
export function createLogStream(signal: AbortSignal): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();

	let child: JournalctlProcess | null = null;
	let rl: Interface | null = null;
	let heartbeat: ReturnType<typeof setInterval> | null = null;
	let linesThisSecond = 0;
	let rateWindowTimer: ReturnType<typeof setInterval> | null = null;

	return new ReadableStream<Uint8Array>({
		start(controller) {
			if (signal.aborted) {
				controller.close();
				return;
			}

			// Prefix with one comment so the browser commits headers immediately.
			controller.enqueue(encoder.encode(': log-stream connected\n\n'));

			// sudo is needed because journalctl for system units normally requires
			// root or the systemd-journal group. The sudoers drop-in grants the
			// Argos runtime user NOPASSWD for exactly this invocation.
			const proc: JournalctlProcess = spawn('sudo', JOURNALCTL_ARGS, {
				stdio: ['ignore', 'pipe', 'pipe']
			});
			child = proc;

			proc.on('error', (err) => {
				logger.error('[dragonsync/logs] journalctl spawn failed', { err });
				controller.enqueue(encoder.encode(`data: [stream error: ${err.message}]\n\n`));
				controller.close();
			});

			proc.on('exit', (code, sig) => {
				logger.info('[dragonsync/logs] journalctl exited', { code, sig });
				try {
					controller.close();
				} catch {
					// already closed
				}
			});

			// Line-split stdout so we can SSE-frame one line at a time.
			rl = createInterface({ input: proc.stdout });
			rl.on('line', (raw) => {
				// Server-side rate limiter: if a service floods (e.g. scanner startup),
				// drop excess within the current 1-s window so we don't starve the
				// event loop or blow the browser's memory.
				if (linesThisSecond >= LINE_RATE_CAP_PER_SECOND) return;
				linesThisSecond++;

				// SSE frame: `data:` per line, blank line terminator. Escape any
				// embedded newlines just in case (journalctl shouldn't emit any).
				const safe = raw.replace(/\r?\n/g, ' ');
				controller.enqueue(encoder.encode(`data: ${safe}\n\n`));
			});

			// Reset the rate window every second.
			rateWindowTimer = setInterval(() => {
				linesThisSecond = 0;
			}, 1000);

			// Also surface stderr (sudo errors, journalctl warnings) into the stream
			// prefixed as data so the operator sees the failure instead of silence.
			proc.stderr.on('data', (chunk: Buffer) => {
				const text = chunk.toString('utf8').trim();
				if (!text) return;
				controller.enqueue(encoder.encode(`data: [stderr] ${text}\n\n`));
			});

			// SSE keepalive comment so reverse proxies don't close the idle
			// connection. Comments are `:`-prefixed lines that the EventSource
			// client ignores.
			heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keepalive\n\n'));
				} catch {
					// stream is closing — nothing to do
				}
			}, HEARTBEAT_INTERVAL_MS);

			// Client disconnected (navigated away, browser closed, tab swapped
			// to non-scan view). Tear down the child and close the stream.
			signal.addEventListener(
				'abort',
				() => {
					logger.debug('[dragonsync/logs] client disconnected — cleaning up');
					cleanup();
					try {
						controller.close();
					} catch {
						// already closed
					}
				},
				{ once: true }
			);
		},
		cancel() {
			cleanup();
		}
	});

	function cleanup(): void {
		heartbeat = clearTimer(heartbeat);
		rateWindowTimer = clearTimer(rateWindowTimer);
		if (rl) {
			rl.close();
			rl = null;
		}
		if (child && !child.killed) {
			// SIGTERM gives sudo + journalctl time to clean up. If it lingers,
			// systemd will reap the orphan.
			child.kill('SIGTERM');
			child = null;
		}
	}

	function clearTimer(t: ReturnType<typeof setInterval> | null): null {
		if (t) clearInterval(t);
		return null;
	}
}
