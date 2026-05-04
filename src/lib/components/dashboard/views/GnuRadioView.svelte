<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import PanelStatus from '$lib/components/chassis/PanelStatus.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { activeView } from '$lib/stores/dashboard/dashboard-store';

	import ToolViewWrapper from './ToolViewWrapper.svelte';
	import WebtakVncViewer from './webtak/webtak-vnc-viewer.svelte';

	type ServiceStatus =
		| 'idle'
		| 'checking'
		| 'starting'
		| 'running'
		| 'stopped'
		| 'error'
		| 'disabled';

	let serviceStatus = $state<ServiceStatus>('idle');
	let errorMsg = $state('');
	let wsUrl = $state('');
	let currentFlowgraph = $state<string | null>(null);
	let vncKey = $state(0);
	let stopping = $state(false);
	// Set once handleStop issues POST('stop'); onDestroy skips its fallback when true.
	let stopSent = $state(false);

	function buildWsUrl(wsPort: number, wsPath: string): string {
		const host = window.location.hostname;
		const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
		return `${proto}://${host}:${wsPort}${wsPath}`;
	}

	function extractReason(data: Record<string, unknown>): string {
		const err = data.error as string | undefined;
		if (err) return err;
		const msg = data.message as string | undefined;
		return msg ?? '';
	}

	function isUnrecoverable(_reason: string): boolean {
		// No GNU Radio-specific unrecoverable error patterns to trap right now.
		return false;
	}

	function errorDetail(err: unknown): string {
		return err instanceof Error ? err.message : String(err);
	}

	function getRunningWsUrl(data: Record<string, unknown>): string | null {
		const isRunning = Boolean(data.isRunning ?? data.success);
		const wsPortVal = data.wsPort as number | undefined;
		const wsPathVal = data.wsPath as string | undefined;
		if (!isRunning || !wsPortVal || !wsPathVal) return null;
		return buildWsUrl(wsPortVal, wsPathVal);
	}

	function applyResultData(data: Record<string, unknown>): void {
		const url = getRunningWsUrl(data);
		if (url) {
			wsUrl = url;
			currentFlowgraph = (data.flowgraph as string | undefined) ?? null;
			serviceStatus = 'running';
			return;
		}
		const reason = extractReason(data);
		errorMsg = reason;
		serviceStatus = isUnrecoverable(reason) ? 'disabled' : 'stopped';
	}

	async function postControl(
		action: 'start' | 'stop' | 'status',
		flowgraph?: string
	): Promise<Response> {
		const body = flowgraph ? { action, flowgraph } : { action };
		return fetch('/api/gnuradio/control', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(body)
		});
	}

	async function startGrc(flowgraph?: string): Promise<void> {
		serviceStatus = 'starting';
		try {
			const res = await postControl('start', flowgraph);
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
				const reason = extractReason(body) || `Start failed: ${res.status}`;
				errorMsg = reason;
				serviceStatus = isUnrecoverable(reason) ? 'disabled' : 'error';
				return;
			}
			applyResultData(await res.json());
		} catch (err) {
			serviceStatus = 'error';
			errorMsg = `Failed to start GNU Radio: ${errorDetail(err)}`;
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
		void startGrc();
	}

	function goBack(): void {
		activeView.set('map');
	}

	async function handleStop(): Promise<void> {
		if (stopping) return;
		stopping = true;
		try {
			const res = await postControl('stop');
			if (!res.ok) {
				// Do NOT latch stopSent — leave onDestroy's fallback armed so
				// the stack still gets a teardown attempt when the user leaves.
				serviceStatus = 'error';
				errorMsg = `Stop failed: ${res.status}`;
				return;
			}
			stopSent = true;
			activeView.set('map');
		} catch (err) {
			serviceStatus = 'error';
			errorMsg = `Stop failed: ${errorDetail(err)}`;
		} finally {
			stopping = false;
		}
	}

	onMount(() => {
		void startGrc();
	});

	onDestroy(() => {
		// handleStop already issued the stop request; skip to avoid a redundant
		// kill-all against an already-torn-down stack.
		if (stopSent) return;
		void postControl('stop').catch(() => undefined);
	});
</script>

{#snippet stopAction()}
	<Button variant="outline" size="sm" onclick={handleStop} disabled={stopping}>
		{stopping ? 'Stopping…' : 'Stop'}
	</Button>
{/snippet}

<ToolViewWrapper title="GNU Radio Companion" onBack={goBack} actions={stopAction}>
	{#if serviceStatus === 'idle'}
		<div class="grc-status">
			<p class="status-label">GNU RADIO READY</p>
			<p class="status-detail">Flowgraph editor via noVNC…</p>
		</div>
	{:else if serviceStatus === 'checking' || serviceStatus === 'starting'}
		<PanelStatus
			state="loading"
			title={serviceStatus === 'starting' ? 'LAUNCHING GNU RADIO…' : 'CONNECTING…'}
			detail="Spawning Xtigervnc + GNU Radio Companion + websockify"
		/>
	{:else if serviceStatus === 'stopped'}
		<PanelStatus
			state="disconnected"
			title="GNU RADIO UNAVAILABLE"
			detail={errorMsg || 'Service not running'}
			onRetry={reconnect}
			retryLabel="START GRC"
		/>
	{:else if serviceStatus === 'disabled'}
		<PanelStatus
			state="disabled"
			title="GNU RADIO DISABLED"
			detail={errorMsg || 'Preflight failed'}
		/>
		<p class="status-hint">Resolve the issue above, then return to this view.</p>
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
		{#if currentFlowgraph}
			<div class="flowgraph-ribbon">
				<span>flowgraph: <code>{currentFlowgraph}</code></span>
			</div>
		{/if}
	{/if}
</ToolViewWrapper>

<style>
	.grc-status {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 0.5rem;
	}
	.status-label {
		font-family: 'Fira Code', monospace;
		font-size: 12px;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 1.2px;
	}
	.status-detail {
		font-family: 'Fira Code', monospace;
		font-size: 11px;
		color: var(--muted-foreground);
		max-width: 40rem;
		text-align: center;
	}
	.status-hint {
		font-family: 'Fira Code', monospace;
		font-size: 10px;
		color: var(--muted-foreground);
	}
	.flowgraph-ribbon {
		position: absolute;
		bottom: 0.5rem;
		left: 0.5rem;
		display: flex;
		gap: 1rem;
		padding: 0.25rem 0.5rem;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 3px;
		font-family: 'Fira Code', monospace;
		font-size: 10px;
		color: var(--muted-foreground);
	}
	.flowgraph-ribbon code {
		color: var(--primary);
	}
</style>
