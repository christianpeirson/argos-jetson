/**
 * Per-device OS-state refresh + force-release kill paths. Pulled out of the
 * `ResourceManager` class so it operates on a plain `Map<HardwareDevice,
 * ResourceState>` that the orchestrator passes in. Keeps the orchestrator
 * free of device-specific branching.
 *
 * @module
 */

import { logger } from '$lib/utils/logger';

import * as alfaMgr from './alfa-manager';
import * as b205Mgr from './b205-manager';
import * as hackrfMgr from './hackrf-manager';
import { applyOwnership, resolveHackrfOwner } from './resource-ownership';
import { HardwareDevice, type ResourceState } from './types';

type StateMap = Map<HardwareDevice, ResourceState>;

async function refreshHackrf(state: StateMap): Promise<void> {
	const current = state.get(HardwareDevice.HACKRF);
	if (!current) return;
	current.isDetected = await hackrfMgr.detectHackRF();
	const processes = await hackrfMgr.getHackrfBlockingProcesses();
	const containers = await hackrfMgr.getContainerStatus(true);
	applyOwnership(current, resolveHackrfOwner(processes, containers));
	state.set(HardwareDevice.HACKRF, current);
}

async function refreshAlfa(state: StateMap): Promise<void> {
	const current = state.get(HardwareDevice.ALFA);
	if (!current) return;
	current.isDetected = !!(await alfaMgr.detectAdapter());
	const processes = await alfaMgr.getAlfaBlockingProcesses();
	const owner = processes.length > 0 ? processes[0].name : null;
	applyOwnership(current, owner);
	state.set(HardwareDevice.ALFA, current);
}

function serviceOwnerOrNull(services: { isActive: boolean; name: string }[]): string | null {
	const activeSvc = services.find((s) => s.isActive);
	return activeSvc ? activeSvc.name.replace(/\.service$/, '') : null;
}

async function refreshB205(state: StateMap): Promise<void> {
	const current = state.get(HardwareDevice.B205);
	if (!current) return;
	current.isDetected = await b205Mgr.detectB205();
	const processes = await b205Mgr.getB205BlockingProcesses();
	const services = await b205Mgr.getServiceStatus();
	const procOwner = processes.length > 0 ? processes[0].name : null;
	const owner = procOwner ?? serviceOwnerOrNull(services);
	applyOwnership(current, owner);
	state.set(HardwareDevice.B205, current);
}

export async function refreshDetection(state: StateMap): Promise<void> {
	try {
		await refreshHackrf(state);
		await refreshAlfa(state);
		await refreshB205(state);
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		logger.warn(
			'[ResourceManager] Hardware detection refresh failed',
			{ error: msg, operation: 'hardware.detect' },
			'resource-detect'
		);
	}
}

/**
 * On-demand refresh of a single device's detection state. Call after a
 * docker/process lifecycle command so that the next status poll returns
 * fresh data without waiting up to 30s for the scheduled refresh.
 */
export async function dispatchRefresh(state: StateMap, device: HardwareDevice): Promise<void> {
	if (device === HardwareDevice.HACKRF) return refreshHackrf(state);
	if (device === HardwareDevice.ALFA) return refreshAlfa(state);
	if (device === HardwareDevice.B205) return refreshB205(state);
}

export async function killDeviceHolders(device: HardwareDevice): Promise<void> {
	if (device === HardwareDevice.HACKRF) {
		await hackrfMgr.killHackrfBlockingProcesses();
		await hackrfMgr.stopContainers();
		return;
	}
	if (device === HardwareDevice.ALFA) {
		await alfaMgr.killAlfaBlockingProcesses();
		return;
	}
	if (device === HardwareDevice.B205) {
		await b205Mgr.stopServices();
		await b205Mgr.killB205BlockingProcesses();
	}
}
