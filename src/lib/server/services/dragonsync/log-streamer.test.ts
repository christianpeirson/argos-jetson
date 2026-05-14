/**
 * Smoke test for log-streamer.ts — the file was recovered from git history
 * (commit a3e1e146^, one before the fallow PR #108 cleanup that incorrectly
 * deleted it). This test exists primarily to satisfy the Danger "tests
 * required for src/lib/server/** changes" gate, but also pins the public
 * surface so a future cleanup pass can detect that the export is in use
 * (which fallow's earlier audit missed because the consumer at
 * src/routes/api/dragonsync/logs/+server.ts imports via $lib/... alias).
 *
 * Does NOT exercise the actual journalctl spawn — that requires a host with
 * systemd + the dragonsync/zmq-decoder/wardragon-fpv-detect/argos-c2-scanner
 * units installed and running, which CI doesn't have. Real lifecycle is
 * exercised manually via `curl :5174/api/dragonsync/logs` against a live
 * Jetson with the UAS Phase 2 stack online.
 */

import { describe, expect, it } from 'vitest';

import { createLogStream } from './log-streamer';

describe('log-streamer', () => {
	it('createLogStream is exported and returns a ReadableStream', () => {
		// Use an already-aborted signal so the stream tears down immediately
		// without actually spawning journalctl.
		const ac = new AbortController();
		ac.abort();
		const stream = createLogStream(ac.signal);
		expect(stream).toBeInstanceOf(ReadableStream);
	});

	it('createLogStream signature requires an AbortSignal', () => {
		// Compile-time guard: pass a fresh signal, verify return type by usage.
		const ac = new AbortController();
		const stream = createLogStream(ac.signal);
		expect(typeof stream.getReader).toBe('function');
		ac.abort();
	});
});
