/**
 * OVERVIEW SOURCES panel — type definitions for data-source status.
 *
 * Spec-026 phase 9.4. Mirrors `SOURCES` from `docs/UI/Argos (1).zip`
 * `screen-command.jsx`. The panel surfaces hardware/service feed status
 * across HackRF / Kismet / GSM-Evil / TAK / Ubertooth / GNSS.
 */

export const SOURCE_STATES = ['LIVE', 'IDLE', 'DEG', 'OFFLINE'] as const;
export type SourceState = (typeof SOURCE_STATES)[number];

export const SOURCE_HEALTHS = ['ok', 'idle', 'warn', 'error'] as const;
export type SourceHealth = (typeof SOURCE_HEALTHS)[number];

export interface SourceStatus {
	id: string;
	name: string;
	state: SourceState;
	since: string;
	band: string;
	rate: string;
	health: SourceHealth;
}

export const SOURCE_STATE_TAG_KIND: Record<SourceState, 'green' | 'cool-gray' | 'magenta' | 'red'> =
	{
		LIVE: 'green',
		IDLE: 'cool-gray',
		DEG: 'magenta',
		OFFLINE: 'red'
	};
