/**
 * TAK server client (thin orchestrator).
 *
 * Owns the singleton `TakService` EventEmitter + the connection lifecycle
 * state machine. Delegates to peer modules:
 *   - `./tak-connection` — config validation, certificate loading, TAK
 *     socket construction, reconnect-backoff math.
 *   - `./tak-outbound`   — per-UID CoT throttling (CotThrottler).
 *   - `./tak-broadcast`  — WebSocket status/CoT fan-out.
 *   - `./tak-sa-broadcaster` — periodic self-SA emission.
 *   - `./tak-db`         — config persistence (loadTakConfig / saveTakConfig).
 *
 * Public surface (imported by routes + TakSaBroadcaster): the `TakService`
 * class with `getInstance`, `initialize`, `reloadConfig`, `connect`,
 * `disconnect`, `getStatus`, `sendCot`, `saveConfig`. Kept frozen across
 * this refactor.
 *
 * @module
 */

import type CoT from '@tak-ps/node-cot';
import { CoTParser } from '@tak-ps/node-cot';
import type TAK from '@tak-ps/node-tak';
import { EventEmitter } from 'events';

import { logger } from '$lib/utils/logger';

import type { TakServerConfig, TakStatus } from '../../types/tak';
import { getRFDatabase, RFDatabase } from '../db/database';
import { broadcastTakCot, broadcastTakStatus } from './tak-broadcast';
import {
	computeReconnectDelay,
	loadCertificates,
	openTakConnection,
	STALE_THRESHOLD_MS,
	type TakCerts,
	type ValidatedTakConfig,
	validateTlsConfig
} from './tak-connection';
import { loadTakConfig, saveTakConfig } from './tak-db';
import { CotThrottler } from './tak-outbound';
import { TakSaBroadcaster } from './tak-sa-broadcaster';

export class TakService extends EventEmitter {
	private static instance: TakService;
	private tak: TAK | null = null;
	private config: TakServerConfig | null = null;
	private db: RFDatabase;
	private shouldConnect = false;
	private messageCount = 0;
	private connectedAt: number | null = null;
	private lastActivityAt: number | null = null;
	private reconnectAttempt = 0;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private saBroadcaster: TakSaBroadcaster;
	private throttler: CotThrottler;

	private constructor() {
		super();
		// Reuse the shared RFDatabase singleton. Constructing a new instance
		// triggers a second migration runner against the same on-disk DB, which
		// races the primary runner and fails with `UNIQUE constraint failed:
		// migrations.filename` on fresh installs (spec-024 reproducer).
		this.db = getRFDatabase();
		this.saBroadcaster = new TakSaBroadcaster(this);
		this.throttler = new CotThrottler(() => this.tak);
	}

	public static getInstance(): TakService {
		if (!TakService.instance) {
			TakService.instance = new TakService();
		}
		return TakService.instance;
	}

	// Singleton chain fallow can't trace. Called via bootstrap.ts:32.
	// fallow-ignore-next-line unused-class-member
	public async initialize() {
		logger.info('[TakService] Initializing...');
		this.config = loadTakConfig(this.db.rawDb);
		if (this.config?.shouldConnectOnStartup) {
			this.shouldConnect = true;
			await this.connect();
		}
	}

	// Singleton chain fallow can't trace. Called via src/routes/api/tak/connection/+server.ts:16.
	/** Reload config from DB — call before connect() if config may have changed externally. */
	// fallow-ignore-next-line unused-class-member
	public reloadConfig() {
		this.config = loadTakConfig(this.db.rawDb);
	}

	/** Calculate uptime in seconds from connection start, or undefined */
	private getUptime(): number | undefined {
		if (!this.connectedAt) return undefined;
		return Math.floor((Date.now() - this.connectedAt) / 1000);
	}

	/** Derive connection health from activity timestamp */
	private getConnectionHealth(
		isOpen: boolean
	): Pick<TakStatus, 'lastActivityAt' | 'staleSinceMs' | 'connectionHealth'> {
		if (!isOpen)
			return { lastActivityAt: null, staleSinceMs: null, connectionHealth: 'disconnected' };
		if (!this.lastActivityAt)
			return { lastActivityAt: null, staleSinceMs: null, connectionHealth: 'healthy' };
		const staleMs = Date.now() - this.lastActivityAt;
		const iso = new Date(this.lastActivityAt).toISOString();
		return {
			lastActivityAt: iso,
			staleSinceMs: staleMs,
			connectionHealth: staleMs > STALE_THRESHOLD_MS ? 'stale' : 'healthy'
		};
	}

	// Singleton chain fallow can't trace. Called via src/routes/api/tak/connection/+server.ts:8.
	// fallow-ignore-next-line unused-class-member
	public getStatus(): TakStatus {
		const isOpen = !!this.tak?.open;
		return {
			status: isOpen ? 'connected' : 'disconnected',
			serverName: this.config?.name,
			serverHost: this.config?.hostname,
			uptime: this.getUptime(),
			messageCount: this.messageCount,
			...this.getConnectionHealth(isOpen),
			saBroadcast: this.saBroadcaster.getStatus()
		};
	}

	/** Destroy existing TAK connection if any */
	private destroyExisting(): void {
		if (!this.tak) return;
		this.tak.destroy();
		this.tak = null;
	}

	/** Establish the TAK TLS connection + wire event handlers */
	private async establishConnection(config: ValidatedTakConfig, certs: TakCerts): Promise<void> {
		this.tak = await openTakConnection(config, certs);
		this.setupEventHandlers();
		this.reconnectAttempt = 0;
		logger.info('[TakService] Connection initiated');
	}

	/** Handle a connection failure: log, broadcast, optionally reconnect */
	private handleConnectError(err: unknown): void {
		logger.error('[TakService] Connection failed', { error: String(err) });
		broadcastTakStatus(
			this.broadcastState(),
			'error',
			err instanceof Error ? err.message : 'Connection failed'
		);
		if (this.shouldConnect) this.scheduleReconnect();
	}

	public async connect() {
		const validated = validateTlsConfig(this.config);
		if (!validated) return;
		this.destroyExisting();

		const result = await loadCertificates(validated);
		if (!result.ok) {
			broadcastTakStatus(this.broadcastState(), 'error', result.error);
			return;
		}

		try {
			await this.establishConnection(validated, result.certs);
		} catch (err) {
			this.handleConnectError(err);
		}
	}

	private setupEventHandlers() {
		if (!this.tak) return;

		this.tak.on('secureConnect', () => {
			logger.info('[TakService] Securely connected');
			this.connectedAt = Date.now();
			this.lastActivityAt = Date.now();
			this.emit('status', 'connected');
			broadcastTakStatus(this.broadcastState(), 'connected');
			this.saBroadcaster.start();
		});

		this.tak.on('cot', (cot: CoT) => {
			this.messageCount++;
			this.lastActivityAt = Date.now();
			this.emit('cot', cot);
			broadcastTakCot(CoTParser.to_xml(cot));
		});

		this.tak.on('end', () => {
			logger.info('[TakService] Connection ended');
			this.saBroadcaster.stop();
			this.connectedAt = null;
			this.lastActivityAt = null;
			this.emit('status', 'disconnected');
			broadcastTakStatus(this.broadcastState(), 'disconnected');
			if (this.shouldConnect) this.scheduleReconnect();
		});

		this.tak.on('timeout', () => logger.warn('[TakService] Connection timeout'));

		this.tak.on('error', (err: Error) => {
			logger.error('[TakService] TAK socket error', { error: err.message });
			// We don't use this.emit('error', err) because Node.js crashes on unhandled 'error' events
			this.emit('tak-socket-error', err);
			this.saBroadcaster.stop();
			broadcastTakStatus(this.broadcastState(), 'error', err.message);
			this.connectedAt = null;
			this.lastActivityAt = null;
			if (this.shouldConnect) this.scheduleReconnect();
		});

		this.tak.on('ping', () => {
			this.lastActivityAt = Date.now();
			if (!this.connectedAt) this.connectedAt = Date.now();
		});
	}

	private scheduleReconnect() {
		if (this.reconnectTimeout) return;
		const delay = computeReconnectDelay(this.reconnectAttempt);
		this.reconnectAttempt++;
		logger.info('[TakService] Reconnecting', {
			delayMs: Math.round(delay),
			attempt: this.reconnectAttempt
		});
		this.reconnectTimeout = setTimeout(async () => {
			this.reconnectTimeout = null;
			try {
				await this.connect();
			} catch (err) {
				logger.error('[TakService] Reconnect failed', { error: String(err) });
			}
		}, delay);
	}

	// Singleton chain fallow can't trace. Called via src/routes/api/tak/connection/+server.ts:26.
	// fallow-ignore-next-line unused-class-member
	public disconnect() {
		this.shouldConnect = false;
		this.saBroadcaster.stop();
		if (this.tak) {
			this.tak.destroy();
			this.tak = null;
		}
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
		this.throttler.clear();
		this.connectedAt = null;
		this.emit('status', 'disconnected');
		broadcastTakStatus(this.broadcastState(), 'disconnected');
	}

	// Singleton chain fallow can't trace. Called via tak-sa-broadcaster.ts:120 (CotSender interface dispatch).
	/** Sends a CoT message, throttled to max 1 update/sec per entity UID. */
	// fallow-ignore-next-line unused-class-member
	public sendCot(cot: CoT) {
		this.throttler.send(cot);
	}

	// Singleton chain fallow can't trace. Called via src/routes/api/tak/config/+server.ts:52.
	// fallow-ignore-next-line unused-class-member
	public async saveConfig(config: TakServerConfig) {
		saveTakConfig(this.db.rawDb, config);
		this.config = config;
		if (this.shouldConnect) await this.connect();
	}

	/** Snapshot current state for broadcast functions */
	private broadcastState() {
		return {
			config: this.config,
			connectedAt: this.connectedAt,
			messageCount: this.messageCount,
			saBroadcast: this.saBroadcaster.getStatus()
		};
	}
}
