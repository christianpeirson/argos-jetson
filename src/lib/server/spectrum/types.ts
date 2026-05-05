/**
 * Spec-024 PR9a — multi-SDR spectrum abstraction types.
 *
 * `SpectrumSource` is the unified interface every SDR backend implements.
 * Consumers (the SSE proxy at /api/spectrum/stream, the MCP diagnostic
 * tools, the client `spectrum.svelte.ts` store) consume only this shape —
 * they never know whether the bins came from HackRF firmware FFT or B205
 * software FFT.
 *
 * The interface is event-emitter based to match Argos's existing
 * SweepManager pattern (src/lib/server/hackrf/sweep-manager.ts:41
 * `extends EventEmitter`). Implementations extend Node's `EventEmitter`
 * and emit `frame`, `status`, `error` events.
 *
 * Future-proof: adding a new SDR (RTL-SDR, LimeSDR, bladeRF) means a
 * new class implementing this interface + factory registration. UI and
 * SSE proxy stay untouched.
 *
 * Documented future escape hatch: `SoapySpectrumSource` over SoapySDR
 * subsumes per-device classes if we ever need 5+ SDRs. Not built now —
 * see https://github.com/pothosware/SoapySDR.
 *
 * @module
 */

import type { HardwareDevice } from '$lib/server/hardware/types';

/**
 * One row of an FFT sweep — produced by the active SDR backend, consumed
 * by the spectrum SSE proxy and the waterfall renderer.
 *
 * `power[]` is dB per bin (relative — see `power_ref` if absolute
 * calibration matters; v1 treats both backends as relative dB so the
 * colormap range is comparable across HackRF and B205).
 */
export interface SpectrumFrame {
	readonly device: HardwareDevice;
	readonly startFreq: number; // Hz
	readonly endFreq: number; // Hz
	readonly binWidth: number; // Hz
	readonly power: readonly number[]; // dB per bin
	readonly timestamp: number; // ms since epoch
}

// Wire-compatible shapes (GainConfig, SpectrumConfig, SourceState) live in
// `$lib/types/spectrum` so client code can import without crossing the
// `state ↛ server` sentrux boundary. Re-exported here so server modules
// continue importing them from the local `./types` they already reference.
import type { GainConfig, SourceState, SpectrumConfig } from '$lib/types/spectrum';

export type { GainConfig, SourceState, SpectrumConfig };

export interface SourceStatus {
	readonly device: HardwareDevice;
	readonly state: SourceState;
	readonly config?: SpectrumConfig;
	readonly error?: string;
	readonly lastFrameAt?: number;
}

/**
 * Unified async SDR source. Implementations extend Node's `EventEmitter`
 * and emit:
 *   - `frame`  → SpectrumFrame (one per FFT row)
 *   - `status` → SourceStatus  (state transitions + last-frame heartbeat)
 *   - `error`  → Error         (recoverable; unrecoverable bubble via Promise reject)
 *
 * Lifecycle: `start(config)` is idempotent — calling on a streaming
 * source re-applies the new config without restarting hardware where
 * possible. `stop()` cleans up child processes and releases the
 * `resourceManager` lock.
 */
export interface SpectrumSource {
	readonly device: HardwareDevice;
	start(config: SpectrumConfig): Promise<void>;
	stop(): Promise<void>;
	getStatus(): SourceStatus;

	on(event: 'frame', listener: (frame: SpectrumFrame) => void): this;
	on(event: 'status', listener: (status: SourceStatus) => void): this;
	on(event: 'error', listener: (err: Error) => void): this;

	off(event: 'frame', listener: (frame: SpectrumFrame) => void): this;
	off(event: 'status', listener: (status: SourceStatus) => void): this;
	off(event: 'error', listener: (err: Error) => void): this;

	removeAllListeners(event?: string): this;
}
