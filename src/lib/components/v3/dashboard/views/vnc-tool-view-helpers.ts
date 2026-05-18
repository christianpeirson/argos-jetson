/**
 * Shared helpers for the VNC-backed tool view components
 * (SDRppView, SparrowView, WebTAKView, WiresharkView).
 *
 * State mutation lives in each component's own runes; this module only owns
 * pure helpers and shared type aliases that have nothing component-specific.
 *
 * @module
 */

/** Lifecycle states a remote-tool VNC viewer reports up to the chrome. */
export type ServiceStatus = 'checking' | 'running' | 'stopped' | 'error';

/**
 * Compose a noVNC websocket URL from the current document origin and the
 * port/path returned by the tool's `/api/<tool>/control { action: 'status' }`
 * response. Picks `wss://` automatically when the dashboard was loaded over
 * HTTPS so mixed-content blocking doesn't kill the upgrade handshake.
 */
export function buildWsUrl(wsPort: number, wsPath: string): string {
	const host = window.location.hostname;
	const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
	return `${proto}://${host}:${wsPort}${wsPath}`;
}
