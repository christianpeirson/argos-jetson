/**
 * Trunk-recorder preset repository: CRUD for the `trunk_recorder_presets`
 * table created in migrations/20260417_create_trunk_recorder_presets.ts.
 *
 * Prepared statements are cached per-Database via a module-scoped WeakMap
 * so the compiled SQL is reused across calls and cleaned up automatically
 * when the DB handle is GC'd.
 */

import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import type { Preset, PresetInput } from '$lib/server/services/trunk-recorder/types';

import { createStmtsCache } from './repo-helpers';

/**
 * Row shape as stored in SQLite. JSON columns are TEXT; the repository
 * serializes/deserializes them at the boundary so callers only see domain
 * types. Keep in sync with the migration in
 * `src/lib/server/db/migrations/20260417_create_trunk_recorder_presets.ts`.
 */
interface PresetRow {
	id: string;
	name: string;
	system_type: 'p25' | 'smartnet';
	system_label: string;
	control_channels: string;
	talkgroups_csv: string;
	source_config: string;
	created_at: number;
	updated_at: number;
}

type Stmts = {
	list: Database.Statement;
	get: Database.Statement;
	insert: Database.Statement;
	update: Database.Statement;
	delete: Database.Statement;
};

function prepareStatements(db: Database.Database): Stmts {
	return {
		list: db.prepare('SELECT * FROM trunk_recorder_presets ORDER BY updated_at DESC'),
		get: db.prepare('SELECT * FROM trunk_recorder_presets WHERE id = ?'),
		insert: db.prepare(
			`INSERT INTO trunk_recorder_presets (
				id, name, system_type, system_label,
				control_channels, talkgroups_csv, source_config,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		),
		update: db.prepare(
			`UPDATE trunk_recorder_presets SET
				name = ?,
				system_type = ?,
				system_label = ?,
				control_channels = ?,
				talkgroups_csv = ?,
				source_config = ?,
				updated_at = ?
			 WHERE id = ?`
		),
		delete: db.prepare('DELETE FROM trunk_recorder_presets WHERE id = ?')
	};
}

const stmts = createStmtsCache(prepareStatements);

function rowToPreset(row: PresetRow): Preset {
	return {
		id: row.id,
		name: row.name,
		systemType: row.system_type,
		systemLabel: row.system_label,
		controlChannels: JSON.parse(row.control_channels) as number[],
		talkgroupsCsv: row.talkgroups_csv,
		sourceConfig: JSON.parse(row.source_config) as Preset['sourceConfig'],
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

export function listPresets(db: Database.Database): Preset[] {
	const rows = stmts(db).list.all() as PresetRow[];
	return rows.map(rowToPreset);
}

export function getPreset(db: Database.Database, id: string): Preset | null {
	const row = stmts(db).get.get(id) as PresetRow | undefined;
	return row ? rowToPreset(row) : null;
}

export function createPreset(db: Database.Database, input: PresetInput): Preset {
	const now = Date.now();
	const id = input.id ?? randomUUID();
	stmts(db).insert.run(
		id,
		input.name,
		input.systemType,
		input.systemLabel,
		JSON.stringify(input.controlChannels),
		input.talkgroupsCsv,
		JSON.stringify(input.sourceConfig),
		now,
		now
	);
	return {
		id,
		name: input.name,
		systemType: input.systemType,
		systemLabel: input.systemLabel,
		controlChannels: input.controlChannels,
		talkgroupsCsv: input.talkgroupsCsv,
		sourceConfig: input.sourceConfig,
		createdAt: now,
		updatedAt: now
	};
}

export function updatePreset(db: Database.Database, id: string, input: PresetInput): Preset | null {
	const existing = getPreset(db, id);
	if (!existing) return null;
	const now = Date.now();
	stmts(db).update.run(
		input.name,
		input.systemType,
		input.systemLabel,
		JSON.stringify(input.controlChannels),
		input.talkgroupsCsv,
		JSON.stringify(input.sourceConfig),
		now,
		id
	);
	return {
		...existing,
		name: input.name,
		systemType: input.systemType,
		systemLabel: input.systemLabel,
		controlChannels: input.controlChannels,
		talkgroupsCsv: input.talkgroupsCsv,
		sourceConfig: input.sourceConfig,
		updatedAt: now
	};
}

export function deletePreset(db: Database.Database, id: string): boolean {
	const result = stmts(db).delete.run(id);
	return result.changes > 0;
}
