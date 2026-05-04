// Proxy for Kismet REST API
import { env } from '$lib/server/env';
import { logger } from '$lib/utils/logger';

import type { KismetDeviceResponse } from './kismet-proxy-transform';
import { transformDevice } from './kismet-proxy-transform';
import type { DeviceFilter, KismetDevice } from './types';

/** Milliseconds per minute (time-window conversion for device-recency filters). */
const MS_PER_MINUTE = 60 * 1000;

interface KismetQueryRequest {
	fields: string[];
	regex?: Array<[string, string]>;
}

interface KismetSystemStatus {
	[key: string]: unknown;
}

export class KismetProxy {
	// Read configuration from typed env module
	private static readonly KISMET_HOST = env.KISMET_HOST;
	private static readonly KISMET_PORT = String(env.KISMET_PORT);
	private static readonly API_KEY = env.KISMET_API_KEY;
	private static readonly KISMET_USER = env.KISMET_USER;
	private static readonly BASE_URL = `http://${KismetProxy.KISMET_HOST}:${KismetProxy.KISMET_PORT}`;

	private static getPassword(): string {
		if (!env.KISMET_PASSWORD) {
			throw new Error(
				'KISMET_PASSWORD environment variable must be set. See .env.example for configuration.'
			);
		}
		return env.KISMET_PASSWORD;
	}

	/** Build request headers including auth and API key */
	private static buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
		const auth = Buffer.from(`${this.KISMET_USER}:${this.getPassword()}`).toString('base64');
		const headers: Record<string, string> = {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/json',
			...(extraHeaders || {})
		};
		if (this.API_KEY) headers['KISMET'] = this.API_KEY;
		return headers;
	}

	/** Wrap connection refused errors with a user-friendly message */
	private static wrapConnectionError(error: unknown): never {
		if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
			throw new Error('Cannot connect to Kismet. Is it running?');
		}
		throw error;
	}

	/** Make a request to the Kismet API */
	private static async request<T = unknown>(
		endpoint: string,
		options: globalThis.RequestInit = {}
	): Promise<T> {
		const url = `${this.BASE_URL}${endpoint}`;
		// Safe: options.headers may be Headers or Record; cast to Record for spread
		const headers = this.buildHeaders((options.headers as Record<string, string>) || undefined);

		try {
			const response = await fetch(url, { ...options, headers });
			if (!response.ok) {
				throw new Error(`Kismet API error: ${response.status} ${response.statusText}`);
			}
			// Safe: Caller provides T matching the expected Kismet API response shape
			return (await response.json()) as T;
		} catch (error) {
			this.wrapConnectionError(error);
		}
	}

	/** Kismet device query fields */
	private static readonly DEVICE_FIELDS = [
		'kismet.device.base.macaddr',
		'kismet.device.base.name',
		'kismet.device.base.type',
		'kismet.device.base.channel',
		'kismet.device.base.frequency',
		'kismet.device.base.signal',
		'kismet.device.base.first_time',
		'kismet.device.base.last_time',
		'kismet.device.base.packets.total',
		'kismet.device.base.packets.data',
		'kismet.device.base.crypt',
		'kismet.device.base.location',
		'kismet.device.base.manuf',
		'dot11.device'
	];

	/** Build regex filters from DeviceFilter */
	private static buildQueryRegex(filter?: DeviceFilter): Array<[string, string]> {
		const regex: Array<[string, string]> = [];
		if (filter?.ssid) regex.push(['kismet.device.base.name', filter.ssid]);
		if (filter?.manufacturer) regex.push(['kismet.device.base.manuf', filter.manufacturer]);
		return regex;
	}

	/** Get all devices from Kismet */
	static async getDevices(filter?: DeviceFilter): Promise<KismetDevice[]> {
		try {
			const query: KismetQueryRequest = { fields: this.DEVICE_FIELDS };
			const regex = this.buildQueryRegex(filter);
			if (regex.length > 0) query.regex = regex;

			const devices = await this.request<KismetDeviceResponse[]>(
				'/devices/views/all/devices.json',
				{ method: 'POST', body: JSON.stringify(query) }
			);

			const transformed = devices.map((device) => transformDevice(device));
			return filter ? this.applyFilters(transformed, filter) : transformed;
		} catch (error) {
			logger.error('[kismet-proxy] Error fetching devices', { error: String(error) });
			throw error;
		}
	}

	/** Check if a value is within optional bounds */
	private static isInRange(
		value: number | undefined,
		min: number | undefined,
		max: number | undefined
	): boolean {
		if (value === undefined) return true;
		if (min !== undefined && value < min) return false;
		return !(max !== undefined && value > max);
	}

	/** Check if device signal is within filter bounds */
	private static matchesSignal(device: KismetDevice, filter: DeviceFilter): boolean {
		return this.isInRange(device.signalStrength, filter.minSignal, filter.maxSignal);
	}

	/** Check if device was seen within the time window */
	private static matchesRecency(device: KismetDevice, seenWithin: number): boolean {
		const lastSeenTime = new Date(device.lastSeen).getTime();
		return lastSeenTime >= Date.now() - seenWithin * MS_PER_MINUTE;
	}

	/** Check if a single device passes all filter criteria */
	private static matchesFilter(device: KismetDevice, filter: DeviceFilter): boolean {
		if (filter.type && device.type !== filter.type) return false;
		if (!this.matchesSignal(device, filter)) return false;
		return !(
			filter.seenWithin !== undefined && !this.matchesRecency(device, filter.seenWithin)
		);
	}

	/** Apply filters that can't be done via Kismet query */
	private static applyFilters(devices: KismetDevice[], filter: DeviceFilter): KismetDevice[] {
		return devices.filter((device) => this.matchesFilter(device, filter));
	}

	/** Generic proxy method for GET requests */
	static async proxyGet(path: string): Promise<unknown> {
		return this.request(path, { method: 'GET' });
	}

	/** Get Kismet system status */
	static async getSystemStatus(): Promise<KismetSystemStatus> {
		return this.request<KismetSystemStatus>('/system/status.json');
	}

	/** Check if API key is configured */
	static isApiKeyConfigured(): boolean {
		return this.API_KEY !== '';
	}

	/** Get proxy configuration info */
	static getConfig() {
		return {
			host: this.KISMET_HOST,
			port: this.KISMET_PORT,
			baseUrl: this.BASE_URL,
			apiKeyConfigured: this.isApiKeyConfigured()
		};
	}
}
