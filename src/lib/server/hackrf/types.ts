// HackRF API Types and Interfaces

import type { SweepManagerState } from '$lib/types/shared';

/** Mutable state shared by reference between SweepManager and cycle-init functions. */
export interface SweepMutableState {
	isRunning: boolean;
	isInitialized: boolean;
	status: SweepStatus;
}

export interface SweepStatus {
	state: SweepManagerState;
	currentFrequency?: number;
	sweepProgress?: number;
	totalSweeps?: number;
	completedSweeps?: number;
	startTime?: number;
	error?: string;
}

export interface SpectrumData {
	timestamp: Date;
	frequency: number; // Peak frequency in MHz
	power: number; // Peak power in dB
	unit?: string;
	binData?: number[]; // Array of power values
	startFreq?: number; // Start frequency for validation
	endFreq?: number; // End frequency for validation
	powerValues?: number[]; // Power values array for validation
	metadata?: {
		targetFrequency?: { value: number; unit: string };
		currentIndex?: number;
		totalFrequencies?: number;
		frequencyRange?: {
			low: number;
			high: number;
			center: number;
		};
		binWidth?: number;
		signalStrength?: string;
		date?: string;
		time?: string;
		peakBinIndex?: number;
		[key: string]: unknown; // Allow complex types in metadata
	};
}

export interface SweepArgs {
	startMHz: number;
	endMHz: number;
	binWidthHz: number;
	lnaGain?: string;
	vgaGain?: string;
}
