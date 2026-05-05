/**
 * DragonSync cached state — drone / FPV / C2 detections and the most-recent
 * poll error. Peers (`api-poller`, `c2-subscriber`) mutate these through the
 * exported accessor functions so there is a single module-level source of
 * truth and no `let` binding leaks across file boundaries.
 *
 * @module
 */

import type {
	DragonSyncC2Signal,
	DragonSyncDrone,
	DragonSyncFpvSignal
} from '$lib/types/dragonsync';

/**
 * Map is exported directly — consumers mutate the reference in place.
 * Keyed by `uid` (`c2-<centerHz>`); each band center keeps its newest detection,
 * stale entries are pruned in `c2-subscriber`.
 */
export const cachedC2: Map<string, DragonSyncC2Signal> = new Map();

let cachedDrones: DragonSyncDrone[] = [];
let cachedFpv: DragonSyncFpvSignal[] = [];
let lastPollError: string | null = null;

export function getCachedDrones(): DragonSyncDrone[] {
	return cachedDrones;
}

export function setCachedDrones(next: DragonSyncDrone[]): void {
	cachedDrones = next;
}

export function getCachedFpv(): DragonSyncFpvSignal[] {
	return cachedFpv;
}

export function setCachedFpv(next: DragonSyncFpvSignal[]): void {
	cachedFpv = next;
}

export function readLastPollError(): string | null {
	return lastPollError;
}

export function setLastPollError(next: string | null): void {
	lastPollError = next;
}

/** Drop all cached detections (called on `stopDragonSync`). */
export function clearAllCaches(): void {
	cachedDrones = [];
	cachedFpv = [];
	cachedC2.clear();
}
