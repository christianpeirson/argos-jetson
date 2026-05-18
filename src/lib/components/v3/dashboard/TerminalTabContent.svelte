<!-- @constitutional-exemption Article-IV-4.3 issue:#11 — Component state handling (loading/error/empty UI) deferred to UX improvement phase -->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import { browser } from '$app/environment';
	import { buildTerminalTheme } from '$lib/components/v3/dashboard/terminal/terminal-theme';
	import { updateSessionConnection } from '$lib/stores/dashboard/terminal-store';
	import { themeStore } from '$lib/stores/theme-store.svelte';
	import { WebSocketEventName } from '$lib/types/enums';
	import { logger } from '$lib/utils/logger';
	import { BaseWebSocket } from '$lib/websocket/base';

	import TerminalErrorOverlay from './TerminalErrorOverlay.svelte';

	interface Props {
		sessionId: string;
		shell: string;
		isActive: boolean;
		onTitleChange?: (title: string) => void;
	}

	let { sessionId, shell, isActive, onTitleChange }: Props = $props();

	let terminalEl: HTMLDivElement | undefined = $state();
	let connectionError = $state(false);

	const WS_MAX_RETRIES = 5;
	const WS_BASE_DELAY_MS = 500; // 500ms, 1s, 2s, 4s, 8s

	/**
	 * Terminal WebSocket transport — BaseWebSocket subclass preserving the
	 * original retry semantics (500ms base, 2× backoff, 5 max attempts).
	 * Heartbeat is disabled because the /terminal-ws protocol is a raw PTY
	 * stream and has no ping/pong support on the server side (handler.ts).
	 */
	class TerminalWebSocket extends BaseWebSocket {
		protected onConnected(): void {
			/* wired via WebSocketEventName.Open listener below */
		}
		protected onDisconnected(): void {
			/* wired via WebSocketEventName.Close listener below */
		}
		protected onError(_error: Error): void {
			/* wired via WebSocketEventName.Error listener below */
		}
		protected sendHeartbeat(): void {
			/* no-op: terminal wire protocol has no heartbeat */
		}
		protected startHeartbeat(): void {
			/* no-op: override to prevent heartbeat timer from firing */
		}
		protected handleIncomingMessage(data: unknown): void {
			// Raw PTY output arrives as strings that fail JSON.parse in
			// BaseWebSocket.parseMessage → write straight to xterm.
			// Control messages ({ type: 'ready' | 'reattached' | 'exit', ... })
			// are routed via onMessage() handlers, so skip them here.
			if (typeof data !== 'string') return;
			terminal?.write(data);
		}
	}

	// References for cleanup
	let terminal: import('@xterm/xterm').Terminal | null = null;
	let fitAddon: import('@xterm/addon-fit').FitAddon | null = null;
	let ws: TerminalWebSocket | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let destroyed = false;
	let consecutiveCloses = 0;

	// Focus terminal when becoming active; connect if not yet connected
	// fallow-ignore-next-line complexity
	$effect(() => {
		if (isActive && terminal) {
			if (!ws && !destroyed) connectWebSocket();
			requestAnimationFrame(() => {
				terminal?.focus();
				fitAddon?.fit();
			});
		}
	});

	// Re-apply terminal UI chrome colors when theme changes
	$effect(() => {
		// Subscribe to reactive theme state to trigger re-resolution
		const _palette = themeStore.palette;
		if (!terminal) return;
		terminal.options.theme = buildTerminalTheme();
	});

	/** Derive display name from shell path. */
	function resolveShellName(shellPath: string): string {
		if (shellPath.includes('docker-claude-terminal.sh')) return '🐋 Claude';
		return shellPath.split('/').pop() || 'terminal';
	}

	/** Send a resize message over the active terminal WebSocket. */
	function sendResize() {
		if (!terminal || !ws?.isConnected()) return;
		ws.send({ type: 'resize', cols: terminal.cols, rows: terminal.rows });
	}

	/**
	 * Safely extract `msg.shell` — msg may be null / primitive / missing
	 * the field, so the raw cast threw or returned undefined. Falls back
	 * to the outer `fallback` unless msg is an object with a string shell.
	 */
	function extractShellName(msg: unknown, fallback: string): string {
		if (typeof msg !== 'object' || msg === null) return fallback;
		const shellField = (msg as { shell?: unknown }).shell;
		return typeof shellField === 'string' ? shellField : fallback;
	}

	/** Handle a session-ready or reattached control message. */
	function handleSessionReady(msg: unknown, isReattach: boolean) {
		const shellName = extractShellName(msg, shell);
		updateSessionConnection(sessionId, true);
		onTitleChange?.(resolveShellName(shellName));
		if (isReattach)
			terminal?.write('\r\n\x1b[90m[terminal reconnected - session restored]\x1b[0m\r\n');
		sendResize();
	}

	/** Handle the 'exit' control message. */
	function handleSessionExit() {
		terminal?.write('\r\n\x1b[90m[session ended]\x1b[0m\r\n');
		updateSessionConnection(sessionId, false);
	}

	function connectWebSocket() {
		if (destroyed) return;

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const sock = new TerminalWebSocket({
			url: `${protocol}//${window.location.host}/terminal-ws`,
			reconnectInterval: WS_BASE_DELAY_MS,
			reconnectBackoffMultiplier: 2,
			maxReconnectInterval: 30_000,
			maxReconnectAttempts: WS_MAX_RETRIES,
			heartbeatInterval: 30_000
		});
		ws = sock;

		sock.onMessage('ready', (data) => handleSessionReady(data, false));
		sock.onMessage('reattached', (data) => handleSessionReady(data, true));
		sock.onMessage('exit', () => handleSessionExit());

		sock.on(WebSocketEventName.Open, () => {
			connectionError = false;
			consecutiveCloses = 0;
			logger.info('Terminal WebSocket connected, sending init', { sessionId });
			sock.send({ type: 'init', shell, sessionId });
		});

		sock.on(WebSocketEventName.Close, () => {
			updateSessionConnection(sessionId, false);
			consecutiveCloses++;
			if (!destroyed && consecutiveCloses > WS_MAX_RETRIES) {
				logger.warn('Terminal retries exhausted, showing error', {
					sessionId,
					maxRetries: WS_MAX_RETRIES
				});
				connectionError = true;
				sock.disconnect();
			}
		});

		sock.on(WebSocketEventName.Error, () => {
			updateSessionConnection(sessionId, false);
		});

		sock.connect();
	}

	// fallow-ignore-next-line complexity
	onMount(async () => {
		if (!browser || !terminalEl) return;

		const [xtermMod, fitMod] = await Promise.all([
			import('@xterm/xterm'),
			import('@xterm/addon-fit')
		]);

		// Inject xterm base CSS (idempotent)
		await import('@xterm/xterm/css/xterm.css');

		const { Terminal } = xtermMod;
		const { FitAddon } = fitMod;

		terminal = new Terminal({
			cursorBlink: true,
			cursorStyle: 'bar',
			fontSize: 14,
			fontFamily: "'FiraCode Nerd Font', 'Fira Code', 'JetBrains Mono', monospace",
			lineHeight: 1.2,
			scrollback: 10000,
			theme: buildTerminalTheme()
		});

		fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);

		// Optional web-links addon
		try {
			const { WebLinksAddon } = await import('@xterm/addon-web-links');
			terminal.loadAddon(new WebLinksAddon());
		} catch {
			/* optional */
		}

		terminal.open(terminalEl);
		requestAnimationFrame(() => fitAddon?.fit());

		// Auto-resize when container dimensions change
		resizeObserver = new ResizeObserver(() => {
			if (isActive) {
				requestAnimationFrame(() => fitAddon?.fit());
			}
		});
		resizeObserver.observe(terminalEl);

		// Forward terminal input to backend
		terminal.onData((data) => {
			if (ws?.isConnected()) {
				ws.send({ type: 'input', data });
			}
		});

		// Forward resize events to backend
		terminal.onResize(({ cols, rows }) => {
			if (ws?.isConnected()) {
				ws.send({ type: 'resize', cols, rows });
			}
		});

		// Extract title from terminal escape sequences (OSC 0 or OSC 2)
		terminal.onTitleChange((title) => {
			if (title) {
				onTitleChange?.(title);
			}
		});

		// Only connect WebSocket for the active tab — inactive tabs connect lazily
		// when the user switches to them (via the $effect above)
		if (isActive) {
			connectWebSocket();
			terminal.focus();
		}
	});

	onDestroy(() => {
		destroyed = true;
		resizeObserver?.disconnect();
		ws?.destroy();
		terminal?.dispose();
	});
</script>

<div class="terminal-tab-content" class:active={isActive} class:hidden={!isActive}>
	{#if connectionError}
		<TerminalErrorOverlay maxRetries={WS_MAX_RETRIES} />
	{/if}
	<div class="terminal-container" bind:this={terminalEl}></div>
</div>

<style>
	.terminal-tab-content {
		flex: 1;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.terminal-tab-content.hidden {
		display: none;
	}
	.terminal-container {
		width: 100%;
		height: 100%;
		padding: 4px 0 0 4px;
	}

	.terminal-container :global(.xterm) {
		height: 100%;
	}
	.terminal-container :global(.xterm-viewport::-webkit-scrollbar) {
		width: 8px;
	}
	.terminal-container :global(.xterm-viewport::-webkit-scrollbar-track) {
		background: transparent;
	}
	.terminal-container :global(.xterm-viewport::-webkit-scrollbar-thumb) {
		background: var(--hover-tint);
		border-radius: 4px;
	}
	.terminal-container :global(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
		background: var(--secondary);
	}
</style>
