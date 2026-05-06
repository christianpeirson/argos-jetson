/**
 * Pinned tools rune-store — drives the dynamic slots after the 3 fixed slots
 * (AGENTS / OVERVIEW / MAP) on the LeftRail.
 *
 * Persists an ordered list of tool ids to localStorage so the user's pinned
 * collection survives reload. Adding a tool that's already pinned is a no-op
 * (preserves existing position). Removing a tool collapses the rail.
 */

const STORAGE_KEY = 'argos.leftrail.pinned';

let _ids = $state<string[]>([]);
let _hydrated = false;

function parseStored(raw: string): string[] | null {
	try {
		const v = JSON.parse(raw);
		if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
			return v as string[];
		}
		return null;
	} catch {
		return null;
	}
}

function load(): void {
	if (_hydrated) return;
	if (typeof window === 'undefined') return;
	_hydrated = true;
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return;
	const parsed = parseStored(raw);
	if (parsed !== null) _ids = parsed;
}

function persist(): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(_ids));
	} catch {
		/* quota / disabled */
	}
}

export const pinnedToolsStore = {
	get ids(): readonly string[] {
		load();
		return _ids;
	},
	pin(id: string): void {
		load();
		if (_ids.includes(id)) return;
		_ids = [..._ids, id];
		persist();
	},
	unpin(id: string): void {
		load();
		const next = _ids.filter((x) => x !== id);
		if (next.length === _ids.length) return;
		_ids = next;
		persist();
	},
	clear(): void {
		_ids = [];
		persist();
	}
};
