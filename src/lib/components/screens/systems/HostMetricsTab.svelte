<script lang="ts">
	import InlineNotification from '$lib/components/chassis/forms/InlineNotification.svelte';
	import type { SystemInfo } from '$lib/types/system';
	import { bytesPerSecond, METRIC_WINDOW, pushSample } from '$lib/utils/sparkline-buffer';

	import DiskRow from './DiskRow.svelte';
	import MetricCard from './MetricCard.svelte';

	// 2026-05-15: bumped from 1200 → 3000 after Jaeger scan flagged
	// /api/system/metrics as the top idle-loop offender on Mk II.
	const POLL_METRICS_MS = 3000;
	const POLL_INFO_MS = 5000;
	const TEMP_ALARM_C = 85;
	const CPU_ALARM_PCT = 80;
	const BYTES_PER_GB = 1024 * 1024 * 1024;

	interface MetricsResponse {
		cpu: { usage: number; temperature?: number };
		memory: { percentage: number; used: number; total: number };
		disk: { percentage: number; used: number; total: number };
		network: { rx: number; tx: number; errors: number };
		timestamp: number;
	}

	interface NetSample {
		rx: number;
		tx: number;
		errors: number;
		t: number;
	}

	let cpuSeries = $state<readonly number[]>([]);
	let memSeries = $state<readonly number[]>([]);
	let netSeries = $state<readonly number[]>([]);
	let tempSeries = $state<readonly number[]>([]);
	let lastNet = $state<NetSample | null>(null);
	let info = $state<SystemInfo | null>(null);
	let lastError = $state<string | null>(null);
	let metricsSeq = 0;
	let infoSeq = 0;

	const cpuLast = $derived(cpuSeries.at(-1) ?? 0);
	const memLast = $derived(memSeries.at(-1) ?? 0);
	const netLast = $derived(netSeries.at(-1) ?? 0);
	const tempLast = $derived(tempSeries.at(-1) ?? 0);

	type TabState = 'loading' | 'default' | 'error';
	const tabState = $derived<TabState>(
		cpuSeries.length === 0 && info === null && lastError === null
			? 'loading'
			: lastError !== null && cpuSeries.length === 0
				? 'error'
				: 'default'
	);

	function deriveMbps(prev: NetSample | null, curr: NetSample): number {
		const prevSample = prev ? { bytes: prev.rx + prev.tx, t: prev.t } : null;
		return bytesPerSecond(prevSample, { bytes: curr.rx + curr.tx, t: curr.t });
	}

	function recordError(err: unknown): void {
		if (err instanceof Error && err.name === 'AbortError') return;
		lastError = err instanceof Error ? err.message : String(err);
	}

	function applyMetrics(m: MetricsResponse): void {
		cpuSeries = pushSample(cpuSeries, m.cpu.usage, METRIC_WINDOW);
		memSeries = pushSample(memSeries, m.memory.percentage, METRIC_WINDOW);
		tempSeries = pushSample(tempSeries, m.cpu.temperature ?? 0, METRIC_WINDOW);
		const sample: NetSample = {
			rx: m.network.rx,
			tx: m.network.tx,
			errors: m.network.errors,
			t: m.timestamp
		};
		netSeries = pushSample(netSeries, deriveMbps(lastNet, sample), METRIC_WINDOW);
		lastNet = sample;
		lastError = null;
	}

	async function fetchMetrics(signal: AbortSignal): Promise<void> {
		const seq = ++metricsSeq;
		try {
			const res = await fetch('/api/system/metrics', { signal });
			if (!res.ok) throw new Error(`metrics ${res.status}`);
			const m: MetricsResponse = await res.json();
			if (seq === metricsSeq) applyMetrics(m);
		} catch (err) {
			recordError(err);
		}
	}

	async function fetchInfo(signal: AbortSignal): Promise<void> {
		const seq = ++infoSeq;
		try {
			const res = await fetch('/api/system/info', { signal });
			if (!res.ok) throw new Error(`info ${res.status}`);
			const next = (await res.json()) as SystemInfo;
			if (seq === infoSeq) info = next;
		} catch (err) {
			recordError(err);
		}
	}

	$effect(() => {
		const ctrl = new AbortController();
		void fetchMetrics(ctrl.signal);
		void fetchInfo(ctrl.signal);
		const a = window.setInterval(() => void fetchMetrics(ctrl.signal), POLL_METRICS_MS);
		const b = window.setInterval(() => void fetchInfo(ctrl.signal), POLL_INFO_MS);
		return () => {
			window.clearInterval(a);
			window.clearInterval(b);
			ctrl.abort();
		};
	});

	function fmtPct(v: number): string {
		return `${v.toFixed(1)}%`;
	}

	function fmtMbps(v: number): string {
		return `${v.toFixed(1)} MB/s`;
	}

	function fmtTemp(v: number): string {
		return `${v.toFixed(1)}°C`;
	}

	function fmtGb(bytes: number): string {
		return `${(bytes / BYTES_PER_GB).toFixed(1)}`;
	}

	const cpuAlarm = $derived(cpuLast > CPU_ALARM_PCT);
	const tempAlarm = $derived(tempLast > TEMP_ALARM_C);
</script>

<div class="host-tab" data-state={tabState}>
	{#if tabState === 'loading'}
		<p class="loading mono" aria-live="polite">connecting to /api/system/metrics…</p>
	{:else if tabState === 'error'}
		<InlineNotification
			kind="error"
			title="cannot reach /api/system/metrics"
			subtitle={`${lastError}. Check ARGOS_API_KEY; retrying every ${POLL_METRICS_MS / 1000}s.`}
			hideCloseButton
			lowContrast
		/>
	{:else}
		<div class="metric-grid">
			<MetricCard
				label="CPU"
				value={fmtPct(cpuLast)}
				sub="{info?.cpu.model ?? '—'} · {info?.cpu.cores ?? '—'} cores"
				series={cpuSeries}
				color={cpuAlarm ? 'var(--mk2-red)' : 'var(--mk2-accent)'}
				alarm={cpuAlarm}
				ariaLabel="CPU usage trend"
			/>
			<MetricCard
				label="MEMORY"
				value={fmtPct(memLast)}
				sub={info ? `${fmtGb(info.memory.used)} / ${fmtGb(info.memory.total)} GB` : '—'}
				series={memSeries}
				color="var(--mk2-cyan)"
				ariaLabel="Memory usage trend"
			/>
			<MetricCard
				label="NETWORK"
				value={fmtMbps(netLast)}
				sub="rx+tx primary iface · errors {lastNet ? lastNet.errors : '—'}"
				series={netSeries}
				color="var(--mk2-green)"
				ariaLabel="Network throughput trend"
			/>
			<MetricCard
				label="CORE TEMP"
				value={fmtTemp(tempLast)}
				sub="thermal_zone0"
				series={tempSeries}
				color={tempAlarm ? 'var(--mk2-red)' : 'var(--mk2-amber)'}
				alarm={tempAlarm}
				ariaLabel="Core temperature trend"
			/>
		</div>

		<section class="disk-section">
			<header class="section-h">DISK USAGE</header>
			{#if info}
				<DiskRow name="/" usedBytes={info.storage.used} totalBytes={info.storage.total} />
			{:else}
				<p class="empty mono">awaiting first /api/system/info sample…</p>
			{/if}
		</section>

		{#if lastError}
			<InlineNotification
				kind="warning"
				title="last poll error"
				subtitle={lastError}
				hideCloseButton
				lowContrast
			/>
		{/if}
	{/if}
</div>

<style>
	.host-tab {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 14px;
		font: 500 var(--mk2-fs-3) / 1.3 var(--mk2-f-sans);
		color: var(--mk2-ink);
	}

	.mono {
		font-family: var(--mk2-f-mono);
		font-variant-numeric: tabular-nums;
	}

	.metric-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		background: var(--mk2-line);
		border-top: 1px solid var(--mk2-line);
		border-bottom: 1px solid var(--mk2-line);
	}

	.disk-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.section-h {
		font: 500 var(--mk2-fs-2) / 1 var(--mk2-f-mono);
		letter-spacing: 0.14em;
		color: var(--mk2-ink-4);
		padding-bottom: 6px;
		border-bottom: 1px solid var(--mk2-line);
		text-transform: uppercase;
	}

	.empty {
		font-size: var(--mk2-fs-2);
		color: var(--mk2-ink-4);
	}

	.loading {
		font-size: var(--mk2-fs-3);
		color: var(--mk2-ink-3);
	}
</style>
