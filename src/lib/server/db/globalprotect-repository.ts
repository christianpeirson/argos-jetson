/**
 * GlobalProtect repository: CRUD access to the `globalprotect_configs`
 * table used by the GlobalProtect VPN integration.
 *
 * The caller supplies the `Database` handle (so this repository shares
 * the main argos.db connection) and the repository owns the prepared
 * statements. Statements are memoized per-Database via a module-scoped
 * WeakMap so identity stays stable across calls; if the caller ever
 * closes & reopens the DB, the GC drops the cached entry naturally.
 */

import type Database from 'better-sqlite3';

import type { GlobalProtectConfig } from '$lib/types/globalprotect';

import { createStmtsCache } from './repo-helpers';

interface GpConfigRow {
	id: string;
	portal: string;
	username: string;
	connect_on_startup: number;
}

type Stmts = {
	selectFirst: Database.Statement;
	upsert: Database.Statement;
};

function prepareStatements(db: Database.Database): Stmts {
	return {
		selectFirst: db.prepare('SELECT * FROM globalprotect_configs LIMIT 1'),
		upsert: db.prepare(
			`INSERT INTO globalprotect_configs (id, portal, username, connect_on_startup)
			 VALUES (?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
				portal = excluded.portal,
				username = excluded.username,
				connect_on_startup = excluded.connect_on_startup`
		)
	};
}

const stmts = createStmtsCache(prepareStatements);

function rowToConfig(row: GpConfigRow): GlobalProtectConfig {
	return {
		id: row.id,
		portal: row.portal,
		username: row.username,
		connectOnStartup: row.connect_on_startup === 1
	};
}

/** Load the single persisted GlobalProtect config (returns null when none exists). */
export function loadGpConfig(db: Database.Database): GlobalProtectConfig | null {
	const row = stmts(db).selectFirst.get() as GpConfigRow | undefined;
	return row ? rowToConfig(row) : null;
}

/** Upsert the GlobalProtect config row keyed by id. */
export function saveGpConfig(db: Database.Database, config: GlobalProtectConfig): void {
	stmts(db).upsert.run(
		config.id,
		config.portal,
		config.username,
		config.connectOnStartup ? 1 : 0
	);
}
