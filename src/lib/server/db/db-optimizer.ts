/**
 * Database Optimizer
 * Advanced optimization strategies for SQLite performance
 */

import type { Database as DatabaseType } from 'better-sqlite3';

import { errMsg } from '$lib/server/api/error-utils';

import { getHealthReport } from './db-health-report';
import { getIndexAnalysis } from './db-index-analysis';

// SQLite PRAGMA defaults (see https://sqlite.org/pragma.html)
/** Default page cache size. Negative = KiB (−2000 = 2 MiB). */
const DEFAULT_CACHE_SIZE_KIB = -2000;
/** Default database page size in bytes (power of two, 4 KiB standard). */
const DEFAULT_PAGE_SIZE_BYTES = 4096;
/** Default memory-mapped I/O window in bytes (30 MB). */
const DEFAULT_MMAP_SIZE_BYTES = 30_000_000;
/** Default SQLite soft heap limit per connection (50 MiB). */
const DEFAULT_MEMORY_LIMIT_BYTES = 50 * 1024 * 1024;
/** Default WAL checkpoint trigger (pages between auto-checkpoints). */
const DEFAULT_WAL_AUTOCHECKPOINT_PAGES = 1000;

// Per-workload PRAGMA tunings applied by optimizeForWorkload()
/** Read-heavy: 4 MiB cache, 256 MiB mmap, 8 KiB pages. */
const READ_HEAVY_CACHE_KIB = -4000;
const READ_HEAVY_MMAP_BYTES = 268_435_456;
const READ_HEAVY_PAGE_SIZE_BYTES = 8192;
/** Write-heavy: 1 MiB cache, aggressive 100-page WAL checkpoint, synchronous=OFF. */
const WRITE_HEAVY_CACHE_KIB = -1000;
const WRITE_HEAVY_WAL_AUTOCHECKPOINT_PAGES = 100;

// Query-explain thresholds
/** Average-query-time threshold (ms) above which shouldExplain() returns true. */
const DEFAULT_EXPLAIN_THRESHOLD_MS = 50;
/** Average-query-time threshold (ms) above which a query is reported as slow. */
const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 100;

interface OptimizationConfig {
	// Performance tuning
	cacheSize: number;
	pageSize: number;
	mmapSize: number;
	isWalMode: boolean;
	synchronous: 'OFF' | 'NORMAL' | 'FULL';

	// Query optimization
	shouldAnalyzeOnStart: boolean;
	shouldAutoIndex: boolean;
	shouldUseQueryPlanner: boolean;

	// Memory limits
	tempStore: 'DEFAULT' | 'FILE' | 'MEMORY';
	tempStoreDirectory?: string;
	memoryLimit?: number;
}

interface QueryStats {
	query: string;
	count: number;
	totalTime: number;
	avgTime: number;
	lastRun: number;
}

export class DatabaseOptimizer {
	private db: DatabaseType;
	private config: OptimizationConfig;
	private queryStats: Map<string, QueryStats> = new Map();

	constructor(db: DatabaseType, config?: Partial<OptimizationConfig>) {
		this.db = db;
		this.config = {
			cacheSize: DEFAULT_CACHE_SIZE_KIB,
			pageSize: DEFAULT_PAGE_SIZE_BYTES,
			mmapSize: DEFAULT_MMAP_SIZE_BYTES,
			isWalMode: true,
			synchronous: 'NORMAL',
			shouldAnalyzeOnStart: true,
			shouldAutoIndex: true,
			shouldUseQueryPlanner: false,
			tempStore: 'MEMORY',
			memoryLimit: DEFAULT_MEMORY_LIMIT_BYTES,
			...config
		};

		this.applyOptimizations();
	}

	/** Conditional pragmas that depend on config flags. */
	private conditionalPragmas(): Array<[boolean, ...string[]]> {
		const c = this.config;
		return [
			[
				c.isWalMode,
				'journal_mode = WAL',
				`wal_autocheckpoint = ${DEFAULT_WAL_AUTOCHECKPOINT_PAGES}`
			],
			[c.mmapSize > 0, `mmap_size = ${c.mmapSize}`],
			[!!c.memoryLimit, `soft_heap_limit = ${c.memoryLimit}`],
			[c.shouldUseQueryPlanner, 'query_only = 0'],
			[
				!!c.tempStoreDirectory,
				`temp_store_directory = '${(c.tempStoreDirectory ?? '').replace(/'/g, "''")}'`
			]
		];
	}

	/** Build the list of pragma statements to apply based on config. */
	private buildPragmaList(): string[] {
		const c = this.config;
		const pragmas: string[] = [
			`cache_size = ${c.cacheSize}`,
			`synchronous = ${c.synchronous}`,
			`temp_store = ${c.tempStore}`,
			`automatic_index = ${c.shouldAutoIndex ? 'ON' : 'OFF'}`
		];
		for (const [enabled, ...stmts] of this.conditionalPragmas()) {
			if (enabled) pragmas.push(...stmts);
		}
		return pragmas;
	}

	/** Apply database optimizations */
	private applyOptimizations() {
		for (const pragma of this.buildPragmaList()) {
			this.db.pragma(pragma);
		}
		if (this.config.shouldAnalyzeOnStart) this.analyze();
	}

	/** Analyze database statistics */
	analyze() {
		this.db.exec('ANALYZE');
	}

	/** Get current pragma settings */
	getPragmaSettings() {
		const pragmas = [
			'cache_size',
			'page_size',
			'journal_mode',
			'synchronous',
			'mmap_size',
			'temp_store',
			'soft_heap_limit',
			'automatic_index',
			'wal_autocheckpoint',
			'page_count',
			'freelist_count'
		];

		const settings: Record<string, unknown> = {};
		for (const pragma of pragmas) {
			try {
				settings[pragma] = this.db.pragma(pragma);
			} catch (_error: unknown) {
				// Some pragmas might not be available
			}
		}
		return settings;
	}

	/** Get index statistics and suggestions -- delegates to db-index-analysis */
	getIndexAnalysis() {
		return getIndexAnalysis(this.db);
	}

	/** Get query execution plan */
	explainQuery(query: string, params: unknown[] = []) {
		try {
			// Safe: spread requires tuple type; params is unknown[] used as positional bind args
			const plan = this.db.prepare(`EXPLAIN QUERY PLAN ${query}`).all(...(params as []));
			const stats = this.db.prepare(`EXPLAIN ${query}`).all(...(params as []));

			return {
				plan,
				stats,
				estimatedCost: this.estimateQueryCost(plan)
			};
		} catch (error) {
			return { error: errMsg(error) };
		}
	}

	/** Cost weights for query plan operations. */
	private static readonly PLAN_COSTS: Array<{ pattern: string; cost: number }> = [
		{ pattern: 'SCAN TABLE', cost: 1000 },
		{ pattern: 'SEARCH TABLE', cost: 100 },
		{ pattern: 'TEMP B-TREE', cost: 500 },
		{ pattern: 'USING COVERING INDEX', cost: 5 },
		{ pattern: 'USING INDEX', cost: 10 }
	];

	/** Calculate the cost contribution of a single plan step. */
	private static stepCost(detail: string): number {
		return DatabaseOptimizer.PLAN_COSTS.reduce(
			(sum, entry) => sum + (detail.includes(entry.pattern) ? entry.cost : 0),
			0
		);
	}

	/** Estimate query cost from execution plan */
	private estimateQueryCost(plan: unknown[]) {
		return plan.reduce((cost: number, step) => {
			const detail = (step as { detail?: string }).detail;
			return detail ? cost + DatabaseOptimizer.stepCost(detail) : cost;
		}, 0);
	}

	/** Monitor query performance */
	trackQuery(query: string, duration: number) {
		const stats = this.queryStats.get(query) || {
			query,
			count: 0,
			totalTime: 0,
			avgTime: 0,
			lastRun: 0
		};
		stats.count++;
		stats.totalTime += duration;
		stats.avgTime = stats.totalTime / stats.count;
		stats.lastRun = Date.now();
		this.queryStats.set(query, stats);
	}

	/** Returns true if the named query's average execution time exceeds thresholdMs. */
	shouldExplain(label: string, thresholdMs = DEFAULT_EXPLAIN_THRESHOLD_MS): boolean {
		return (this.queryStats.get(label)?.avgTime ?? 0) > thresholdMs;
	}

	/** Get slow queries */
	getSlowQueries(threshold: number = DEFAULT_SLOW_QUERY_THRESHOLD_MS) {
		return Array.from(this.queryStats.values())
			.filter((stats) => stats.avgTime > threshold)
			.sort((a, b) => b.avgTime - a.avgTime);
	}

	/** Optimize for specific workload */
	optimizeForWorkload(workload: 'read_heavy' | 'write_heavy' | 'mixed') {
		switch (workload) {
			case 'read_heavy':
				this.db.pragma(`cache_size = ${READ_HEAVY_CACHE_KIB}`);
				this.db.pragma(`mmap_size = ${READ_HEAVY_MMAP_BYTES}`);
				this.db.pragma('synchronous = NORMAL');
				this.db.pragma(`page_size = ${READ_HEAVY_PAGE_SIZE_BYTES}`);
				break;
			case 'write_heavy':
				this.db.pragma(`cache_size = ${WRITE_HEAVY_CACHE_KIB}`);
				this.db.pragma('synchronous = OFF');
				this.db.pragma('journal_mode = WAL');
				this.db.pragma(`wal_autocheckpoint = ${WRITE_HEAVY_WAL_AUTOCHECKPOINT_PAGES}`);
				break;
			case 'mixed':
				this.db.pragma(`cache_size = ${DEFAULT_CACHE_SIZE_KIB}`);
				this.db.pragma('synchronous = NORMAL');
				this.db.pragma('journal_mode = WAL');
				this.db.pragma(`wal_autocheckpoint = ${DEFAULT_WAL_AUTOCHECKPOINT_PAGES}`);
				break;
		}
	}

	/** Get database health report -- delegates to db-health-report */
	getHealthReport() {
		return getHealthReport(this.db, this.getPragmaSettings(), this.getSlowQueries());
	}
}
