// spec-024 PR5c T033 — client-side rolling event buffer for the OVERVIEW
// EventStream tile.
//
// Pure UX feed. Captures real state transitions emitted by other client
// stores (mission switch / sensor up-down / detection threshold crossings)
// into a fixed-cap FIFO. The backend audit log (auth-audit.ts) is
// security-only by design and is not the source for this feed — see
// plan: spec-024 PR5c.

import type { AppEvent, AppEventLevel } from '$lib/types/event';

const MAX_EVENTS = 100;

let nextId = 1;

function createEventBuffer() {
	let events = $state<AppEvent[]>([]);

	function record(
		level: AppEventLevel,
		source: string,
		payload: Record<string, unknown>
	): AppEvent {
		const evt: AppEvent = {
			id: `evt-${nextId++}`,
			timestamp: Date.now(),
			level,
			source,
			payload
		};
		events =
			events.length < MAX_EVENTS
				? [evt, ...events]
				: [evt, ...events.slice(0, MAX_EVENTS - 1)];
		return evt;
	}

	return {
		get events() {
			return events;
		},
		record,
		clear() {
			events = [];
		}
	};
}

export const eventBuffer = createEventBuffer();

export function recordEvent(
	level: AppEventLevel,
	source: string,
	payload: Record<string, unknown>
): AppEvent {
	return eventBuffer.record(level, source, payload);
}
