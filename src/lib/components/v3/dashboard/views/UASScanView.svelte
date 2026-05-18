<!--
  UAS Scan view — fills the dashboard center region with a live terminal
  streaming journalctl output for zmq-decoder + dragonsync + wardragon-fpv-detect.

  Activated via $activeView === 'uas-scan' in src/routes/dashboard/+page.svelte.
  Auto-opened when $uasStore.status transitions to starting|running.

  Data source: GET /api/dragonsync/logs (Server-Sent Events). EventSource opens
  on mount, closes on destroy OR when `$uasStore.status === 'stopped'` (no
  point holding a dead stream open).
-->
<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';

	import { browser } from '$app/environment';
	import { activeView, lastNonScanView } from '$lib/stores/dashboard/dashboard-store';
	import { uasStore } from '$lib/stores/dragonsync/uas-store';

	import ToolViewWrapper from './ToolViewWrapper.svelte';

	type LogLevel = 'info' | 'warn' | 'error' | 'stderr' | 'system';

	interface LogLine {
		id: number;
		level: LogLevel;
		ts: string; // ISO timestamp (if present)
		unit: string; // systemd unit name
		body: string; // log message text
	}

	const MAX_LINES = 2000;
	const SCROLL_STICK_THRESHOLD_PX = 48;

	let lines = $state<LogLine[]>([]);
	let nextId = 0;
	let newSinceScrollUp = $state(0);

	let es: EventSource | null = null;
	let scrollEl: HTMLDivElement | null = null;
	let stickToBottom = $state(true);

	const RECONNECT_DELAYS_MS = [2_000, 4_000, 8_000, 16_000, 30_000];
	let reconnectAttempts = 0;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let lastLineWasStreamError = false;

	/** Parse a journalctl --output=short-iso line.
	 *
	 * Typical format:
	 *   2026-04-19T21:13:06+0000 hostname unit[123]: message body...
	 *
	 * Fallbacks: if the line doesn't match, keep the whole thing as `body`.
	 */
	function parseLine(raw: string): LogLine {
		const id = nextId++;

		// Server-side prefix for stderr / stream errors
		if (raw.startsWith('[stderr]') || raw.startsWith('[stream error')) {
			return { id, level: 'stderr', ts: '', unit: 'log-stream', body: raw };
		}

		// short-iso format: 2026-04-19T21:13:06+0000 hostname unit[pid]: body
		const match = raw.match(/^(\S+)\s+\S+\s+([a-z0-9_.-]+)\[\d+\]:\s*(.*)$/i);
		if (!match) {
			return { id, level: 'info', ts: '', unit: 'systemd', body: raw };
		}

		const [, ts, unit, body] = match;
		return { id, level: detectLevel(body), ts, unit, body };
	}

	const LEVEL_MATCHERS: { level: LogLevel; test: (s: string) => boolean }[] = [
		{ level: 'error', test: (s) => s.startsWith('[error]') || /failure|failed/.test(s) },
		{ level: 'warn', test: (s) => s.startsWith('[warn') || s.includes('warning') },
		{ level: 'system', test: (s) => s.startsWith('started ') || s.startsWith('stopped ') }
	];

	function detectLevel(body: string): LogLevel {
		const lower = body.toLowerCase();
		return LEVEL_MATCHERS.find((m) => m.test(lower))?.level ?? 'info';
	}

	function appendLine(raw: string): void {
		const parsed = parseLine(raw);

		// Cap history — drop oldest when we pass MAX_LINES.
		if (lines.length >= MAX_LINES) {
			lines = [...lines.slice(-(MAX_LINES - 1)), parsed];
		} else {
			lines = [...lines, parsed];
		}

		if (!stickToBottom) {
			newSinceScrollUp++;
		}
	}

	function openStream(): void {
		if (!browser) return;
		closeStream();
		es = new EventSource('/api/dragonsync/logs');
		es.onopen = () => {
			reconnectAttempts = 0;
			lastLineWasStreamError = false;
		};
		es.onmessage = (ev) => {
			lastLineWasStreamError = false;
			appendLine(ev.data);
		};
		es.onerror = () => {
			if (es) {
				es.close();
				es = null;
			}
			if (!lastLineWasStreamError) {
				appendLine('[stream error] reconnecting...');
				lastLineWasStreamError = true;
			}
			scheduleReconnect();
		};
	}

	function scheduleReconnect(): void {
		if (reconnectTimer !== null) return;
		const idx = Math.min(reconnectAttempts, RECONNECT_DELAYS_MS.length - 1);
		reconnectAttempts++;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			openStream();
		}, RECONNECT_DELAYS_MS[idx]);
	}

	function closeStream(): void {
		if (reconnectTimer !== null) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		if (es) {
			es.close();
			es = null;
		}
	}

	function handleScroll(): void {
		if (!scrollEl) return;
		const distanceFromBottom =
			scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop;
		stickToBottom = distanceFromBottom < SCROLL_STICK_THRESHOLD_PX;
		if (stickToBottom) newSinceScrollUp = 0;
	}

	async function jumpToLatest(): Promise<void> {
		stickToBottom = true;
		newSinceScrollUp = 0;
		await tick();
		if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
	}

	function onBack(): void {
		const prev = $lastNonScanView;
		activeView.set(prev === 'uas-scan' ? 'map' : prev);
	}

	function clearBuffer(): void {
		lines = [];
		newSinceScrollUp = 0;
	}

	// Auto-scroll on new lines when sticky.
	$effect(() => {
		if (lines.length === 0) return;
		if (stickToBottom && scrollEl) {
			void tick().then(() => {
				if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
			});
		}
	});

	// Open/close stream based on scan status — no point holding SSE open when
	// services are stopped (the endpoint tails journal indefinitely, but we
	// still want to save the child process).
	// Also auto-clear the buffer on fresh Start so operators never see stale
	// pre-restart overflow history mixed with the clean post-Start stream.
	let _prevStatus: string | null = null;
	const isActivating = (s: string) => s === 'starting' || s === 'running';
	$effect(() => reactToScanStatus($uasStore.status));

	function reactToScanStatus(status: string): void {
		if (_prevStatus === 'stopped' && isActivating(status)) clearBuffer();
		_prevStatus = status;
		if (isActivating(status)) openStream();
		else closeStream();
	}

	onMount(() => {
		if ($uasStore.status === 'running' || $uasStore.status === 'starting') {
			openStream();
		}
	});

	onDestroy(() => {
		closeStream();
	});

	// Chip copy matches UASPanel's toolbar for visual consistency.
	const chipLabel = $derived(($uasStore.status ?? 'stopped').toUpperCase());
	const chipClass = $derived(
		$uasStore.status === 'running'
			? 'chip-run'
			: $uasStore.status === 'starting' || $uasStore.status === 'stopping'
				? 'chip-trans'
				: 'chip-stop'
	);
</script>

<ToolViewWrapper title="UAS Detection — Live Scan" {onBack}>
	<div class="uas-scan">
		<div class="bar">
			<span class="chip {chipClass}">{chipLabel}</span>
			<span class="svc"
				>zmq-decoder <span class="dot" class:up={$uasStore.droneidGoRunning}></span></span
			>
			<span class="svc"
				>DragonSync <span class="dot" class:up={$uasStore.dragonSyncRunning}></span></span
			>
			<span class="svc"
				>FPV Scanner <span class="dot" class:up={$uasStore.fpvScannerRunning}></span></span
			>
			<span class="spacer"></span>
			<span class="count">{lines.length} lines</span>
			<button type="button" class="btn-ghost" onclick={clearBuffer} title="Clear buffer"
				>Clear</button
			>
		</div>

		<div
			class="term"
			bind:this={scrollEl}
			onscroll={handleScroll}
			role="log"
			aria-live="polite"
			aria-relevant="additions"
		>
			{#if lines.length === 0}
				<div class="empty">
					<p class="empty-title">No log output yet</p>
					<p class="empty-sub">
						{$uasStore.status === 'stopped'
							? 'Click Start in the UAS panel below to begin.'
							: 'Waiting for journalctl stream...'}
					</p>
				</div>
			{:else}
				{#each lines as line (line.id)}
					<div class="line level-{line.level}">
						{#if line.ts}<span class="ts">{line.ts}</span>{/if}
						<span class="unit">{line.unit}</span>
						<span class="body">{line.body}</span>
					</div>
				{/each}
			{/if}
		</div>

		{#if !stickToBottom && newSinceScrollUp > 0}
			<button type="button" class="jump-latest" onclick={jumpToLatest}>
				▼ {newSinceScrollUp} new line{newSinceScrollUp === 1 ? '' : 's'} — jump to latest
			</button>
		{/if}
	</div>
</ToolViewWrapper>

<style>
	.uas-scan {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		background: var(--background, #111111);
		color: var(--foreground, #e0e0e0);
		font-family: 'Fira Code', 'SF Mono', 'Menlo', monospace;
		position: relative;
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 12px;
		height: 32px;
		padding: 0 12px;
		border-bottom: 1px solid var(--border, #2e2e2e);
		background: var(--card, #1a1a1a);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1.2px;
	}
	.chip {
		padding: 2px 8px;
		border: 1px solid var(--border, #2e2e2e);
		font-weight: 600;
	}
	.chip-run {
		color: #8bbfa0;
		border-color: #8bbfa0;
	}
	.chip-trans {
		color: #d4a054;
		border-color: #d4a054;
	}
	.chip-stop {
		color: #555555;
		border-color: #555555;
	}
	.svc {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #aaa;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #ff5c33;
	}
	.dot.up {
		background: #8bbfa0;
	}
	.spacer {
		flex: 1;
	}
	.count {
		color: #888;
	}
	.btn-ghost {
		background: transparent;
		border: 1px solid var(--border, #2e2e2e);
		color: var(--foreground, #e0e0e0);
		padding: 2px 10px;
		font-family: inherit;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1.2px;
		cursor: pointer;
	}
	.btn-ghost:hover {
		border-color: var(--primary, #a8b8e0);
		color: var(--primary, #a8b8e0);
	}

	.term {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 8px 12px;
		font-size: 12px;
		line-height: 1.5;
		scrollbar-width: thin;
		scrollbar-color: #333 #111;
	}
	.term::-webkit-scrollbar {
		width: 8px;
	}
	.term::-webkit-scrollbar-track {
		background: #111;
	}
	.term::-webkit-scrollbar-thumb {
		background: #333;
	}

	.line {
		white-space: pre-wrap;
		word-break: break-all;
		padding: 1px 0;
	}
	.line .ts {
		color: #5a7a9a;
		margin-right: 8px;
	}
	.line .unit {
		color: #a8b8e0;
		margin-right: 8px;
	}
	.line .body {
		color: inherit;
	}
	.line.level-error {
		color: #ff5c33;
	}
	.line.level-warn {
		color: #d4a054;
	}
	.line.level-system .body {
		color: #8bbfa0;
	}
	.line.level-stderr {
		color: #c45b4a;
	}
	.line.level-info .body {
		color: #c8c8c8;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #666;
	}
	.empty-title {
		font-size: 13px;
		font-weight: 500;
		margin: 0 0 4px 0;
	}
	.empty-sub {
		font-size: 11px;
		margin: 0;
	}

	.jump-latest {
		position: absolute;
		right: 16px;
		bottom: 16px;
		background: var(--primary, #a8b8e0);
		color: #111;
		border: none;
		padding: 6px 12px;
		font-family: inherit;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.5px;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
	}
	.jump-latest:hover {
		filter: brightness(1.1);
	}
</style>
