import { homedir, userInfo } from 'os';

import { errMsg } from '$lib/server/api/error-utils';
import { env } from '$lib/server/env';
import { execFileAsync } from '$lib/server/exec';
import { resourceManager } from '$lib/server/hardware/resource-manager';
import { HardwareDevice } from '$lib/server/hardware/types';
import { validateNumericParam } from '$lib/server/security/input-sanitizer';
import { delay } from '$lib/utils/delay';
import { logger } from '$lib/utils/logger';

import { detectWifiAdapter, pgrepKismet } from './kismet-status-checker';

const KISMET_OWNER = 'kismet';

export interface KismetControlResult {
	success: boolean;
	message: string;
	details?: string;
	pid?: number;
	error?: string;
}

/** Clean up stale monitor interfaces */
async function cleanupMonitorInterface(iface: string): Promise<void> {
	try {
		await execFileAsync('/usr/sbin/iw', ['dev', `${iface}mon`, 'del']);
	} catch {
		/* no monitor interface to clean */
	}
}

/** Spawn Kismet as the Argos service user.
 *
 *  No sudo wrapper: the service already runs as the target user, so a
 *  `sudo -u <self>` prefix is redundant — and under systemd's
 *  `NoNewPrivileges=yes` hardening it is actively broken because NNP
 *  blocks setuid binaries from elevating, so sudo refuses to run.
 *
 *  Privilege model: the service user must be in the `kismet` group so it
 *  can exec `/usr/bin/kismet_cap_linux_wifi` (mode 754, group kismet).
 *  That helper carries `cap_net_admin,cap_net_raw=eip`, which is all
 *  that's needed to flip the Alfa to monitor mode and inject frames.
 *  The main `/usr/bin/kismet` process itself does not need root. */
async function spawnKismet(iface: string): Promise<void> {
	const kismetUser = userInfo().username;
	await execFileAsync(
		'/usr/bin/kismet',
		[
			'-c',
			`${iface}:type=linuxwifi`,
			'--no-ncurses',
			'--no-line-wrap',
			'--daemonize',
			'--silent'
		],
		{ timeout: 15000, cwd: homedir() }
	);
	logger.info('[kismet] Start command issued', { user: kismetUser, iface });
}

/**
 * Wait for Kismet PID to appear by fine-grained polling.
 *
 * 2026-05-15 (OTel/Jaeger scan follow-up): replaced the 5 s hardcoded
 * lead-in + 3 × 2 s retry pattern (~11 s minimum) with 55 × 200 ms
 * polling. Same 11 s upper bound but the typical case (Kismet daemon
 * spawns in 500 ms - 1 s) exits at first success instead of waiting
 * out a 5 s pre-roll. User-visible Wi-Fi Start latency drops from
 * ~15 s to ~2-3 s.
 */
async function waitForKismetPid(): Promise<string> {
	for (let i = 0; i < 55; i++) {
		const pid = await pgrepKismet();
		if (pid) return pid;
		await delay(200);
	}
	return '';
}

/** Check which OS user owns a process */
async function getProcessUser(pid: number): Promise<string> {
	try {
		const { stdout } = await execFileAsync('/usr/bin/ps', ['-p', String(pid), '-o', 'user=']);
		return stdout.trim();
	} catch {
		return '';
	}
}

/** Set Kismet auth credentials if KISMET_PASSWORD is configured */
async function setupKismetAuth(): Promise<void> {
	const kismetAuthUser = env.KISMET_USER;
	const kismetPass = env.KISMET_PASSWORD;
	if (!kismetPass) {
		logger.warn('[kismet] KISMET_PASSWORD not set, skipping initial credential setup');
		return;
	}
	try {
		const response = await fetch(`${env.KISMET_API_URL}/session/set_password`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: `username=${encodeURIComponent(kismetAuthUser)}&password=${encodeURIComponent(kismetPass)}`,
			signal: AbortSignal.timeout(3000)
		});
		const authCheck = await response.text();
		if (authCheck.includes('Login configured')) {
			logger.info('[kismet] Initial credentials set');
		}
	} catch {
		// Already configured or not yet ready
	}
}

/** Pre-flight: check if already running or no adapter */
async function preflightCheck(): Promise<KismetControlResult | null> {
	const existingPids = await pgrepKismet();
	if (existingPids) {
		logger.info('[kismet] Already running', { pid: existingPids });
		return {
			success: true,
			message: 'Kismet is already running',
			details: `Process ID: ${existingPids}`
		};
	}
	return null;
}

/** Launch Kismet and verify it started, returning the result */
async function launchAndVerify(alfaInterface: string): Promise<KismetControlResult> {
	await cleanupMonitorInterface(alfaInterface);
	await spawnKismet(alfaInterface);

	const verifyPid = await waitForKismetPid();
	if (!verifyPid) {
		return {
			success: false,
			message: 'Kismet failed to start',
			error: 'Process not found after startup. Check if the WiFi adapter is available.'
		};
	}

	const validPid = validateNumericParam(parseInt(verifyPid, 10), 'pid', 1, 4194304);
	const userCheck = await getProcessUser(validPid);
	logger.info('[kismet] Running', { user: userCheck, pid: validPid });
	await setupKismetAuth();

	return {
		success: true,
		message: 'Kismet started successfully',
		details: `Running as ${userCheck || userInfo().username} (PID: ${validPid}) on ${alfaInterface}`,
		pid: validPid
	};
}

/** Start Kismet WiFi discovery service */
async function releaseAlfa(): Promise<void> {
	await resourceManager.release(KISMET_OWNER, HardwareDevice.ALFA).catch(() => undefined);
}

async function claimAlfa(): Promise<KismetControlResult | null> {
	const claim = await resourceManager.acquire(KISMET_OWNER, HardwareDevice.ALFA);
	if (claim.success) return null;
	logger.warn('[kismet] ALFA unavailable', { owner: claim.owner });
	return {
		success: false,
		message: `Wi-Fi adapter is in use by ${claim.owner ?? 'another tool'}`,
		error: `alfa-locked-by:${claim.owner ?? 'unknown'}`
	};
}

/** Resolve ALFA interface or return a structured "not found" result. */
function resolveAlfaOrFail():
	| { ok: true; iface: string }
	| { ok: false; result: KismetControlResult } {
	const iface = detectWifiAdapter();
	if (iface) return { ok: true, iface };
	logger.warn('[kismet] No external WiFi adapter found');
	return {
		ok: false,
		result: {
			success: false,
			message: 'No external WiFi adapter detected. Connect an ALFA adapter and try again.',
			error: 'No wlan1+ interface found'
		}
	};
}

/** Claim ALFA + launch kismet; release claim on failure. */
async function claimAndLaunch(iface: string): Promise<KismetControlResult> {
	const conflict = await claimAlfa();
	if (conflict) return conflict;
	logger.info('[kismet] Using interface', { interface: iface });
	const result = await launchAndVerify(iface);
	if (!result.success) await releaseAlfa();
	return result;
}

export async function startKismetExtended(): Promise<KismetControlResult> {
	try {
		logger.info('[kismet] Starting Kismet');
		const alreadyRunning = await preflightCheck();
		if (alreadyRunning) return alreadyRunning;
		const alfa = resolveAlfaOrFail();
		if (!alfa.ok) return alfa.result;
		return await claimAndLaunch(alfa.iface);
	} catch (error: unknown) {
		logger.error('[kismet] Start error', { error: errMsg(error) });
		await releaseAlfa();
		return {
			success: false,
			message: 'Failed to start Kismet',
			error: errMsg(error)
		};
	}
}

/** Graceful SIGTERM to kismet.
 *
 *  Argos spawns kismet directly as the service user (see spawnKismet), so
 *  kismet is owned by us — plain pkill works without sudo and without any
 *  ambient caps. Under systemd `NoNewPrivileges=yes` hardening, `sudo` would
 *  refuse to run anyway. Kismet handles SIGTERM cleanly (closes files, tears
 *  down the monitor VIF). */
async function stopKismetGracefully(): Promise<void> {
	try {
		await execFileAsync('/usr/bin/pkill', ['-TERM', '-x', 'kismet']);
	} catch {
		/* no process to signal */
	}
}

/** Last-resort SIGKILL if kismet refuses to exit after SIGTERM + wait. */
async function forceKillKismet(): Promise<void> {
	logger.warn('[kismet] Processes remain after SIGTERM, force killing');
	try {
		await execFileAsync('/usr/bin/pkill', ['-KILL', '-x', 'kismet']);
	} catch {
		/* no process to kill */
	}
	await delay(1000);
}

/** Stop Kismet WiFi discovery service */
export async function stopKismetExtended(): Promise<KismetControlResult> {
	try {
		logger.info('[kismet] Stopping Kismet');

		const pids = await pgrepKismet();
		if (!pids) {
			await releaseAlfa();
			return {
				success: true,
				message: 'Kismet stopped successfully',
				details: 'No processes were running'
			};
		}

		await stopKismetGracefully();
		await delay(3000);

		if (await pgrepKismet()) await forceKillKismet();

		const finalCheck = await pgrepKismet();
		if (finalCheck) {
			return {
				success: false,
				message: 'Kismet stop attempted but processes remain',
				error: `PIDs still running: ${finalCheck}`
			};
		}

		await releaseAlfa();
		logger.info('[kismet] Stopped successfully');
		return {
			success: true,
			message: 'Kismet stopped successfully',
			details: 'Service stopped and processes terminated'
		};
	} catch (error: unknown) {
		await releaseAlfa();
		return {
			success: false,
			message: 'Failed to stop Kismet',
			error: errMsg(error)
		};
	}
}

export { getKismetStatus } from './kismet-status-checker';
