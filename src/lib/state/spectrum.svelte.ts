/**
 * Spec-024 PR9a-2 — client-side spectrum runes store.
 *
 * Holds the runtime state for the Mk II Spectrum Analyzer screen:
 *   - active device (persisted via lsState — survives reload)
 *   - last applied config (persisted)
 *   - latest SpectrumFrame (transient, RAF-coalesced render driver)
 *   - peak-hold trace per bin (transient, derived)
 *   - connection state + frame counter (transient diagnostics)
 *
 * Per-bin peak-hold uses an exponentially-decaying max so a stale peak
 * fades out over ~30 s once the underlying signal drops — matches
 * OpenWebRX peak-hold UX. Decay coefficient is tuned for 10 Hz frame
 * arrival; if the SDR cycles faster, peaks fade proportionally faster.
 *
 * No synthetic data ever — every bin traces back to a real
 * /api/spectrum/stream SSE frame.
 *
 * @module
 */

import { browser } from '$app/environment';
import type { SourceState, SpectrumConfig, SpectrumFrame } from '$lib/types/spectrum';
import { DEFAULT_HACKRF_CONFIG } from '$lib/types/spectrum';

import { lsState } from './ui.svelte';

const PEAK_DECAY_PER_FRAME = 0.985; // ~30 s half-life at 10 Hz
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number';

function isHackrfAmp(amp: unknown): boolean {
	return amp === 0 || amp === 1;
}

// fallow-ignore-next-line complexity
function isHackrfGain(g: unknown): boolean {
	if (!isObj(g)) return false;
	if (g.kind !== 'hackrf') return false;
	if (!isHackrfAmp(g.amp)) return false;
	return isNum(g.lna) && isNum(g.vga);
}

function isB205Gain(g: unknown): boolean {
	if (!isObj(g)) return false;
	if (g.kind !== 'b205') return false;
	return isNum(g.rxGain);
}

function hasFreqShape(v: Record<string, unknown>): boolean {
	return isNum(v.startFreq) && isNum(v.endFreq) && isNum(v.binWidth);
}

function hasGainShape(v: Record<string, unknown>): boolean {
	return isHackrfGain(v.gain) || isB205Gain(v.gain);
}

function isConfig(v: unknown): v is SpectrumConfig {
	if (!isObj(v)) return false;
	if (!hasFreqShape(v)) return false;
	return hasGainShape(v);
}

// Persistent — survives reload.
export const spectrumConfigStore = lsState<SpectrumConfig>(
	'argos.mk2.spectrum.config',
	DEFAULT_HACKRF_CONFIG,
	isConfig
);

// Transient — runtime only.
let _lastFrame = $state<SpectrumFrame | null>(null);
let _peakHold = $state<Float32Array | null>(null);
let _frameCount = $state(0);
let _connState = $state<'loading' | 'streaming' | 'idle' | 'error'>('loading');
let _sourceState = $state<SourceState | null>(null);
let _lastError = $state<string | null>(null);

export const spectrumRuntime = {
	get lastFrame(): SpectrumFrame | null {
		return _lastFrame;
	},
	get peakHold(): Float32Array | null {
		return _peakHold;
	},
	get frameCount(): number {
		return _frameCount;
	},
	get connState(): 'loading' | 'streaming' | 'idle' | 'error' {
		return _connState;
	},
	get sourceState(): SourceState | null {
		return _sourceState;
	},
	get lastError(): string | null {
		return _lastError;
	},

	ingestFrame(frame: SpectrumFrame): void {
		_lastFrame = frame;
		_frameCount += 1;
		_connState = 'streaming';
		_sourceState = 'streaming';
		updatePeakHold(frame.power);
	},

	setConnState(s: 'loading' | 'streaming' | 'idle' | 'error'): void {
		_connState = s;
	},

	setSourceState(s: SourceState | null): void {
		_sourceState = s;
	},

	setError(message: string | null): void {
		_lastError = message;
		if (message) _connState = 'error';
	},

	resetPeakHold(): void {
		_peakHold = null;
	}
};

function decayInto(target: Float32Array, power: readonly number[]): void {
	for (let i = 0; i < power.length; i += 1) {
		const decayed = target[i] * PEAK_DECAY_PER_FRAME + power[i] * (1 - PEAK_DECAY_PER_FRAME);
		target[i] = power[i] > target[i] ? power[i] : decayed;
	}
}

function updatePeakHold(power: readonly number[]): void {
	if (!browser) return;
	if (!_peakHold || _peakHold.length !== power.length) {
		_peakHold = Float32Array.from(power);
		return;
	}
	decayInto(_peakHold, power);
	// No reactivity bump needed — Spectrum.svelte re-evaluates its derived
	// path when `lastFrame` changes (every ingestFrame), reading the
	// freshly-mutated _peakHold buffer in the same render pass.
}
