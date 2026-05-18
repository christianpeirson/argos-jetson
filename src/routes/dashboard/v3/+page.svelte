<!-- @constitutional-exemption Article-IV-4.3 issue:#11 — Component state handling (loading/error/empty UI) deferred to UX improvement phase -->
<script lang="ts">
	import '$lib/styles/dashboard.css';

	import { onDestroy, onMount } from 'svelte';

	import { browser } from '$app/environment';
	import AgentChatPanel from '$lib/components/v3/dashboard/AgentChatPanel.svelte';
	import DashboardMap from '$lib/components/v3/dashboard/DashboardMap.svelte';
	import DashboardShell from '$lib/components/v3/dashboard/DashboardShell.svelte';
	import GpConfigView from '$lib/components/v3/dashboard/globalprotect/GpConfigView.svelte';
	import LogsPanel from '$lib/components/v3/dashboard/LogsPanel.svelte';
	import PanelContainer from '$lib/components/v3/dashboard/PanelContainer.svelte';
	import BluetoothPanel from '$lib/components/v3/dashboard/panels/BluetoothPanel.svelte';
	import CapturesPanel from '$lib/components/v3/dashboard/panels/CapturesPanel.svelte';
	import DevicesPanel from '$lib/components/v3/dashboard/panels/DevicesPanel.svelte';
	import UASPanel from '$lib/components/v3/dashboard/panels/UASPanel.svelte';
	import ResizableBottomPanel from '$lib/components/v3/dashboard/ResizableBottomPanel.svelte';
	import TakConfigView from '$lib/components/v3/dashboard/tak/TakConfigView.svelte';
	import TerminalPanel from '$lib/components/v3/dashboard/TerminalPanel.svelte';
	import BluehoodView from '$lib/components/v3/dashboard/views/BluehoodView.svelte';
	import GnuRadioView from '$lib/components/v3/dashboard/views/GnuRadioView.svelte';
	import KismetView from '$lib/components/v3/dashboard/views/KismetView.svelte';
	import LogsAnalyticsView from '$lib/components/v3/dashboard/views/LogsAnalyticsView.svelte';
	import NovaSDRView from '$lib/components/v3/dashboard/views/NovaSDRView.svelte';
	import OpenWebRXView from '$lib/components/v3/dashboard/views/OpenWebRXView.svelte';
	import ReportsView from '$lib/components/v3/dashboard/views/ReportsView.svelte';
	import SDRppView from '$lib/components/v3/dashboard/views/SDRppView.svelte';
	import SightlineView from '$lib/components/v3/dashboard/views/SightlineView.svelte';
	import SparrowView from '$lib/components/v3/dashboard/views/SparrowView.svelte';
	import SpiderfootView from '$lib/components/v3/dashboard/views/SpiderfootView.svelte';
	import ToolUnavailableView from '$lib/components/v3/dashboard/views/ToolUnavailableView.svelte';
	import ToolViewWrapper from '$lib/components/v3/dashboard/views/ToolViewWrapper.svelte';
	import UASScanView from '$lib/components/v3/dashboard/views/UASScanView.svelte';
	import WebTAKView from '$lib/components/v3/dashboard/views/WebTAKView.svelte';
	import WigleToTAKView from '$lib/components/v3/dashboard/views/WigleToTAKView.svelte';
	import WiresharkView from '$lib/components/v3/dashboard/views/WiresharkView.svelte';
	import {
		activeBottomTab,
		activePanel,
		activeView,
		bottomPanelHeight,
		closeBottomPanel,
		isBottomPanelOpen,
		lastNonScanView,
		openBottomPanel,
		setBottomPanelHeight
	} from '$lib/stores/dashboard/dashboard-store';
	import {
		createSession,
		nextTab,
		previousTab,
		toggleTerminalPanel
	} from '$lib/stores/dashboard/terminal-store';
	import { uasStore } from '$lib/stores/dragonsync/uas-store';
	import { startGpPolling, stopGpPolling } from '$lib/stores/globalprotect-store';
	import { GPSService } from '$lib/tactical-map/gps-service';
	import { KismetService } from '$lib/tactical-map/kismet-service';
	import { TakService } from '$lib/tactical-map/tak-service';

	import BottomPanelTabs from './BottomPanelTabs.svelte';

	// spec-024 PR6 — Mk II is now its own URL space at /dashboard/mk2/*.
	// `?ui=mk2` redirects in +page.ts so this file is the legacy shell only.

	const FULL_WIDTH_VIEWS = new Set(['tak-config', 'globalprotect', 'gsm-evil']);
	let shellMode = $derived(
		$activePanel === 'reports' || FULL_WIDTH_VIEWS.has($activeView)
			? ('full-width' as const)
			: ('sidebar' as const)
	);

	const gpsService = new GPSService();
	const kismetService = new KismetService();
	const takService = new TakService();

	let mountedTabs = $state(new Set<string>());

	$effect(() => {
		const tab = $activeBottomTab;
		if (tab && !mountedTabs.has(tab)) {
			mountedTabs = new Set([...mountedTabs, tab]);
		}
	});

	// UAS scan auto-swap: when a scan starts, swap the center region from map to
	// the UAS live-log terminal view. When the scan stops, revert to whichever
	// non-scan view was last active (default 'map'). Also keeps lastNonScanView
	// up-to-date so manual navigation during a scan is preserved.
	let lastSeenScanStatus: string | null = null;
	$effect(() => reconcileScanAutoSwap($uasStore.status, $activeView));

	function reconcileScanAutoSwap(status: string, view: string): void {
		if (view !== 'uas-scan') lastNonScanView.set(view as never);
		if (lastSeenScanStatus === status) return;
		applyScanTransition(status, view);
		lastSeenScanStatus = status;
	}

	const ACTIVATING_STATUSES = new Set(['starting', 'running']);

	function shouldActivate(status: string, view: string): boolean {
		return ACTIVATING_STATUSES.has(status) && view !== 'uas-scan';
	}

	function shouldDeactivate(status: string, view: string): boolean {
		return status === 'stopped' && lastSeenScanStatus !== null && view === 'uas-scan';
	}

	function deactivationTarget(): string {
		const prev = $lastNonScanView;
		return prev === 'uas-scan' ? 'map' : prev;
	}

	function applyScanTransition(status: string, view: string): void {
		if (shouldActivate(status, view)) {
			activeView.set('uas-scan');
			return;
		}
		if (shouldDeactivate(status, view)) {
			activeView.set(deactivationTarget() as never);
		}
	}

	function goBackToMap() {
		activeView.set('map');
	}

	type ShortcutEntry = { ctrl: boolean; shift: boolean; key: string; action: () => void };
	const SHORTCUTS: ShortcutEntry[] = [
		{ ctrl: true, shift: false, key: '`', action: toggleTerminalPanel },
		{ ctrl: true, shift: true, key: '`', action: createSession },
		{ ctrl: true, shift: true, key: '[', action: previousTab },
		{ ctrl: true, shift: true, key: ']', action: nextTab }
	];

	function matchShortcut(e: KeyboardEvent): ShortcutEntry | undefined {
		return SHORTCUTS.find(
			(s) => e.ctrlKey === s.ctrl && e.shiftKey === s.shift && e.key === s.key
		);
	}

	function handleEscape() {
		if ($isBottomPanelOpen) closeBottomPanel();
		else if ($activeView !== 'map') activeView.set('map');
		else if ($activePanel !== null) activePanel.set(null);
	}

	function handleKeydown(e: KeyboardEvent) {
		const shortcut = matchShortcut(e);
		if (shortcut) {
			e.preventDefault();
			shortcut.action();
			return;
		}
		if (e.key === 'Escape') handleEscape();
	}

	onMount(() => {
		if (!browser) return;
		gpsService.startPositionUpdates();
		kismetService.startPeriodicStatusCheck();
		kismetService.startPeriodicDeviceFetch();
		void kismetService.fetchKismetDevices();
		takService.startPeriodicStatusCheck();
		startGpPolling();
	});

	onDestroy(() => {
		gpsService.stopPositionUpdates();
		kismetService.stopPeriodicChecks();
		takService.stopPeriodicChecks();
		stopGpPolling();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<DashboardShell mode={shellMode}>
	{#snippet sidebar()}
		{#if $activeView === 'map' && $activePanel !== 'reports'}
			<PanelContainer />
		{/if}
	{/snippet}

	{#snippet content()}
		<div class="dashboard-content">
			{#if $activeView === 'map'}
				<DashboardMap />
			{:else if $activeView === 'kismet'}
				<KismetView />
			{:else if $activeView === 'openwebrx'}
				<OpenWebRXView />
			{:else if $activeView === 'novasdr'}
				<NovaSDRView />
			{:else if $activeView === 'sdrpp'}
				<SDRppView />
			{:else if $activeView === 'gnu-radio'}
				<GnuRadioView />
			{:else if $activeView === 'wireshark'}
				<WiresharkView />
			{:else if $activeView === 'uas-scan'}
				<UASScanView />
			{:else if $activeView === 'bettercap'}
				<ToolViewWrapper title="Bettercap" onBack={goBackToMap}>
					<iframe src="http://localhost:80" title="Bettercap" class="tool-iframe"
					></iframe>
				</ToolViewWrapper>
			{:else if $activeView === 'hackrf'}
				<ToolUnavailableView title="HackRF Spectrum Analyzer" />
			{:else if $activeView === 'rtl-433'}
				<ToolUnavailableView title="RTL-433 Decoder" />
			{:else if $activeView === 'btle'}
				<ToolUnavailableView title="BTLE Scanner" />
			{:else if $activeView === 'droneid'}
				<ToolUnavailableView title="Drone ID" />
			{:else if $activeView === 'pagermon'}
				<ToolUnavailableView title="Pagermon" />
			{:else if $activeView === 'rf-emitter'}
				<ToolUnavailableView title="RF Emitter" />
			{:else if $activeView === 'wifite'}
				<ToolUnavailableView title="Wifite2" />
			{:else if $activeView === 'wigletotak'}
				<WigleToTAKView />
			{:else if $activeView === 'bluehood'}
				<BluehoodView />
			{:else if $activeView === 'logs-analytics'}
				<LogsAnalyticsView />
			{:else if $activeView === 'sightline'}
				<SightlineView />
			{:else if $activeView === 'sparrow-wifi'}
				<SparrowView />
			{:else if $activeView === 'spiderfoot'}
				<SpiderfootView />
			{:else if $activeView === 'webtak'}
				<WebTAKView />
			{:else}
				<ToolUnavailableView title={$activeView} />
			{/if}
		</div>
	{/snippet}

	{#snippet fullWidth()}
		{#if $activePanel === 'reports'}
			<ReportsView />
		{:else if $activeView === 'tak-config'}
			<TakConfigView />
		{:else if $activeView === 'globalprotect'}
			<GpConfigView />
		{:else if $activeView === 'gsm-evil'}
			<ToolViewWrapper title="GSM Evil" onBack={goBackToMap}>
				<iframe src="/gsm-evil" title="GSM Evil" class="tool-iframe"></iframe>
			</ToolViewWrapper>
		{/if}
	{/snippet}

	{#snippet bottomPanel()}
		<!--
			ResizableBottomPanel wraps EVERYTHING (tab bar + content).
			- Drag handle is at the very top edge — intuitive "grab top to resize"
			- When collapsed: panel height = 0, but tab bar inside still shows via min-height
			- Tab bar always visible; chevron rotates ▼/▲ to show collapse state
		-->
		<ResizableBottomPanel
			isOpen={$isBottomPanelOpen}
			height={$bottomPanelHeight}
			onHeightChange={setBottomPanelHeight}
			onOpen={openBottomPanel}
		>
			<!-- Tab bar sits inside the resizable panel, always rendered -->
			<BottomPanelTabs activeTab={$activeBottomTab} />

			<!-- Content area shown only when open -->
			<div class="bottom-panel-content">
				{#if mountedTabs.has('terminal')}
					<div class="tab-pane" class:tab-active={$activeBottomTab === 'terminal'}>
						<TerminalPanel />
					</div>
				{/if}
				{#if mountedTabs.has('chat')}
					<div class="tab-pane" class:tab-active={$activeBottomTab === 'chat'}>
						<AgentChatPanel />
					</div>
				{/if}
				{#if mountedTabs.has('logs')}
					<div class="tab-pane" class:tab-active={$activeBottomTab === 'logs'}>
						<LogsPanel />
					</div>
				{/if}
				{#if mountedTabs.has('captures')}
					<div class="tab-pane" class:tab-active={$activeBottomTab === 'captures'}>
						<CapturesPanel />
					</div>
				{/if}
				{#if mountedTabs.has('dashboard')}
					<div class="tab-pane" class:tab-active={$activeBottomTab === 'dashboard'}>
						<DevicesPanel />
					</div>
				{/if}
				{#if mountedTabs.has('bluetooth')}
					<div class="tab-pane" class:tab-active={$activeBottomTab === 'bluetooth'}>
						<BluetoothPanel />
					</div>
				{/if}
				{#if mountedTabs.has('uas')}
					<div class="tab-pane" class:tab-active={$activeBottomTab === 'uas'}>
						<UASPanel />
					</div>
				{/if}
			</div>
		</ResizableBottomPanel>
	{/snippet}
</DashboardShell>

<style>
	@import './dashboard-page.css';
</style>
