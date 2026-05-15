<script lang="ts">
	// spec-024 PR5c T031 — SENSORS region for OverviewScreen.
	//
	// Owns the polling + SSE wiring for the four tiles (sweep / devices /
	// GPS / system) and feeds each tile via the shared rolling-buffer
	// helper from $lib/state/sparkline-buffer. Every metric is sourced
	// from a real backend endpoint:
	//
	//   sweep    /api/rf/stream  (count `event:observation` per second)
	//   devices  /api/kismet/devices  (devices.length)
	//   gps      /api/gps/satellites  (satellites where used=true)
	//   system   /api/system/metrics  (cpu.usage %)
	//
	// When an endpoint is unreachable the tile's value stays null and the
	// tile renders the empty-state token "—". No mock data, no fallbacks.

	import { onDestroy, onMount } from 'svelte';

	import { METRIC_WINDOW, pushSample } from '$lib/utils/sparkline-buffer';

	import SensorTile from './SensorTile.svelte';

	// OTel/Jaeger scan (2026-05-15) showed these intervals were generating ~50
	// /api/system/metrics + ~30 /api/kismet/devices + ~30 /api/gps/position
	// requests/min from this single component, on top of the 12/min that
	// chassis.svelte.ts already runs. Bumped to halve the noise without
	// sacrificing perceived freshness.
	const POLL_MS = 5_000;
	const SYSTEM_POLL_MS = 3_000;
	const SWEEP_TICK_MS = 1_000;

	let sweepValue = $state<number | null>(null);
	let sweepSeries = $state<readonly number[]>([]);
	let sweepCount = 0;

	let devicesValue = $state<number | null>(null);
	let devicesSeries = $state<readonly number[]>([]);

	let gpsValue = $state<number | null>(null);
	let gpsSeries = $state<readonly number[]>([]);

	let systemValue = $state<number | null>(null);
	let systemSeries = $state<readonly number[]>([]);

	let sweepConnected = $state(false);
	let sweepLastError = $state<string | null>(null);

	let timers: ReturnType<typeof setInterval>[] = [];
	let sweepSource: EventSource | null = null;

	async function fetchJson<T>(url: string): Promise<T | null> {
		try {
			const r = await fetch(url, { headers: { accept: 'application/json' } });
			if (!r.ok) return null;
			return (await r.json()) as T;
		} catch {
			return null;
		}
	}

	async function pollDevices(): Promise<void> {
		const data = await fetchJson<{ devices?: unknown[] }>('/api/kismet/devices');
		const n = data?.devices?.length ?? null;
		devicesValue = n;
		if (n !== null) devicesSeries = pushSample(devicesSeries, n, METRIC_WINDOW);
	}

	async function pollGps(): Promise<void> {
		const data = await fetchJson<{ satellites?: { used: boolean }[] }>('/api/gps/satellites');
		const n = data?.satellites?.filter((s) => s.used).length ?? null;
		gpsValue = n;
		if (n !== null) gpsSeries = pushSample(gpsSeries, n, METRIC_WINDOW);
	}

	function readCpuUsage(data: { cpu?: { usage?: number } } | null): number | null {
		if (data === null) return null;
		const usage = data.cpu?.usage;
		return typeof usage === 'number' ? Math.round(usage) : null;
	}

	async function pollSystem(): Promise<void> {
		const data = await fetchJson<{ cpu?: { usage?: number } }>('/api/system/metrics');
		const v = readCpuUsage(data);
		systemValue = v;
		if (v !== null) systemSeries = pushSample(systemSeries, v, METRIC_WINDOW);
	}

	function startSweepStream(): void {
		const es = new EventSource('/api/rf/stream');
		es.addEventListener('open', () => {
			sweepConnected = true;
			sweepLastError = null;
		});
		es.addEventListener('error', () => {
			sweepConnected = false;
			sweepLastError = 'sse';
		});
		es.addEventListener('observation', () => {
			sweepCount += 1;
		});
		sweepSource = es;
	}

	function tickSweep(): void {
		const value = sweepCount;
		sweepCount = 0;
		sweepValue = value;
		sweepSeries = pushSample(sweepSeries, value, METRIC_WINDOW);
	}

	onMount(() => {
		void pollSystem();
		void pollDevices();
		void pollGps();
		startSweepStream();
		timers = [
			setInterval(() => void pollSystem(), SYSTEM_POLL_MS),
			setInterval(() => void pollDevices(), POLL_MS),
			setInterval(() => void pollGps(), POLL_MS),
			setInterval(tickSweep, SWEEP_TICK_MS)
		];
	});

	onDestroy(() => {
		for (const t of timers) clearInterval(t);
		timers = [];
		sweepSource?.close();
		sweepSource = null;
	});
</script>

<div class="sensors">
	<SensorTile
		label="SWEEP"
		value={sweepValue}
		unit="ev/s"
		sub={sweepConnected ? 'live' : (sweepLastError ?? 'idle')}
		series={sweepSeries}
		stale={!sweepConnected}
	/>
	<SensorTile
		label="DEVICES"
		value={devicesValue}
		unit="ct"
		sub="kismet"
		series={devicesSeries}
		stale={devicesValue === null}
	/>
	<SensorTile
		label="GPS"
		value={gpsValue}
		unit="sat"
		sub="used"
		series={gpsSeries}
		stale={gpsValue === null}
	/>
	<SensorTile
		label="SYSTEM"
		value={systemValue}
		unit="cpu%"
		sub="host"
		series={systemSeries}
		stale={systemValue === null}
	/>
</div>

<style>
	.sensors {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
		min-width: 0;
	}
</style>
