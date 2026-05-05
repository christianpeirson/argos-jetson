<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import PanelStatus from '$lib/components/chassis/PanelStatus.svelte';
	import { activeView } from '$lib/stores/dashboard/dashboard-store';

	import ToolViewWrapper from './ToolViewWrapper.svelte';
	import { buildWsUrl, type ServiceStatus } from './vnc-tool-view-helpers';
	import WebtakVncViewer from './webtak/webtak-vnc-viewer.svelte';

	let serviceStatus = $state<ServiceStatus>('checking');
	let errorMsg = $state('');
	let wsUrl = $state('');
	let vncKey = $state(0);

	// fallow-ignore-next-line complexity
	function applyStatusData(data: Record<string, unknown>): void {
		const vnc = data.vnc as
			| { isRunning?: boolean; wsPort?: number; wsPath?: string }
			| undefined;
		if (vnc?.isRunning && vnc.wsPort && vnc.wsPath) {
			wsUrl = buildWsUrl(vnc.wsPort, vnc.wsPath);
			serviceStatus = 'running';
		} else {
			serviceStatus = 'stopped';
		}
	}

	async function checkStatus(): Promise<void> {
		try {
			const res = await fetch('/api/sparrow/control', {
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
			errorMsg = 'Failed to check Sparrow-WiFi status';
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

	onMount(() => {
		checkStatus();
	});

	onDestroy(() => {
		/* cleanup handled by VNC viewer */
	});
</script>

<ToolViewWrapper title="Sparrow WiFi" onBack={goBack}>
	{#if serviceStatus === 'checking'}
		<PanelStatus state="loading" title="CONNECTING..." />
	{:else if serviceStatus === 'stopped'}
		<PanelStatus
			state="disabled"
			title="SPARROW UNAVAILABLE"
			detail="Start Sparrow-WiFi from the tool card first."
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

<style>
</style>
