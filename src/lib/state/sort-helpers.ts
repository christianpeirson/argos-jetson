/**
 * Shared sort comparators used by the runes-based device-table stores
 * (`gsm.svelte.ts`, `kismet.svelte.ts`, and any future sibling stores
 * that follow the same `<key, dir>` sort-state pattern).
 *
 * Each store keeps its own domain `SortKey`/`SortDir` aliases and
 * `defaultDirFor(key)` policy; only the type-agnostic comparison logic
 * lives here.
 *
 * @module
 */

export type Sortable = string | number;

export type SortDir = 'asc' | 'desc';

/** Plain three-way `Sortable` compare without null handling. */
export function rawCompare(a: Sortable, b: Sortable): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

/**
 * Three-way comparator that pushes `null` values to the end and respects the
 * caller's sort direction. Stable for equal pairs.
 */
// fallow-ignore-next-line complexity
export function compareNullable(a: Sortable | null, b: Sortable | null, dir: SortDir): number {
	if (a === null) return b === null ? 0 : 1;
	if (b === null) return -1;
	const cmp = rawCompare(a, b);
	return dir === 'asc' ? cmp : -cmp;
}
