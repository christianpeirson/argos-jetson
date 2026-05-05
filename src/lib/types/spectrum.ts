/**
 * Spec-024 PR9a-2 — client-side spectrum types.
 *
 * Mirrors the wire-shape that the server emits over `/api/spectrum/stream`
 * SSE, but lives in the `types` layer so client code (state stores,
 * components) can import without crossing the `state ↛ server` boundary
 * enforced by `.sentrux/rules.toml`.
 *
 * Server-side shapes in `src/lib/server/spectrum/types.ts` are
 * structurally identical; we don't enforce nominal type-equality here
 * because the SSE payload arrives as plain JSON and is validated by
 * shape, not identity.
 *
 * The `SpectrumDevice` string-literal union deliberately matches
 * `DeviceTypeSchema` from `src/lib/schemas/rf.ts` minus the legacy
 * `'auto'` value — the active device is always concrete on the client
 * once a stream is up.
 *
 * @module
 */

export type SpectrumDevice = 'hackrf' | 'b205';

/**
 * One row of an FFT sweep — produced by the active SDR backend, consumed
 * by the spectrum SSE proxy and the waterfall renderer.
 */
export interface SpectrumFrame {
	readonly device: SpectrumDevice | string; // server may emit numeric enum during PR9a; tolerate both
	readonly startFreq: number; // Hz
	readonly endFreq: number; // Hz
	readonly binWidth: number; // Hz
	readonly power: readonly number[]; // dB per bin
	readonly timestamp: number; // ms since epoch
}

/**
 * Per-device gain knobs — discriminated union so device-specific tuning
 * stays type-safe across the wire and in the UI form switcher.
 *
 * HackRF ranges per `hackrf_sweep -h`:
 *   - amp: 0 or 1   (RX RF amplifier on/off)
 *   - lna: 0–40 dB  (RX LNA / IF gain, 8 dB steps)
 *   - vga: 0–62 dB  (RX VGA / baseband gain, 2 dB steps)
 *
 * B205 ranges per UHD `multi_usrp::set_rx_gain`:
 *   - rxGain:    0–76 dB nominal (AD9364; query device via
 *                `usrp.get_rx_gain_range()` for exact bounds)
 *   - bandwidth: optional Hz; defaults track sample rate
 */
export type GainConfig =
	| { readonly kind: 'hackrf'; readonly amp: 0 | 1; readonly lna: number; readonly vga: number }
	| { readonly kind: 'b205'; readonly rxGain: number; readonly bandwidth?: number };

/**
 * Sweep configuration accepted by `SpectrumSource.start()` (and the
 * `/api/spectrum/start` endpoint that forwards into it).
 *
 * - `startFreq` / `endFreq`: in Hz (1e6 – 6e9 valid for both HackRF and
 *   B205, narrower for B205mini at 70e6 – 6e9).
 * - `binWidth`: in Hz (HackRF: 2445 – 5_000_000 per `hackrf_sweep -w`).
 * - `sampleRate`: B205-only; HackRF derives from `binWidth`.
 *
 * Source implementations validate device-specific bounds at `start()`
 * time and reject invalid configs with a typed error.
 */
export interface SpectrumConfig {
	readonly startFreq: number;
	readonly endFreq: number;
	readonly binWidth: number;
	readonly gain: GainConfig;
	readonly sampleRate?: number;
}

export type SourceState = 'idle' | 'starting' | 'streaming' | 'stopping' | 'error';

export interface SourceStatus {
	readonly device: SpectrumDevice | string;
	readonly state: SourceState;
	readonly config?: SpectrumConfig;
	readonly error?: string;
	readonly lastFrameAt?: number;
}

/** SSE `event: connected` payload — sent on stream open. */
export interface ConnectedPayload {
	readonly active: SpectrumDevice | string | null;
}

/** SSE `event: error` payload. */
export interface ErrorPayload {
	readonly message: string;
}

/** Default HackRF FM-band config — user override expected via UI. */
export const DEFAULT_HACKRF_CONFIG: SpectrumConfig = {
	startFreq: 88_000_000,
	endFreq: 108_000_000,
	binWidth: 100_000,
	gain: { kind: 'hackrf', amp: 0, lna: 32, vga: 20 }
};
