/**
 * Mission / capture / capture-emitter / report repository.
 *
 * All better-sqlite3 access for the reports-and-missions feature lives
 * here. Prepared statements are memoized per-Database via a module-scoped
 * WeakMap so the same compiled statements are reused across calls without
 * leaking between DB instances; closing the DB lets the GC drop the
 * cached entry.
 *
 * Callers (e.g. services/reports/mission-store.ts) receive row mappers +
 * prepared-statement handles via stmts(db). They never see the raw SQL.
 */

import type Database from 'better-sqlite3';

import type { CaptureLoadout } from '$lib/server/services/reports/loadout-hash';
import type {
	CaptureEmitterRow,
	CaptureRole,
	CaptureRow,
	Mission,
	MissionType,
	ReportRow,
	ReportType
} from '$lib/server/services/reports/types';

import { createStmtsCache } from './repo-helpers';

export type Stmts = {
	insertMission: Database.Statement;
	getMission: Database.Statement;
	listMissions: Database.Statement;
	updateMission: Database.Statement;
	deleteMission: Database.Statement;
	clearActive: Database.Statement;
	setActive: Database.Statement;
	getActive: Database.Statement;
	insertCapture: Database.Statement;
	stopCapture: Database.Statement;
	getCapture: Database.Statement;
	listCapturesForMission: Database.Statement;
	getBaseline: Database.Statement;
	getPosture: Database.Statement;
	insertCaptureEmitter: Database.Statement;
	getCaptureEmitters: Database.Statement;
	insertReport: Database.Statement;
	listReports: Database.Statement;
	listReportsByType: Database.Statement;
	getReport: Database.Statement;
	deleteReport: Database.Statement;
};

function prepareStatements(db: Database.Database): Stmts {
	return {
		insertMission: db.prepare(
			`INSERT INTO missions (id, name, type, unit, ao_mgrs, operator, target, link_budget, created_at, active)
			 VALUES (@id, @name, @type, @unit, @ao_mgrs, @operator, @target, @link_budget, @created_at, @active)`
		),
		getMission: db.prepare(`SELECT * FROM missions WHERE id = ?`),
		listMissions: db.prepare(`SELECT * FROM missions ORDER BY created_at DESC`),
		updateMission: db.prepare(
			`UPDATE missions
			 SET name = @name,
			     unit = @unit,
			     ao_mgrs = @ao_mgrs,
			     operator = @operator,
			     target = @target,
			     link_budget = @link_budget
			 WHERE id = @id`
		),
		deleteMission: db.prepare(`DELETE FROM missions WHERE id = ?`),
		clearActive: db.prepare(`UPDATE missions SET active = 0 WHERE active = 1`),
		setActive: db.prepare(`UPDATE missions SET active = 1 WHERE id = ?`),
		getActive: db.prepare(`SELECT * FROM missions WHERE active = 1 LIMIT 1`),
		insertCapture: db.prepare(
			`INSERT INTO captures (id, mission_id, role, start_dtg, end_dtg, loadout_hash, loadout_json, status)
			 VALUES (@id, @mission_id, @role, @start_dtg, @end_dtg, @loadout_hash, @loadout_json, @status)`
		),
		stopCapture: db.prepare(
			`UPDATE captures SET end_dtg = ?, status = 'complete' WHERE id = ?`
		),
		getCapture: db.prepare(`SELECT * FROM captures WHERE id = ?`),
		listCapturesForMission: db.prepare(
			`SELECT * FROM captures WHERE mission_id = ? ORDER BY start_dtg ASC`
		),
		getBaseline: db.prepare(
			`SELECT * FROM captures WHERE mission_id = ? AND role = 'baseline' ORDER BY start_dtg DESC LIMIT 1`
		),
		getPosture: db.prepare(
			`SELECT * FROM captures WHERE mission_id = ? AND role = 'posture' ORDER BY start_dtg DESC LIMIT 1`
		),
		insertCaptureEmitter: db.prepare(
			`INSERT INTO capture_emitters (
				capture_id, source_table, source_id, signal_type, identifier,
				fingerprint_key, freq_hz, power_dbm, modulation, mgrs,
				classification, sensor_tool, raw_json
			) VALUES (
				@capture_id, @source_table, @source_id, @signal_type, @identifier,
				@fingerprint_key, @freq_hz, @power_dbm, @modulation, @mgrs,
				@classification, @sensor_tool, @raw_json
			)`
		),
		getCaptureEmitters: db.prepare(`SELECT * FROM capture_emitters WHERE capture_id = ?`),
		insertReport: db.prepare(
			`INSERT INTO reports (
				id, mission_id, type, title, generated_at, capture_ids,
				flagged_hostile, flagged_suspect, emitter_count,
				source_qmd_path, html_path, pdf_path, slides_html_path, slides_pdf_path
			) VALUES (
				@id, @mission_id, @type, @title, @generated_at, @capture_ids,
				@flagged_hostile, @flagged_suspect, @emitter_count,
				@source_qmd_path, @html_path, @pdf_path, @slides_html_path, @slides_pdf_path
			)`
		),
		listReports: db.prepare(`SELECT * FROM reports ORDER BY generated_at DESC LIMIT ?`),
		listReportsByType: db.prepare(
			`SELECT * FROM reports WHERE type = ? ORDER BY generated_at DESC LIMIT ?`
		),
		getReport: db.prepare(`SELECT * FROM reports WHERE id = ?`),
		deleteReport: db.prepare(`DELETE FROM reports WHERE id = ?`)
	};
}

export const stmts = createStmtsCache(prepareStatements);

export function slugify(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 32);
}

function nullableString(v: unknown): string | null {
	return (v as string | null) ?? null;
}

function nullableNumber(v: unknown): number | null {
	if (v == null) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export function missionRowToMission(row: Record<string, unknown>): Mission {
	return {
		id: String(row.id),
		name: String(row.name),
		type: row.type as MissionType,
		unit: nullableString(row.unit),
		ao_mgrs: nullableString(row.ao_mgrs),
		operator: nullableString(row.operator),
		target: nullableString(row.target),
		link_budget: nullableNumber(row.link_budget),
		created_at: Number(row.created_at),
		active: Number(row.active) === 1
	};
}

/**
 * Safely parse a JSON-encoded DB column. Raw JSON.parse throws on malformed
 * input with a cryptic `SyntaxError: Unexpected token ...` that does not
 * identify the row or field — replace with a descriptive error so the
 * capture/report import path points at the exact offending row.
 */
function parseJsonField<T>(value: unknown, fieldName: string, rowId: string): T {
	try {
		return JSON.parse(String(value)) as T;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`Invalid JSON in ${fieldName} for row ${rowId}: ${msg}`);
	}
}

export function captureRowToCapture(row: Record<string, unknown>): CaptureRow {
	const id = String(row.id);
	return {
		id,
		mission_id: String(row.mission_id),
		role: row.role as CaptureRole,
		start_dtg: Number(row.start_dtg),
		end_dtg: row.end_dtg == null ? null : Number(row.end_dtg),
		loadout_hash: String(row.loadout_hash),
		loadout: parseJsonField<CaptureLoadout>(row.loadout_json, 'loadout_json', id),
		status: row.status as CaptureRow['status']
	};
}

export function reportRowToReport(row: Record<string, unknown>): ReportRow {
	return {
		id: String(row.id),
		mission_id: String(row.mission_id),
		type: row.type as ReportType,
		title: String(row.title),
		generated_at: Number(row.generated_at),
		capture_ids: parseJsonField<string[]>(row.capture_ids, 'capture_ids', String(row.id)),
		flagged_hostile: Number(row.flagged_hostile),
		flagged_suspect: Number(row.flagged_suspect),
		emitter_count: Number(row.emitter_count),
		source_qmd_path: String(row.source_qmd_path),
		html_path: String(row.html_path),
		pdf_path: (row.pdf_path as string | null) ?? null,
		slides_html_path: (row.slides_html_path as string | null) ?? null,
		slides_pdf_path: (row.slides_pdf_path as string | null) ?? null
	};
}

export function captureEmitterRowFromDb(row: Record<string, unknown>): CaptureEmitterRow {
	return {
		capture_id: String(row.capture_id),
		source_table: String(row.source_table),
		source_id: String(row.source_id),
		signal_type: String(row.signal_type),
		identifier: nullableString(row.identifier),
		fingerprint_key: String(row.fingerprint_key),
		freq_hz: nullableNumber(row.freq_hz),
		power_dbm: nullableNumber(row.power_dbm),
		modulation: nullableString(row.modulation),
		mgrs: nullableString(row.mgrs),
		classification: nullableString(row.classification),
		sensor_tool: nullableString(row.sensor_tool),
		raw_json: String(row.raw_json)
	};
}
