import { logger } from '$lib/utils/logger';

import {
	analyzeError,
	deriveDeviceStatus,
	type DeviceState,
	type ErrorAnalysis,
	type RecoveryConfig
} from './error-analysis';
import { RecoveryManager } from './error-recovery';

// DeviceState consumed by error-recovery.ts via error-analysis import chain
// fallow-ignore-next-line unused-type
export type { DeviceState, ErrorAnalysis, RecoveryConfig };

interface ErrorState {
	consecutiveErrors: number;
	maxConsecutiveErrors: number;
	frequencyErrors: Map<number, number>;
	recentFailures: number[];
	maxFailuresPerMinute: number;
}

/**
 * Manages error tracking and analysis for HackRF operations.
 * Recovery logic delegated to RecoveryManager.
 */
export class ErrorTracker {
	private errorState: ErrorState = {
		consecutiveErrors: 0,
		maxConsecutiveErrors: 8,
		frequencyErrors: new Map<number, number>(),
		recentFailures: [],
		maxFailuresPerMinute: 5
	};

	private deviceState: DeviceState = {
		status: 'unknown',
		lastSuccessfulOperation: null,
		consecutiveBusyErrors: 0,
		recoveryState: 'none'
	};

	private readonly recovery: RecoveryManager;

	constructor(config: RecoveryConfig = {}) {
		this.recovery = new RecoveryManager(config);
		logger.info('[SEARCH] ErrorTracker initialized', {
			maxConsecutiveErrors: this.errorState.maxConsecutiveErrors,
			maxFailuresPerMinute: this.errorState.maxFailuresPerMinute
		});
	}

	/** Record a successful operation */
	recordSuccess(): void {
		this.errorState.consecutiveErrors = 0;
		this.deviceState.status = 'available';
		this.deviceState.lastSuccessfulOperation = new Date();
		this.deviceState.consecutiveBusyErrors = 0;
		this.deviceState.recoveryState = 'none';
		this.recovery.reset();
		logger.info('[OK] Operation successful - error counters reset');
	}

	private trackFrequencyError(frequency: number | undefined): void {
		if (!frequency) return;
		const currentCount = this.errorState.frequencyErrors.get(frequency) || 0;
		this.errorState.frequencyErrors.set(frequency, currentCount + 1);
	}

	private applyAnalysisToState(analysis: ErrorAnalysis): void {
		if (analysis.errorType === 'device_busy') {
			this.deviceState.consecutiveBusyErrors++;
		}
		const newStatus = deriveDeviceStatus(analysis, this.errorState.consecutiveErrors);
		if (newStatus) this.deviceState.status = newStatus;
	}

	/** Record an error and analyze it */
	// Called via src/lib/server/hackrf/sweep-coordinator.ts:114,161,267,300 and sweep-cycle-init.ts:198
	// fallow-ignore-next-line unused-class-member
	recordError(
		error: Error | string,
		context: { frequency?: number; operation?: string } = {}
	): ErrorAnalysis {
		const errorMessage = error instanceof Error ? error.message : String(error);

		this.errorState.consecutiveErrors++;
		this.errorState.recentFailures.push(Date.now());
		this.cleanupOldFailures();
		this.trackFrequencyError(context.frequency);

		const analysis = analyzeError(
			errorMessage,
			this.deviceState.consecutiveBusyErrors,
			this.errorState.consecutiveErrors,
			this.errorState.maxConsecutiveErrors
		);

		this.applyAnalysisToState(analysis);

		logger.error('[ERROR] Error recorded and analyzed', {
			error: errorMessage,
			context,
			analysis,
			consecutiveErrors: this.errorState.consecutiveErrors,
			deviceStatus: this.deviceState.status
		});

		return analysis;
	}

	// Called via src/lib/server/hackrf/sweep-coordinator.ts:318
	// fallow-ignore-next-line unused-class-member
	hasMaxConsecutiveErrors(): boolean {
		return this.errorState.consecutiveErrors >= this.errorState.maxConsecutiveErrors;
	}

	// Called via src/lib/server/hackrf/sweep-coordinator.ts:318
	// fallow-ignore-next-line unused-class-member
	hasMaxFailuresPerMinute(): boolean {
		return this.errorState.recentFailures.length >= this.errorState.maxFailuresPerMinute;
	}

	// Called via src/lib/server/hackrf/sweep-coordinator.ts:311
	// fallow-ignore-next-line unused-class-member
	shouldBlacklistFrequency(frequency: number): boolean {
		return (this.errorState.frequencyErrors.get(frequency) || 0) >= 3;
	}

	// Called via src/lib/server/hackrf/sweep-coordinator.ts:287 and sweep-health-checker.ts:170
	// fallow-ignore-next-line unused-class-member
	shouldAttemptRecovery(): boolean {
		return this.recovery.shouldAttemptRecovery(
			this.errorState.consecutiveErrors,
			this.deviceState.status
		);
	}

	// Called via src/lib/hackrf/sweep-manager/sweep-health-checker.ts:177
	// fallow-ignore-next-line unused-class-member
	startRecovery(): void {
		this.deviceState.recoveryState = this.recovery.start();
	}

	// Called via src/lib/server/hackrf/sweep-manager-lifecycle.ts:40 and sweep-health-checker.ts:50,166
	// fallow-ignore-next-line unused-class-member
	getRecoveryStatus() {
		return this.recovery.getStatus(this.errorState.consecutiveErrors, this.deviceState.status);
	}

	resetErrorTracking(): void {
		this.errorState.consecutiveErrors = 0;
		this.errorState.frequencyErrors.clear();
		this.errorState.recentFailures = [];
		this.deviceState.status = 'unknown';
		this.deviceState.consecutiveBusyErrors = 0;
		this.deviceState.recoveryState = 'none';
		this.recovery.reset();
		logger.info('[CLEANUP] All error tracking reset');
	}

	updateConfig(
		config: Partial<
			RecoveryConfig & { maxConsecutiveErrors?: number; maxFailuresPerMinute?: number }
		>
	): void {
		if (config.maxConsecutiveErrors !== undefined)
			this.errorState.maxConsecutiveErrors = config.maxConsecutiveErrors;
		if (config.maxFailuresPerMinute !== undefined)
			this.errorState.maxFailuresPerMinute = config.maxFailuresPerMinute;
		this.recovery.updateConfig(config);
		logger.info('[CONFIG] ErrorTracker configuration updated', {
			maxConsecutiveErrors: this.errorState.maxConsecutiveErrors,
			maxFailuresPerMinute: this.errorState.maxFailuresPerMinute
		});
	}

	private cleanupOldFailures(): void {
		const oneMinuteAgo = Date.now() - 60000;
		this.errorState.recentFailures = this.errorState.recentFailures.filter(
			(timestamp) => timestamp > oneMinuteAgo
		);
	}
}
