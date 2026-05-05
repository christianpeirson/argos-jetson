/**
 * Shared repository helpers — prepared-statement caching pattern used by
 * `globalprotect-repository`, `mission-repository`, and
 * `trunk-recorder-preset-repository`.
 *
 * Each repo prepares its own statement set against a `better-sqlite3` handle
 * and memoises it per-handle so the prepare cost (heavy on the cell-tower
 * snapshot, light elsewhere) is paid once per DB connection.
 *
 * @module
 */

import type Database from 'better-sqlite3';

/**
 * Create a per-DB-handle prepared-statement cache.
 *
 * Returns a `(db) => S` resolver that calls `prepare(db)` once per distinct
 * handle and caches the result in a `WeakMap` so the cache doesn't pin the
 * DB handle alive past its natural lifetime.
 */
export function createStmtsCache<S>(
	prepare: (db: Database.Database) => S
): (db: Database.Database) => S {
	const cache = new WeakMap<Database.Database, S>();
	return (db) => {
		let s = cache.get(db);
		if (!s) {
			s = prepare(db);
			cache.set(db, s);
		}
		return s;
	};
}
