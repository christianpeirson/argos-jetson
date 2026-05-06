<!--
  Spec-024 PR9a-2 — Spectrum Analyzer screen composer.

  Top: peak-hold spectrum graph (Spectrum.svelte)
  Mid: scrolling waterfall (Waterfall.svelte)
  Side: control surface (SpectrumControls.svelte)

  Owns the EventSource lifecycle — opens on mount, closes on destroy,
  routes incoming `frame`/`status`/`error` events to spectrumRuntime.
  No render-path coupling: the runtime store is the single source of
  truth for all child components.
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import SpectrumSweepBar, {
		type SpectrumMode
	} from '$lib/components/mk2/spectrum/SpectrumSweepBar.svelte';
	import { spectrumRuntime } from '$lib/state/spectrum.svelte';
	import type {
		ConnectedPayload,
		ErrorPayload,
		SourceStatus,
		SpectrumFrame
	} from '$lib/types/spectrum';

	import Spectrum from './parts/Spectrum.svelte';
	import SpectrumControls from './parts/SpectrumControls.svelte';
	import Waterfall from './parts/Waterfall.svelte';

	let displayMode = $state<SpectrumMode>('peak');

	let source: EventSource | null = null;

	function safeParse<T>(raw: string): T | null {
		try {
			return JSON.parse(raw) as T;
		} catch {
			return null;
		}
	}

	function attach(es: EventSource): void {
		es.addEventListener('connected', (e) => {
			const p = safeParse<ConnectedPayload>((e as MessageEvent).data);
			if (!p) return;
			spectrumRuntime.setConnState(p.active === null ? 'idle' : 'streaming');
			spectrumRuntime.setError(null);
		});
		es.addEventListener('frame', (e) => {
			const f = safeParse<SpectrumFrame>((e as MessageEvent).data);
			if (!f || !Array.isArray(f.power) || f.power.length === 0) return;
			spectrumRuntime.ingestFrame(f);
		});
		es.addEventListener('status', (e) => {
			const s = safeParse<SourceStatus>((e as MessageEvent).data);
			if (!s) return;
			spectrumRuntime.setSourceState(s.state);
			if (s.error) spectrumRuntime.setError(s.error);
			else if (s.state !== 'error') spectrumRuntime.setError(null);
		});
		es.addEventListener('error', (e) => {
			const p = safeParse<ErrorPayload>((e as MessageEvent).data);
			spectrumRuntime.setError(p?.message ?? 'Unknown spectrum source error');
		});
		es.onerror = () => {
			spectrumRuntime.setError('EventSource connection failed');
		};
	}

	onMount(() => {
		source = new EventSource('/api/spectrum/stream');
		attach(source);
	});

	onDestroy(() => {
		source?.close();
		// Reset shared runtime state so a re-mount (route navigation back
		// to /dashboard/mk2/spectrum) starts in 'loading' rather than
		// inheriting the previous session's last-known device/state.
		spectrumRuntime.setConnState('loading');
		spectrumRuntime.setSourceState(null);
		spectrumRuntime.setError(null);
		spectrumRuntime.resetPeakHold();
	});
</script>

<section class="screen-spectrum">
	<SpectrumSweepBar mode={displayMode} onModeChange={(next) => (displayMode = next)} />
	<div class="content">
		<div class="left">
			<div class="graph">
				<Spectrum frame={spectrumRuntime.lastFrame} peakHold={spectrumRuntime.peakHold} />
			</div>
			<div class="waterfall">
				<Waterfall frame={spectrumRuntime.lastFrame} />
			</div>
		</div>
		<aside class="right">
			<SpectrumControls />
		</aside>
	</div>
</section>

<style>
	.screen-spectrum {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px;
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
	}
	.content {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 12px;
	}
	.left {
		display: grid;
		grid-template-rows: 1fr 1fr;
		gap: 12px;
		min-height: 0;
	}
	.graph,
	.waterfall {
		min-height: 0;
		min-width: 0;
		background: var(--mk2-bg-2);
		border: 1px solid var(--mk2-line);
	}
	.right {
		min-height: 0;
		overflow: auto;
	}
</style>
