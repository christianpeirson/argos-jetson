<!--
  Spec-024 PR9a-2 — peak-hold spectrum graph.

  Renders the current FFT row as a polyline plus a slowly-decaying
  peak-hold trace. SVG path generation runs on each new frame; we keep
  the polyline simple (single d-attribute string) so Svelte's reactivity
  cheaply rebinds without re-creating any DOM children.

  No state of our own — pure projection of `frame.power` + `peakHold`
  passed from parent. Empty/loading states surface as a greyed-out
  baseline so the panel is never blank.

  Frequency axis labels are rendered every 4 MHz across the visible
  band; dB scale on the left at minDb / midDb / maxDb.
-->
<script lang="ts">
	import type { SpectrumFrame } from '$lib/types/spectrum';

	interface Props {
		frame: SpectrumFrame | null;
		peakHold: Float32Array | null;
		minDb?: number;
		maxDb?: number;
	}

	const { frame, peakHold, minDb = -90, maxDb = -20 }: Props = $props();

	const W = 800;
	const H = 220;
	const PAD_L = 36;
	const PAD_R = 8;
	const PAD_T = 6;
	const PAD_B = 18;
	const plotW = W - PAD_L - PAD_R;
	const plotH = H - PAD_T - PAD_B;

	const livePath = $derived(buildPath(frame?.power ?? null));
	const peakPath = $derived(buildPath(peakHold));
	const tickLabels = $derived(buildFreqTicks(frame));
	const dbLabels = $derived([maxDb, Math.round((maxDb + minDb) / 2), minDb]);

	// Single-bin frames (n=1) would divide-by-zero on (n-1); render as a
	// flat 2-px dot at the midpoint so the trace stays visible.
	function singleBinPath(v: number): string {
		const range = maxDb - minDb;
		const norm = Math.max(0, Math.min(1, (v - minDb) / range));
		const x = PAD_L + plotW / 2;
		const y = PAD_T + (1 - norm) * plotH;
		return `M${x.toFixed(1)},${y.toFixed(1)} l1,0`;
	}

	function pointsPath(values: readonly number[] | Float32Array, stepX: number): string {
		const range = maxDb - minDb;
		let d = '';
		for (let i = 0; i < values.length; i += 1) {
			const v = values[i];
			const norm = Math.max(0, Math.min(1, (v - minDb) / range));
			const x = PAD_L + i * stepX;
			const y = PAD_T + (1 - norm) * plotH;
			d += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`;
		}
		return d;
	}

	function buildPath(values: readonly number[] | Float32Array | null): string {
		if (!values || values.length === 0) return '';
		const n = values.length;
		if (n === 1) return singleBinPath(values[0]);
		return pointsPath(values, plotW / (n - 1));
	}

	function buildFreqTicks(f: SpectrumFrame | null): { x: number; label: string }[] {
		if (!f) return [];
		const span = f.endFreq - f.startFreq;
		if (span <= 0) return [];
		const out: { x: number; label: string }[] = [];
		// 5 ticks evenly across the span.
		for (let i = 0; i < 5; i += 1) {
			const k = i / 4;
			const hz = f.startFreq + span * k;
			out.push({
				x: PAD_L + k * plotW,
				label: `${(hz / 1e6).toFixed(0)}M`
			});
		}
		return out;
	}
</script>

<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-label="Live spectrum graph">
	<!-- Plot frame -->
	<rect
		x={PAD_L}
		y={PAD_T}
		width={plotW}
		height={plotH}
		fill="var(--mk2-bg-2)"
		stroke="var(--mk2-line)"
	/>

	<!-- dB grid lines -->
	{#each [0.25, 0.5, 0.75] as k (k)}
		<line
			x1={PAD_L}
			x2={PAD_L + plotW}
			y1={PAD_T + k * plotH}
			y2={PAD_T + k * plotH}
			stroke="var(--mk2-line)"
			stroke-dasharray="2 4"
			opacity="0.4"
		/>
	{/each}

	<!-- dB axis labels (left) -->
	{#each dbLabels as db, i (db)}
		<text
			x={PAD_L - 4}
			y={PAD_T + (i / (dbLabels.length - 1)) * plotH + 3}
			text-anchor="end"
			font-size="9"
			fill="var(--mk2-ink-3)">{db}</text
		>
	{/each}

	<!-- Frequency ticks (bottom) -->
	{#each tickLabels as t (t.label)}
		<line
			x1={t.x}
			x2={t.x}
			y1={PAD_T + plotH}
			y2={PAD_T + plotH + 3}
			stroke="var(--mk2-ink-4)"
		/>
		<text
			x={t.x}
			y={PAD_T + plotH + 14}
			text-anchor="middle"
			font-size="9"
			fill="var(--mk2-ink-3)">{t.label}</text
		>
	{/each}

	<!-- Peak-hold trace (subtle, below live) -->
	{#if peakPath}
		<path
			d={peakPath}
			stroke="var(--mk2-amber-dim)"
			stroke-width="1"
			fill="none"
			opacity="0.7"
		/>
	{/if}

	<!-- Live trace -->
	{#if livePath}
		<path d={livePath} stroke="var(--mk2-accent)" stroke-width="1.2" fill="none" />
	{:else}
		<text
			x={W / 2}
			y={PAD_T + plotH / 2}
			text-anchor="middle"
			font-size="11"
			fill="var(--mk2-ink-4)"
			font-family="var(--mk2-f-mono)">— no signal —</text
		>
	{/if}
</svg>

<style>
	svg {
		width: 100%;
		height: 100%;
		display: block;
		font-family: var(--mk2-f-mono);
	}
</style>
