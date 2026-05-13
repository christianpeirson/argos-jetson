/**
 * Canonical GPS type definitions with Zod validation
 * Used by tactical-map pages and GPS services.
 * Updated for: Constitutional Audit Remediation (P1)
 * Task: T020
 *
 * Validation rules:
 * - latitude: -90 to 90 degrees
 * - longitude: -180 to 180 degrees
 * - altitude: optional, can be null
 * - speed: optional, non-negative km/h
 * - heading: optional, 0-360 degrees
 */

/**
 * GPS Position type — canonical location fix from gpsd.
 */
export interface GPSPosition {
	latitude: number;
	longitude: number;
	altitude?: number | null;
	speed?: number | null;
	heading?: number | null;
	accuracy?: number;
	satellites?: number;
	fix?: number;
	time?: string;
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use GPSPosition (Zod-validated) instead
 */
export interface GPSPositionData {
	latitude: number;
	longitude: number;
	altitude?: number | null;
	speed?: number | null;
	heading?: number | null;
	accuracy?: number;
	satellites?: number;
	fix?: number;
	time?: string;
}

// Re-exported via tactical-map/gps-service.ts for backward compatibility
// fallow-ignore-next-line unused-type
export interface GPSApiResponse {
	success: boolean;
	data?: GPSPositionData;
	error?: string;
	mode?: number;
	details?: string;
}

/**
 * Individual satellite data from gpsd SKY message.
 */
export interface Satellite {
	prn: number;
	constellation: 'GPS' | 'GLONASS' | 'Galileo' | 'BeiDou';
	snr: number;
	elevation: number;
	azimuth: number;
	used: boolean;
}

/**
 * API response for /api/gps/satellites endpoint.
 */
export interface SatellitesApiResponse {
	success: boolean;
	satellites: Satellite[];
	error?: string;
}
