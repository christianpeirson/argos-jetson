/**
 * Data fetching functions for TopStatusBar — hardware status, details, weather, geocoding, satellites.
 * Extracted from TopStatusBar to separate data concerns from presentation.
 */
import { fetchJSON } from '$lib/utils/fetch-json';
import { haversineMeters } from '$lib/utils/geo';

import type { WeatherData } from './weather-helpers';

export interface WifiInfo {
	interface?: string;
	monitorInterface?: string;
	mac?: string;
	driver?: string;
	chipset?: string;
	mode?: string;
	channel?: string;
	bands?: string[];
	owner?: string;
}

export interface SdrInfo {
	serial?: string;
	product?: string;
	manufacturer?: string;
	firmwareApi?: string;
	usbSpeed?: string;
	maxPower?: string;
	configuration?: string;
	owner?: string;
}

export interface GpsInfo {
	device?: string;
	protocol?: string;
	baudRate?: number;
	usbAdapter?: string;
	gpsdVersion?: string;
}

export type DeviceState = 'active' | 'standby' | 'offline';

export interface HardwareStatusResult {
	wifiState: DeviceState;
	wifiOwner?: string;
	sdrState: DeviceState;
	sdrOwner?: string;
}

/** Determine device state from detection and ownership. */
function resolveDeviceState(hw: { isDetected?: boolean; owner?: string }): DeviceState {
	if (!hw?.isDetected) return 'offline';
	return hw.owner ? 'active' : 'standby';
}

/** Build hardware status result from API response. */
function buildHardwareResult(
	status: Record<string, Record<string, unknown>>
): HardwareStatusResult {
	return {
		wifiState: resolveDeviceState(status.alfa),
		wifiOwner: status.alfa?.owner as string | undefined,
		sdrState: resolveDeviceState(status.hackrf),
		sdrOwner: status.hackrf?.owner as string | undefined
	};
}

export async function fetchHardwareStatus(): Promise<HardwareStatusResult | null> {
	const data = await fetchJSON<Record<string, Record<string, unknown>>>('/api/hardware/status');
	return data ? buildHardwareResult(data) : null;
}

export interface HardwareDetailsResult {
	wifi?: Partial<WifiInfo>;
	sdr?: Partial<SdrInfo>;
	gps?: Partial<GpsInfo>;
}

export async function fetchHardwareDetails(): Promise<HardwareDetailsResult | null> {
	return fetchJSON<HardwareDetailsResult>('/api/hardware/details');
}

/** Open-Meteo /v1/forecast current_weather response shape (relevant fields only). */
interface OpenMeteoCurrentWeather {
	error?: boolean;
	temperature_2m: number;
	apparent_temperature: number;
	relative_humidity_2m: number;
	wind_speed_10m: number;
	wind_gusts_10m: number;
	precipitation: number;
	pressure_msl: number;
	weather_code: number;
	is_day: number;
}

/** Map API weather response to WeatherData, returning null on error responses. */
function mapWeatherResponse(data: OpenMeteoCurrentWeather): WeatherData | null {
	if (data.error) return null;
	return {
		temperature: data.temperature_2m,
		apparentTemperature: data.apparent_temperature,
		humidity: data.relative_humidity_2m,
		windSpeed: data.wind_speed_10m,
		windGusts: data.wind_gusts_10m,
		precipitation: data.precipitation,
		pressure: data.pressure_msl,
		weatherCode: data.weather_code,
		isDay: data.is_day === 1
	};
}

/** Check if position has moved enough to warrant a new fetch. */
function hasMoved(
	lat: number,
	lon: number,
	lastLat: number,
	lastLon: number,
	thresholdMeters: number
): boolean {
	return haversineMeters(lat, lon, lastLat, lastLon) >= thresholdMeters;
}

// fallow-ignore-next-line complexity
export async function fetchWeather(
	lat: number,
	lon: number,
	lastLat: number,
	lastLon: number,
	hasExistingData: boolean
): Promise<WeatherData | null> {
	if (hasExistingData && !hasMoved(lat, lon, lastLat, lastLon, 1000)) return null;

	try {
		const res = await fetch(`/api/weather/current?lat=${lat}&lon=${lon}`);
		if (!res.ok) return null;
		const data = (await res.json()) as OpenMeteoCurrentWeather;
		return mapWeatherResponse(data);
	} catch {
		return null;
	}
}

/** Extract location name from geocode API response. */
function extractLocationName(data: Record<string, unknown>): string | null {
	return data.success && data.locationName ? (data.locationName as string) : null;
}

// fallow-ignore-next-line complexity
export async function reverseGeocode(
	lat: number,
	lon: number,
	lastLat: number,
	lastLon: number,
	hasExistingName: boolean
): Promise<string | null> {
	if (hasExistingName && !hasMoved(lat, lon, lastLat, lastLon, 500)) return null;

	try {
		const res = await fetch(`/api/gps/location?lat=${lat}&lon=${lon}`);
		if (!res.ok) return null;
		return extractLocationName(await res.json());
	} catch {
		return null;
	}
}
