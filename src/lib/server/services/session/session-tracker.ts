/**
 * Session tracker: groups RF observations into operator-defined or
 * auto-triggered sessions (mission-like buckets). Used by
 * /api/rf/aggregate to filter heatmap / centroid / path layers per run.
 *
 * Sources:
 *   'kismet-start' — set when Kismet is started via /api/kismet/start
 *   'manual'       — set when the dashboard fires "New Session"
 *   'auto'         — fallback bucket when a signal writes before any session exists
 *   'legacy'       — seeded by migration 006 for pre-migration rows
 */

import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

import { getRFDatabase } from '$lib/server/db/database';
import { logger } from '$lib/utils/logger';

export type SessionSource = 'kismet-start' | 'manual' | 'auto' | 'legacy';

export interface MissionMetadata {
	operatorId?: string | null;
	assetId?: string | null;
	areaName?: string | null;
	notes?: string | null;
}

export interface Session {
	id: string;
	startedAt: number;
	endedAt: number | null;
	label: string | null;
	source: SessionSource;
	metadata: Record<string, unknown> | null;
	operatorId: string | null;
	assetId: string | null;
	areaName: string | null;
	notes: string | null;
}

interface SessionRow {
	id: string;
	started_at: number;
	ended_at: number | null;
	label: string | null;
	source: string;
	metadata: string | null;
	operator_id: string | null;
	asset_id: string | null;
	area_name: string | null;
	notes: string | null;
}

function rowToSession(row: SessionRow): Session {
	return {
		id: row.id,
		startedAt: row.started_at,
		endedAt: row.ended_at,
		label: row.label,
		source: row.source as SessionSource,
		metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
		operatorId: row.operator_id,
		assetId: row.asset_id,
		areaName: row.area_name,
		notes: row.notes
	};
}

const METADATA_COLS: Array<{ key: keyof MissionMetadata; col: string }> = [
	{ key: 'operatorId', col: 'operator_id' },
	{ key: 'assetId', col: 'asset_id' },
	{ key: 'areaName', col: 'area_name' },
	{ key: 'notes', col: 'notes' }
];

function buildMetadataPatch(meta: MissionMetadata): {
	fields: string[];
	params: unknown[];
} {
	const fields: string[] = [];
	const params: unknown[] = [];
	for (const { key, col } of METADATA_COLS) {
		if (meta[key] !== undefined) {
			fields.push(`${col} = ?`);
			params.push(meta[key]);
		}
	}
	return { fields, params };
}

export function updateSessionMetadata(id: string, meta: MissionMetadata): Session | null {
	const { fields, params } = buildMetadataPatch(meta);
	if (fields.length === 0) return getSession(id);
	params.push(id);
	getRFDatabase()
		.rawDb.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`)
		.run(...params);
	return getSession(id);
}

function insertSession(db: Database.Database, session: Session): void {
	db.prepare(
		`INSERT INTO sessions (id, started_at, ended_at, label, source, metadata)
		 VALUES (?, ?, ?, ?, ?, ?)`
	).run(
		session.id,
		session.startedAt,
		session.endedAt,
		session.label,
		session.source,
		session.metadata ? JSON.stringify(session.metadata) : null
	);
}

function endSession(db: Database.Database, id: string, endedAt: number): void {
	db.prepare('UPDATE sessions SET ended_at = ? WHERE id = ? AND ended_at IS NULL').run(
		endedAt,
		id
	);
}

/**
 * Resolve the most recent still-open session, or null if none.
 * Excludes the synthetic 'legacy' bucket.
 */
function findOpenSession(db: Database.Database): SessionRow | null {
	return (
		(db
			.prepare(
				`SELECT id, started_at, ended_at, label, source, metadata, operator_id, asset_id, area_name, notes
				 FROM sessions
				 WHERE ended_at IS NULL AND id != 'legacy'
				 ORDER BY started_at DESC LIMIT 1`
			)
			.get() as SessionRow | undefined) ?? null
	);
}

interface TrackerState {
	currentId: string | null;
}

function getState(): TrackerState {
	const existing = globalThis.__argos_session_tracker;
	if (existing) return existing;
	const state: TrackerState = { currentId: null };
	globalThis.__argos_session_tracker = state;
	return state;
}

function rehydrateCurrent(db: Database.Database): string | null {
	const row = findOpenSession(db);
	return row?.id ?? null;
}

/** Get the active session id, creating an 'auto' one if none exists. */
export function getCurrentSessionId(): string {
	const state = getState();
	if (state.currentId) return state.currentId;

	const db = getRFDatabase().rawDb;
	const existing = rehydrateCurrent(db);
	if (existing) {
		state.currentId = existing;
		return existing;
	}
	return startNewSession('auto');
}

/**
 * Start a new session, closing any currently-open one. Returns the new id.
 * Callers: Kismet start handler, dashboard "New Session" button, or
 * implicit auto-bootstrap from getCurrentSessionId().
 */
export function startNewSession(
	source: SessionSource,
	label?: string,
	metadata?: Record<string, unknown>
): string {
	const db = getRFDatabase().rawDb;
	const now = Date.now();
	const state = getState();

	const openId = state.currentId ?? rehydrateCurrent(db);
	if (openId) endSession(db, openId, now);

	const id = randomUUID();
	insertSession(db, {
		id,
		startedAt: now,
		endedAt: null,
		label: label ?? null,
		source,
		metadata: metadata ?? null,
		operatorId: null,
		assetId: null,
		areaName: null,
		notes: null
	});
	state.currentId = id;
	logger.info('[session-tracker] New session started', { id, source, label }, 'session-started');
	return id;
}

/** List sessions, newest first. */
export function listSessions(limit = 50): Session[] {
	const rows = getRFDatabase()
		.rawDb.prepare(
			`SELECT id, started_at, ended_at, label, source, metadata, operator_id, asset_id, area_name, notes
			 FROM sessions
			 ORDER BY started_at DESC
			 LIMIT ?`
		)
		.all(limit) as SessionRow[];
	return rows.map(rowToSession);
}

export function getSession(id: string): Session | null {
	const row = getRFDatabase()
		.rawDb.prepare(
			`SELECT id, started_at, ended_at, label, source, metadata, operator_id, asset_id, area_name, notes
			 FROM sessions WHERE id = ?`
		)
		.get(id) as SessionRow | undefined;
	return row ? rowToSession(row) : null;
}
