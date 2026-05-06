// spec-024 PR1 T014 — Mk II UI state.
// `lsState()` is a localStorage-backed $state container — survives reload,
// SSR-safe (no DOM access at import time), JSON-encoded so primitives,
// arrays, and plain objects all work.
//
// Module-scope $state is fine because Svelte 5 schedules updates lazily; any
// component that reads `accentStore.value` opts into reactivity automatically.

import { type DrawerTab, isDrawerTab } from '$lib/types/drawer';

export type AccentName = 'amber' | 'green' | 'cyan' | 'magenta' | 'steel';
export type Density = 'compact' | 'normal' | 'comfy';

export interface LsState<T> {
	value: T;
}

class PersistentStorageError extends Error {
	readonly key: string;
	readonly operation: 'read' | 'write';
	readonly originalError: unknown;
	constructor(key: string, operation: 'read' | 'write', originalError: unknown) {
		super(
			`localStorage ${operation} failed for "${key}": ${(originalError as Error)?.message}`
		);
		this.name = 'PersistentStorageError';
		this.key = key;
		this.operation = operation;
		this.originalError = originalError;
	}
}

// fallow-ignore-next-line complexity
function readLs<T>(key: string): T | undefined {
	if (typeof localStorage === 'undefined') return undefined;
	let raw: string | null;
	try {
		raw = localStorage.getItem(key);
	} catch (err) {
		console.warn(new PersistentStorageError(key, 'read', err));
		return undefined;
	}
	if (raw === null) return undefined;
	try {
		return JSON.parse(raw) as T;
	} catch (err) {
		console.warn(new PersistentStorageError(key, 'read', err));
		return undefined;
	}
}

function writeLs<T>(key: string, val: T): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(key, JSON.stringify(val));
	} catch (err) {
		// quota exceeded / private mode — surface as typed warning so devtools
		// shows the cause, but state stays in memory.
		console.warn(new PersistentStorageError(key, 'write', err));
	}
}

function seedValue<T>(key: string, initial: T, validate?: (v: unknown) => v is T): T {
	const persisted = readLs<unknown>(key);
	if (validate) return validate(persisted) ? persisted : initial;
	return (persisted as T | undefined) ?? initial;
}

export function lsState<T>(key: string, initial: T, validate?: (v: unknown) => v is T): LsState<T> {
	let inner = $state<T>(seedValue(key, initial, validate));
	// Persist on every mutation, including nested object/array updates that the
	// setter alone would miss. $effect.root is module-safe; cleanup is implicit
	// in the module's lifetime.
	if (typeof window !== 'undefined') {
		$effect.root(() => {
			$effect(() => {
				writeLs(key, $state.snapshot(inner) as T);
			});
		});
	}
	return {
		get value() {
			return inner;
		},
		set value(v: T) {
			inner = v;
		}
	};
}

export const ACCENTS: AccentName[] = ['amber', 'green', 'cyan', 'magenta', 'steel'];
export const DENSITIES: Density[] = ['compact', 'normal', 'comfy'];

const isAccent = (v: unknown): v is AccentName =>
	typeof v === 'string' && (ACCENTS as readonly string[]).includes(v);
const isDensity = (v: unknown): v is Density =>
	typeof v === 'string' && (DENSITIES as readonly string[]).includes(v);

export const accentStore = lsState<AccentName>('argos.mk2.accent', 'amber', isAccent);
export const densityStore = lsState<Density>('argos.mk2.density', 'normal', isDensity);

// spec-024 PR3 T019 — Mk II bottom drawer state.
// Active tab + open/closed + height all persist across reloads. Height is
// stored raw; the Drawer component clamps it on mount + viewport-resize so
// the drawer can never collapse below the 120-px tab-strip floor or push the
// main stage below 200 px.

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

export const drawerActiveStore = lsState<DrawerTab>(
	'argos.mk2.drawer.active',
	'terminal',
	isDrawerTab
);
export const drawerOpenStore = lsState<boolean>('argos.mk2.drawer.open', true, isBool);
export const drawerHeightStore = lsState<number>('argos.mk2.drawer.height', 280, isFiniteNumber);
