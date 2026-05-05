/**
 * Tiny presentation helpers used across the device-table screens
 * (`ScreenKismet`, `ImsiTable`, `KismetInspector`, etc.). Each is a pure
 * stringifier with no store or DOM dependency.
 *
 * @module
 */

/** Em-dash placeholder used everywhere a null cell renders. */
export const NULL_PLACEHOLDER = '—';

/** Render `null` / undefined cells as the em-dash placeholder. */
export function fmtNullable(s: string | null | undefined): string {
	return s ?? NULL_PLACEHOLDER;
}

export interface RelativeTimeOptions {
	/** When true (default false), show `Nd` for ages ≥ 24h. */
	showDays?: boolean;
}

/** Format a positive elapsed-second count as `Ns` / `Nm` / `Nh` / optional `Nd`. */
// fallow-ignore-next-line complexity
function formatElapsedSec(sec: number, showDays: boolean): string {
	if (sec < 60) return `${sec}s`;
	if (sec < 3600) return `${Math.floor(sec / 60)}m`;
	if (showDays && sec >= 86400) return `${Math.floor(sec / 86400)}d`;
	return `${Math.floor(sec / 3600)}h`;
}

/**
 * Format an epoch-millisecond timestamp as a short relative-time string
 * (`12s` / `5m` / `2h` / optional `3d`). `null` or future timestamps
 * render as the em-dash placeholder.
 */
export function fmtRelativeTime(
	timestamp: number | null | undefined,
	opts: RelativeTimeOptions = {}
): string {
	if (timestamp == null) return NULL_PLACEHOLDER;
	const sec = Math.floor(Math.max(0, Date.now() - timestamp) / 1000);
	return formatElapsedSec(sec, opts.showDays === true);
}
