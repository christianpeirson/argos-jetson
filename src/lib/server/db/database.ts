/**
 * SQLite Database Service for RF Signal Storage — thin facade that
 * delegates to signalRepository and spatialRepository.
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

import type { SignalMarker } from '$lib/types/signals';
import { logger } from '$lib/utils/logger';

import { env } from '../env';
import { getSignalBus } from '../services/rf/signal-bus';
import { DatabaseCleanupService } from './cleanup-service';
import { DatabaseOptimizer } from './db-optimizer';
import { generateDeviceId } from './geo';
import { runMigrations } from './migrations/run-migrations';
import * as signalRepo from './signal-repository';
import * as spatialRepo from './spatial-repository';
import { wrapStatement } from './statement-timer';

// ── Time duration constants (ms) ────────────────────────────────────
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;
const SEVEN_DAYS = 7 * ONE_DAY;
const TEN_MINUTES = 10 * 60 * 1000;

// NOTE: type re-exports removed — consumers import directly from './types'

import type { DbSignal, SpatialQuery, TimeQuery } from './types';

export class RFDatabase {
	private db: Database.Database;
	private statements: Map<string, Database.Statement> = new Map();
	private cleanupService: DatabaseCleanupService | null = null;
	private optimizer: DatabaseOptimizer;
	/**
	 * Resolves once `runMigrations()` has finished (or rejected). Callers that
	 * need the schema fully migrated before issuing queries should `await`
	 * `ready()` — `getRFDatabase()` exposes this via its own helper.
	 */
	private readonly initPromise: Promise<void>;

	constructor(dbPath: string = './rf_signals.db') {
		this.db = new Database(dbPath);
		this.db.pragma('journal_mode = WAL');
		this.db.pragma('synchronous = NORMAL');
		this.db.pragma('cache_size = -64000'); // 64MB (negative = KB)
		this.db.pragma('mmap_size = 134217728'); // 128MB
		this.db.pragma('temp_store = memory');
		this.db.pragma('page_size = 4096');
		this.optimizer = new DatabaseOptimizer(this.db, { shouldAnalyzeOnStart: false });

		try {
			const schemaPath = join(process.cwd(), 'src/lib/server/db/schema.sql');
			this.db.exec(readFileSync(schemaPath, 'utf-8'));
		} catch (error) {
			logger.error('Failed to load schema, using embedded', { error }, 'schema-load-failed');
			this.initializeSchema();
		}

		// runMigrations is async (the TS-migration path uses dynamic import) but the
		// constructor is sync — store the promise on the instance so callers that
		// need migrations completed (e.g. server startup) can `await db.ready()`.
		// Rejections are still logged and swallowed here so a failed migration
		// doesn't surface as an unhandled rejection AFTER the test/caller has
		// moved on (including after db.close() on short-lived in-memory DBs).
		const dbHandle = this.db;
		this.initPromise = (async () => {
			try {
				await runMigrations(dbHandle, join(process.cwd(), 'src/lib/server/db/migrations'));
			} catch (error) {
				logger.warn(
					'Could not run migrations (async)',
					{ error: String(error) },
					'migrations-failed-async'
				);
			}
		})();
		// Defensive: ensure no unhandled rejection if `ready()` is never awaited.
		this.initPromise.catch(() => {
			/* logged above */
		});

		this.prepareStatements();
		this.initializeCleanupService();
	}

	/**
	 * Resolves once async migrations have completed (or failed and been
	 * logged). Synchronous DB operations work without awaiting this — but any
	 * code path that depends on a migrated schema (new columns/indexes/tables)
	 * should `await db.ready()` first.
	 */
	// fallow-ignore-next-line unused-class-member
	// globalThis chain fallow can't trace. Called via getRFDatabaseReady() at database.ts:382 and kismet-signal-source.ts:188.
	ready(): Promise<void> {
		return this.initPromise;
	}

	private initializeSchema() {
		// Embedded schema as fallback
		this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        manufacturer TEXT,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        avg_power REAL,
        freq_min REAL,
        freq_max REAL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signal_id TEXT UNIQUE NOT NULL,
        device_id TEXT,
        timestamp INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        altitude REAL DEFAULT 0,
        power REAL NOT NULL,
        frequency REAL NOT NULL,
        bandwidth REAL,
        modulation TEXT,
        source TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (device_id) REFERENCES devices(device_id)
      );

      CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);
      CREATE INDEX IF NOT EXISTS idx_signals_location ON signals(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_signals_frequency ON signals(frequency);
      CREATE INDEX IF NOT EXISTS idx_signals_power ON signals(power);
      CREATE INDEX IF NOT EXISTS idx_signals_altitude ON signals(altitude);
      CREATE INDEX IF NOT EXISTS idx_signals_device ON signals(device_id);
      CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);
      CREATE INDEX IF NOT EXISTS idx_signals_spatial_grid ON signals(
        CAST(latitude * 10000 AS INTEGER),
        CAST(longitude * 10000 AS INTEGER)
      );
    `);
	}

	private prepareStatements() {
		const p = (name: string, sql: string) => {
			const raw = this.db.prepare(sql);
			this.statements.set(
				name,
				wrapStatement(raw, name, (label, ms) => {
					this.optimizer.trackQuery(label, ms);
					if (this.optimizer.shouldExplain(label)) {
						const plan = this.optimizer.explainQuery(label, []);
						logger.warn('Slow query detected', { label, plan }, 'db-slow-query');
					}
				})
			);
		};

		p(
			'insertSignal',
			`INSERT INTO signals (
			signal_id, device_id, timestamp, latitude, longitude, altitude,
			power, frequency, bandwidth, modulation, source, metadata, session_id
		) VALUES (
			@signal_id, @device_id, @timestamp, @latitude, @longitude, @altitude,
			@power, @frequency, @bandwidth, @modulation, @source, @metadata, @session_id)`
		);

		p(
			'insertDevice',
			`INSERT OR REPLACE INTO devices (
			device_id, type, manufacturer, first_seen, last_seen,
			avg_power, freq_min, freq_max, metadata
		) VALUES (
			@device_id, @type, @manufacturer, @first_seen, @last_seen,
			@avg_power, @freq_min, @freq_max, @metadata)`
		);

		p(
			'findSignalsInRadius',
			`SELECT * FROM signals
			WHERE CAST(latitude * 10000 AS INTEGER) BETWEEN @lat_min AND @lat_max
			AND CAST(longitude * 10000 AS INTEGER) BETWEEN @lon_min AND @lon_max
			AND timestamp > @since ORDER BY timestamp DESC LIMIT @limit`
		);

		p(
			'findNearbyDevices',
			`SELECT DISTINCT d.*, AVG(s.latitude) as avg_lat,
			AVG(s.longitude) as avg_lon, COUNT(s.id) as signal_count
			FROM devices d JOIN signals s ON d.device_id = s.device_id
			WHERE CAST(s.latitude * 10000 AS INTEGER) BETWEEN @lat_min AND @lat_max
			AND CAST(s.longitude * 10000 AS INTEGER) BETWEEN @lon_min AND @lon_max
			AND s.timestamp > @since GROUP BY d.device_id`
		);

		p(
			'updateSignal',
			`UPDATE signals SET timestamp = @timestamp,
			latitude = @latitude, longitude = @longitude, power = @power
			WHERE signal_id = @signal_id`
		);

		p(
			'getAreaStatistics',
			`SELECT
				COUNT(DISTINCT signal_id) as total_signals,
				COUNT(DISTINCT device_id) as unique_devices,
				AVG(power) as avg_power,
				MIN(power) as min_power,
				MAX(power) as max_power,
				MIN(frequency) as min_freq,
				MAX(frequency) as max_freq,
				CAST((MAX(frequency) - MIN(frequency)) / 100 AS INTEGER) + 1 as freq_bands
			FROM signals
			WHERE latitude BETWEEN @minLat AND @maxLat
				AND longitude BETWEEN @minLon AND @maxLon
				AND timestamp > @since`
		);
	}

	// ── Signal operations (delegated to signalRepository) ──────────────

	insertSignal(signal: SignalMarker): DbSignal {
		const inserted = signalRepo.insertSignal(this.db, this.statements, signal);
		emitObservation(inserted);
		return inserted;
	}

	insertSignalsBatch(signals: SignalMarker[]): number {
		const persistedIds = signalRepo.insertSignalsBatch(this.db, this.statements, signals);
		// Only emit observations for signals truly persisted (not validation- or
		// UNIQUE-conflict-rejected) so SSE/bus subscribers don't receive ghosts.
		for (const signal of signals) {
			if (persistedIds.has(signal.id)) {
				emitObservationFromMarker(signal);
			}
		}
		return persistedIds.size;
	}

	// fallow-ignore-next-line unused-class-member
	// globalThis chain fallow can't trace. Called via src/routes/api/signals/+server.ts:32.
	findSignalsInRadius(query: SpatialQuery & TimeQuery): SignalMarker[] {
		return signalRepo.findSignalsInRadius(this.db, this.statements, query);
	}

	// ── Spatial operations (delegated to spatialRepository) ────────────

	// fallow-ignore-next-line unused-class-member
	// globalThis chain fallow can't trace. Called via src/routes/api/signals/statistics/+server.ts:77.
	getAreaStatistics(
		bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
		timeWindow: number = ONE_HOUR
	) {
		return spatialRepo.getAreaStatistics(this.db, this.statements, bounds, timeWindow);
	}

	// ── Lifecycle & utilities ──────────────────────────────────────────

	private initializeCleanupService() {
		try {
			this.cleanupService = new DatabaseCleanupService(this.db, {
				hackrfRetention: ONE_HOUR,
				wifiRetention: SEVEN_DAYS,
				defaultRetention: ONE_HOUR,
				deviceRetention: SEVEN_DAYS,
				patternRetention: ONE_DAY,
				cleanupInterval: ONE_HOUR,
				aggregateInterval: TEN_MINUTES,
				walCheckpointInterval: env.ARGOS_WAL_CHECKPOINT_INTERVAL_MS,
				batchSize: 500,
				maxRuntime: 20000
			});
			this.cleanupService.initialize();
			this.cleanupService.start();
			logger.info('Database cleanup service started', {}, 'cleanup-service-started');
		} catch (error) {
			logger.error(
				'Failed to initialize cleanup service',
				{ error },
				'cleanup-service-init-failed'
			);
		}
	}

	// fallow-ignore-next-line unused-class-member
	// globalThis chain fallow can't trace. Called via src/routes/api/db/cleanup/+server.ts:28.
	getCleanupService(): DatabaseCleanupService | null {
		return this.cleanupService;
	}

	get rawDb(): Database.Database {
		return this.db;
	}

	vacuum() {
		this.db.exec('VACUUM');
	}

	close() {
		if (this.cleanupService) this.cleanupService.stop();
		this.statements.clear();
		this.db.close();
	}
}

/** Fan out a post-insert event for a single row returned by signalRepo. */
function emitObservation(row: DbSignal): void {
	try {
		getSignalBus().emit({
			signalId: row.signal_id,
			sessionId: row.session_id ?? null,
			source: row.source,
			deviceId: row.device_id ?? null,
			lat: row.latitude,
			lon: row.longitude,
			dbm: row.power,
			frequency: row.frequency,
			timestamp: row.timestamp
		});
	} catch (err) {
		logger.debug(
			'[database] signal-bus emit failed',
			{ error: String(err) },
			'signal-bus-emit-failed'
		);
	}
}

/**
 * Fan out a post-batch-insert event from the input marker.
 *
 * Derives `deviceId` via the same `generateDeviceId()` that the signal
 * repository uses when persisting, so batch-emitted observations retain
 * device association — previously this was hardcoded to `null`, leaving SSE
 * subscribers unable to correlate a batch signal back to its device row.
 */
function emitObservationFromMarker(signal: SignalMarker): void {
	try {
		getSignalBus().emit({
			signalId: signal.id,
			sessionId: signal.sessionId ?? null,
			source: String(signal.source),
			deviceId: generateDeviceId(signal),
			lat: signal.lat,
			lon: signal.lon,
			dbm: signal.power,
			frequency: signal.frequency,
			timestamp: signal.timestamp
		});
	} catch (err) {
		logger.debug(
			'[database] signal-bus emit failed (batch)',
			{ error: String(err) },
			'signal-bus-emit-failed-batch'
		);
	}
}

/**
 * Returns the singleton RFDatabase instance, creating it on first call.
 * Stored on `globalThis.__argos_rfdatabase` so the instance survives Vite HMR
 * reloads — module-scope storage would reset on every reload, kicking off a
 * second migration runner that races the first via the `migrations.filename
 * UNIQUE` index. Same pattern as the other __argos_* singletons in app.d.ts.
 */
export function getRFDatabase(): RFDatabase {
	if (!globalThis.__argos_rfdatabase) {
		globalThis.__argos_rfdatabase = new RFDatabase();
	}
	return globalThis.__argos_rfdatabase;
}

/**
 * Returns the singleton RFDatabase instance only after async migrations have
 * completed. Use this from server startup paths or any code that depends on a
 * fully-migrated schema. Synchronous queries against legacy tables are safe
 * via {@link getRFDatabase}.
 */
export async function getRFDatabaseReady(): Promise<RFDatabase> {
	const db = getRFDatabase();
	await db.ready();
	return db;
}

// Guarded via globalThis to prevent listener accumulation on Vite HMR reloads.
// globalThis.__argos_db_shutdown_registered is typed in src/app.d.ts.
if (!globalThis.__argos_db_shutdown_registered) {
	globalThis.__argos_db_shutdown_registered = true;

	const shutdownDb = (signal: string) => {
		logger.info(`${signal} received, closing database`, {}, 'database-shutdown');
		if (globalThis.__argos_rfdatabase) {
			globalThis.__argos_rfdatabase.close();
			globalThis.__argos_rfdatabase = undefined;
		}
	};

	for (const sig of ['SIGTERM', 'SIGINT'] as const) {
		process.on(sig, () => shutdownDb(sig));
	}
}
