/**
 * Kismet device Zod schema with runtime validation
 * Created for: Constitutional Audit Remediation (P1)
 * Task: T023
 *
 * Validation rules:
 * - mac: MAC address format
 * - signal: -120 to 0 dBm range
 * - channel: positive integer
 * - frequency: positive number in MHz
 */

import { z } from 'zod';

/**
 * MAC address regex pattern
 */
const MAC_ADDRESS_REGEX = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;

/**
 * Kismet Device Zod schema for runtime validation
 */
export const KismetDeviceSchema = z
	.object({
		mac: z
			.string()
			.regex(MAC_ADDRESS_REGEX, 'Must be valid MAC address')
			.describe('Device MAC address'),
		macaddr: z.string().regex(MAC_ADDRESS_REGEX).optional().describe('Alias for mac'),
		last_seen: z.number().int().positive().describe('Last seen timestamp (Unix ms)'),
		last_time: z.number().int().positive().optional(),
		firstSeen: z.number().int().positive().optional(),
		lastSeen: z.number().int().positive().optional(),
		signal: z.object({
			last_signal: z
				.number()
				.min(-120)
				.max(0)
				.optional()
				.describe('Last signal strength (dBm)'),
			max_signal: z
				.number()
				.min(-120)
				.max(0)
				.optional()
				.describe('Max signal strength (dBm)'),
			min_signal: z.number().min(-120).max(0).optional().describe('Min signal strength (dBm)')
		}),
		signalStrength: z.number().min(-120).max(0).optional(),
		manufacturer: z.string().optional().describe('Device manufacturer'),
		manuf: z.string().optional().describe('Manufacturer alias'),
		type: z.string().describe('Device type (AP, client, etc.)'),
		channel: z.number().int().positive().describe('WiFi channel'),
		frequency: z.number().positive().describe('Frequency in MHz'),
		packets: z.number().int().nonnegative().describe('Total packets seen'),
		datasize: z.number().int().nonnegative().describe('Total data size in bytes'),
		dataSize: z.number().int().nonnegative().optional(),
		ssid: z.string().optional().describe('WiFi SSID (for APs)'),
		encryption: z.array(z.string()).optional().describe('Encryption types'),
		encryptionType: z.array(z.string()).optional(),
		location: z
			.object({
				lat: z.number().min(-90).max(90),
				lon: z.number().min(-180).max(180)
			})
			.optional()
			.describe('Device location (if available)'),
		clients: z.array(z.string()).optional().describe('Connected client MACs'),
		parentAP: z.string().optional().describe('Parent AP MAC (for clients)')
	})
	.passthrough(); // Allow additional Kismet dynamic properties

/**
 * Legacy interface for backward compatibility
 * @deprecated Use KismetDeviceValidated (Zod-validated) instead
 */
export interface KismetDevice {
	// Kismet REST API returns deeply nested dynamic fields (dot11.device.*, kismet.device.base.*) requiring index signature
	[key: string]: unknown;

	mac: string;
	macaddr?: string; // Alias for mac
	last_seen: number;
	last_time?: number;
	firstSeen?: number;
	lastSeen?: number;
	signal: {
		last_signal?: number;
		max_signal?: number;
		min_signal?: number;
	};
	signalStrength?: number;
	manufacturer?: string;
	manuf?: string;
	type: string;
	channel: number;
	frequency: number;
	packets: number;
	datasize: number;
	dataSize?: number;
	ssid?: string;
	encryption?: string[];
	encryptionType?: string[];
	location?: {
		lat: number;
		lon: number;
	};
	clients?: string[];
	parentAP?: string;
}
