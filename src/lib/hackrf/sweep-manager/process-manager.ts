import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type ChildProcess, spawn } from 'child_process';

import { logger } from '$lib/utils/logger';

import { forceCleanupAllProcesses, forceKillAllProcesses, stopProcess } from './process-lifecycle';
import type { ProcessConfig, ProcessState } from './process-manager-types';

// Re-export types for backward compatibility
export type { ProcessConfig, ProcessState } from './process-manager-types';

/**
 * Manages HackRF process lifecycle - spawning, monitoring, and cleanup
 * NO MOCK FUNCTIONALITY - REAL HARDWARE ONLY
 */
export class ProcessManager {
	private processRegistry = new Map<number, ChildProcess>();
	private processMonitorInterval: ReturnType<typeof setInterval> | null = null;
	private eventHandlers: {
		onStdout?: (data: Buffer) => void;
		onStderr?: (data: Buffer) => void;
		onExit?: (code: number | null, signal: string | null) => void;
	} = {};

	private buildSpawnConfig(config: ProcessConfig): ProcessConfig & { env: NodeJS.ProcessEnv } {
		return {
			...config,
			env: {
				...process.env,
				NODE_NO_READLINE: '1',
				PYTHONUNBUFFERED: '1'
			}
		};
	}

	private resolveScriptPath(): string {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);
		return join(__dirname, 'auto_sweep.sh');
	}

	private registerProcess(sweepProcess: ChildProcess): ProcessState {
		const pid = sweepProcess.pid || null;
		const processStartTime = Date.now();

		if (pid) {
			this.processRegistry.set(pid, sweepProcess);
		}

		logger.info(`[OK] Real HackRF process spawned with PID: ${pid}`);
		this.attachEventHandlers(sweepProcess);

		return {
			sweepProcess,
			sweepProcessPgid: pid,
			actualProcessPid: pid,
			processStartTime
		};
	}

	/**
	 * Spawn a new HackRF sweep process - REAL HARDWARE ONLY
	 */
	// Called via src/lib/server/hackrf/sweep-coordinator.ts:150
	// fallow-ignore-next-line unused-class-member
	async spawnSweepProcess(
		args: string[],
		config: ProcessConfig = {
			detached: true,
			stdio: ['ignore', 'pipe', 'pipe']
		}
	): Promise<ProcessState> {
		logger.info(`[START] Spawning real hackrf_sweep with args: ${args.join(' ')}`);
		const scriptPath = this.resolveScriptPath();
		logger.info(`[FILE] Script path resolved to: ${scriptPath}`);

		const sweepProcess = spawn(scriptPath, args, this.buildSpawnConfig(config));
		return this.registerProcess(sweepProcess);
	}

	private attachStdoutHandler(sweepProcess: ChildProcess): void {
		if (!sweepProcess.stdout || !this.eventHandlers.onStdout) {
			logger.error('Failed to attach stdout handler', {
				hasStdout: !!sweepProcess.stdout,
				hasHandler: !!this.eventHandlers.onStdout
			});
			return;
		}
		sweepProcess.stdout.on('data', this.eventHandlers.onStdout);
		logger.info('Attached stdout handler to real process');
	}

	/** Attach stdout/stderr/exit handlers to a spawned process */
	private attachEventHandlers(sweepProcess: ChildProcess): void {
		this.attachStdoutHandler(sweepProcess);

		if (sweepProcess.stderr && this.eventHandlers.onStderr) {
			sweepProcess.stderr.on('data', this.eventHandlers.onStderr);
			logger.info('Attached stderr handler to real process');
		}

		if (this.eventHandlers.onExit) {
			sweepProcess.on('exit', this.eventHandlers.onExit);
			logger.info('Attached exit handler to real process');
		}
	}

	/**
	 * Stop a specific process
	 */
	async stopProcess(processState: ProcessState): Promise<void> {
		return stopProcess(processState, this.processRegistry);
	}

	/**
	 * Force cleanup all HackRF processes
	 */
	async forceCleanupAll(): Promise<void> {
		return forceCleanupAllProcesses(this.processRegistry);
	}

	/**
	 * Set event handlers for process monitoring
	 */
	// Called via src/lib/server/hackrf/sweep-coordinator.ts:142
	// fallow-ignore-next-line unused-class-member
	setEventHandlers(handlers: {
		onStdout?: (data: Buffer) => void;
		onStderr?: (data: Buffer) => void;
		onExit?: (code: number | null, signal: string | null) => void;
	}): void {
		this.eventHandlers = handlers;
		logger.info('Process event handlers set for real hardware');
	}

	private pruneDeadProcesses(): void {
		for (const [pid] of this.processRegistry) {
			if (!this.isProcessAlive(pid)) {
				logger.warn(`Process ${pid} is dead, removing from registry`);
				this.processRegistry.delete(pid);
			}
		}
	}

	private static readonly EMPTY_STATE: ProcessState & { isRunning: boolean } = {
		sweepProcess: null,
		sweepProcessPgid: null,
		actualProcessPid: null,
		processStartTime: null,
		isRunning: false
	};

	/**
	 * Get current process state
	 */
	getProcessState(): ProcessState & { isRunning: boolean } {
		this.pruneDeadProcesses();
		const firstProcess: ChildProcess | undefined = this.processRegistry.values().next().value;
		if (!firstProcess) return { ...ProcessManager.EMPTY_STATE };
		const pid = firstProcess.pid ?? null;
		return {
			sweepProcess: firstProcess,
			sweepProcessPgid: pid,
			actualProcessPid: pid,
			processStartTime: Date.now(),
			isRunning: true
		};
	}

	/**
	 * Check if process is alive
	 */
	isProcessAlive(pid: number): boolean {
		try {
			process.kill(pid, 0);
			return true;
		} catch (_error: unknown) {
			return false;
		}
	}

	/**
	 * Force kill process immediately
	 */
	async forceKillProcess(): Promise<void> {
		return forceKillAllProcesses(this.processRegistry);
	}

	/**
	 * Clean up resources
	 */
	// Called via sweep-coordinator.ts:279, sweep-cycle-init.ts:104, sweep-manager-lifecycle.ts:36
	// fallow-ignore-next-line unused-class-member
	async cleanup(): Promise<void> {
		await this.forceCleanupAll();
	}
}
