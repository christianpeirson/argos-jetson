<script lang="ts">
	import ContentSwitcher from '$lib/components/chassis/forms/ContentSwitcher.svelte';
	import RfRangeReadout from '$lib/components/chassis/forms/RfRangeReadout.svelte';
	import { spectrumConfigStore, spectrumRuntime } from '$lib/state/spectrum.svelte';
	import type { GainConfig } from '$lib/types/spectrum';

	export type SpectrumMode = 'peak' | 'avg' | 'live';

	interface Props {
		mode: SpectrumMode;
		onModeChange: (next: SpectrumMode) => void;
		onSweep?: () => void;
		onHold?: () => void;
		onCapture?: () => void;
	}

	const { mode, onModeChange, onSweep, onHold, onCapture }: Props = $props();

	const MODE_OPTIONS = [{ text: 'PEAK' }, { text: 'AVG' }, { text: 'LIVE' }];
	const MODE_INDEX: Record<SpectrumMode, number> = { peak: 0, avg: 1, live: 2 };
	const INDEX_TO_MODE: SpectrumMode[] = ['peak', 'avg', 'live'];

	const cfg = $derived(spectrumConfigStore.value);
	const startMhz = $derived((cfg.startFreq / 1e6).toFixed(3));
	const stopMhz = $derived((cfg.endFreq / 1e6).toFixed(3));
	const rbwKhz = $derived((cfg.binWidth / 1000).toFixed(1));

	function gainAmp(g: GainConfig): string {
		if (g.kind !== 'hackrf') return '—';
		return g.amp ? 'ON' : 'OFF';
	}

	function gainLna(g: GainConfig): string {
		if (g.kind !== 'hackrf') return '—';
		return String(g.lna);
	}

	function gainVga(g: GainConfig): string {
		if (g.kind !== 'hackrf') return '—';
		return String(g.vga);
	}

	const isStreaming = $derived(spectrumRuntime.sourceState === 'streaming');
</script>

<header class="sweep-bar" aria-label="Sweep control">
	<div class="bar-title">
		<span class="bar-tag">CTL-01</span>
		<span class="bar-name">SWEEP CONTROL</span>
		<span class="bar-meta">HACKRF · {isStreaming ? 'STREAMING' : 'IDLE'}</span>
	</div>

	<div class="bar-actions" role="group" aria-label="Sweep actions">
		<button type="button" class="btn primary" onclick={onSweep} disabled={isStreaming}
			>SWEEP</button
		>
		<button type="button" class="btn" onclick={onHold} disabled={!isStreaming}>HOLD</button>
		<button type="button" class="btn danger" onclick={onCapture}>CAPTURE</button>
	</div>

	<div class="bar-divider" aria-hidden="true"></div>

	<div class="bar-readouts">
		<RfRangeReadout label="START" value={startMhz} unit="MHz" />
		<RfRangeReadout label="STOP" value={stopMhz} unit="MHz" />
		<RfRangeReadout label="RBW" value={rbwKhz} unit="kHz" />
		<RfRangeReadout label="LNA" value={gainLna(cfg.gain)} unit="dB" />
		<RfRangeReadout label="VGA" value={gainVga(cfg.gain)} unit="dB" />
		<RfRangeReadout label="AMP" value={gainAmp(cfg.gain)} />
	</div>

	<div class="bar-mode" aria-label="Display mode">
		<span class="mode-label">MODE</span>
		<ContentSwitcher
			options={MODE_OPTIONS}
			selectedIndex={MODE_INDEX[mode]}
			size="sm"
			onChange={(idx) => onModeChange(INDEX_TO_MODE[idx] ?? 'peak')}
		/>
	</div>
</header>

<style>
	.sweep-bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 14px;
		padding: 8px 12px;
		background: var(--mk2-bg-2);
		border: 1px solid var(--mk2-line);
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
	}

	.bar-title {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.bar-tag {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-accent);
		letter-spacing: 0.12em;
	}

	.bar-name {
		font-size: var(--mk2-fs-3);
		letter-spacing: 0.1em;
	}

	.bar-meta {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.06em;
	}

	.bar-actions {
		display: flex;
		gap: 6px;
	}

	.btn {
		font-family: var(--mk2-f-mono);
		font-size: var(--mk2-fs-2);
		letter-spacing: 0.08em;
		padding: 4px 10px;
		background: transparent;
		color: var(--mk2-ink);
		border: 1px solid var(--mk2-line-2);
		cursor: pointer;
		text-transform: uppercase;
	}

	.btn:hover:not(:disabled) {
		border-color: var(--mk2-accent);
	}

	.btn.primary {
		background: var(--mk2-accent);
		color: var(--mk2-bg);
		border-color: var(--mk2-accent);
	}

	.btn.danger {
		color: var(--mk2-red);
		border-color: var(--mk2-red);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.bar-divider {
		height: 20px;
		width: 1px;
		background: var(--mk2-line-2);
	}

	.bar-readouts {
		display: flex;
		gap: 18px;
		align-items: center;
		flex-wrap: wrap;
	}

	.bar-mode {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-left: auto;
	}

	.mode-label {
		font-size: var(--mk2-fs-1);
		color: var(--mk2-ink-3);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
</style>
