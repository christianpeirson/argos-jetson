// Kismet server types — only types actively imported by kismet modules

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
	type:
		| 'device_discovered'
		| 'device_updated'
		| 'device_lost'
		| 'security_threat'
		| 'correlation_found'
		| 'status_update'
		| 'device_update'
		| 'status_change'
		| 'error'
		| 'tak_status'
		| 'tak_cot'
		| 'bluetooth_device_update'
		| 'bluetooth_status_update'
		| 'uas_device_update'
		| 'uas_status_update';
	data: Record<string, unknown>;
	timestamp: string;
}

/**
 * Compatible KismetDevice interface
 */
export interface KismetDevice {
	mac: string;
	ssid?: string;
	type: string;
	manufacturer?: string;
	firstSeen: number;
	lastSeen: number;
	signal: {
		last_signal?: number;
		max_signal?: number;
		min_signal?: number;
	};
	signalStrength: number;
	channel: number;
	frequency: number;
	encryptionType?: string[];
	encryption?: string[];
	location?: {
		latitude: number;
		longitude: number;
		accuracy?: number;
	};
	packets: number;
	dataSize: number;
	dataPackets?: number;
	clients?: string[];
	parentAP?: string;
	probeRequests?: string[];
	macaddr: string; // Alias for mac
}

/**
 * Device filter for queries
 */
export interface DeviceFilter {
	type?: string;
	manufacturer?: string;
	encryption?: string;
	ssid?: string;
	minSignal?: number;
	maxSignal?: number;
	seenWithin?: number; // minutes
	signalStrength?: {
		min?: number;
		max?: number;
	};
	lastSeen?: {
		after?: Date;
		before?: Date;
	};
	location?: {
		latitude: number;
		longitude: number;
		radius: number;
	};
}
