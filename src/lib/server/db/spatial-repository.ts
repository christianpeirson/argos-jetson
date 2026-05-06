/**
 * Spatial repository: area-based queries for devices and statistics.
 */

import type Database from 'better-sqlite3';

/**
 * Aggregate statistics for signals within a bounding box and time window.
 */
export function getAreaStatistics(
	_db: Database.Database,
	statements: Map<string, Database.Statement>,
	bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
	timeWindow: number = 3600000
): unknown {
	const stmt = statements.get('getAreaStatistics');
	if (!stmt) throw new Error('getAreaStatistics statement not found');

	return stmt.get({
		minLat: bounds.minLat,
		maxLat: bounds.maxLat,
		minLon: bounds.minLon,
		maxLon: bounds.maxLon,
		since: Date.now() - timeWindow
	});
}
