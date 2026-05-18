<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import PanelStatus from '$lib/components/chassis/PanelStatus.svelte';
	import Button from '$lib/components/v3/ui/button/button.svelte';
	import { activeView } from '$lib/stores/dashboard/dashboard-store';

	import ToolViewWrapper from './ToolViewWrapper.svelte';
	import { buildWsUrl, type ServiceStatus } from './vnc-tool-view-helpers';
	import WebtakVncViewer from './webtak/webtak-vnc-viewer.svelte';

	let serviceStatus = $state<ServiceStatus>('checking');
	let errorMsg = $state('');
	let wsUrl = $state('');
	let vncKey = $state(0);
	let stopping = $state(false);

	// fallow-ignore-next-line complexity
	function applyStatusData(data: Record<string, unknown>): void {
		const isRunning = (data.running ?? data.isRunning) as boolean | undefined;
		const wsPortVal = data.wsPort as number | undefined;
		const wsPathVal = data.wsPath as string | undefined;
		if (isRunning && wsPortVal && wsPathVal) {
			wsUrl = buildWsUrl(wsPortVal, wsPathVal);
			serviceStatus = 'running';
		} else {
			serviceStatus = 'stopped';
		}
	}

	async function checkStatus(): Promise<void> {
		try {
			const res = await fetch('/api/sdrpp/control', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({ action: 'status' })
			});
			if (!res.ok) {
				serviceStatus = 'error';
				errorMsg = `Status check failed: ${res.status}`;
				return;
			}
			applyStatusData(await res.json());
		} catch {
			serviceStatus = 'error';
			errorMsg = 'Failed to check SDR++ status';
		}
	}

	function handleDisconnect(reason: string): void {
		if (reason === 'unclean') {
			serviceStatus = 'error';
			errorMsg = 'VNC connection lost';
		}
	}

	function reconnect(): void {
		vncKey++;
		serviceStatus = 'checking';
		checkStatus();
	}

	function goBack(): void {
		activeView.set('map');
	}

	// fallow-ignore-next-line complexity
	async function handleStop(): Promise<void> {
		if (stopping) return;
		stopping = true;
		try {
			const res = await fetch('/api/sdrpp/control', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({ action: 'stop' })
			});
			if (!res.ok) {
				serviceStatus = 'error';
				errorMsg = `Stop failed: ${res.status}`;
				return;
			}
			activeView.set('map');
		} catch (err) {
			serviceStatus = 'error';
			errorMsg = `Stop failed: ${err instanceof Error ? err.message : String(err)}`;
		} finally {
			stopping = false;
		}
	}

	onMount(() => {
		checkStatus();
	});

	onDestroy(() => {
		/* cleanup handled by VNC viewer */
	});
</script>

{#snippet stopAction()}
	<Button variant="outline" size="sm" onclick={handleStop} disabled={stopping}>
		{stopping ? 'Stopping…' : 'Stop'}
	</Button>
{/snippet}

<ToolViewWrapper title="SDR++ Spectrum Analyzer" onBack={goBack} actions={stopAction}>
	{#if serviceStatus === 'checking'}
		<PanelStatus state="loading" title="CONNECTING..." />
	{:else if serviceStatus === 'stopped'}
		<PanelStatus
			state="disabled"
			title="SDR++ UNAVAILABLE"
			detail="Start SDR++ from the tool card first."
		/>
	{:else if serviceStatus === 'error'}
		<PanelStatus
			state="error"
			title="CONNECTION FAILED"
			detail={errorMsg || 'Unknown error'}
			onRetry={reconnect}
		/>
	{:else}
		{#key vncKey}
			<WebtakVncViewer {wsUrl} onDisconnect={handleDisconnect} resizeSession={true} />
		{/key}
	{/if}
</ToolViewWrapper>
