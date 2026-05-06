import { AlfaDetector } from '$lib/server/kismet/alfa-detector';

import type { ProcessConfig } from './process-utils';
import { findBlockingProcesses, killMatchingProcesses } from './process-utils';

/** ALFA adapter process configs — all native binaries using exact comm match */
const ALFA_PROCESS_CONFIGS: ProcessConfig[] = [
	{ name: 'kismet' },
	{ name: 'wifite' },
	{ name: 'bettercap' },
	{ name: 'airodump-ng' },
	{ name: 'aireplay-ng' }
];

/** Detects the ALFA USB Wi-Fi adapter and returns its interface name, or null if absent. */
export async function detectAdapter(): Promise<string | null> {
	return AlfaDetector.getAlfaInterface();
}

/** Returns a list of running processes (kismet, wifite, bettercap, etc.) that may block ALFA adapter access. */
export async function getAlfaBlockingProcesses(): Promise<{ pid: string; name: string }[]> {
	return findBlockingProcesses(ALFA_PROCESS_CONFIGS);
}

/** Forcefully kills all processes that may block ALFA adapter access, then waits for cleanup. */
export async function killAlfaBlockingProcesses(): Promise<void> {
	return killMatchingProcesses(ALFA_PROCESS_CONFIGS);
}
