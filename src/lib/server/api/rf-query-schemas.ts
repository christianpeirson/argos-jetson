/**
 * Shared Zod schemas + parsing helpers for the /api/rf/* query string surface.
 *
 * Both /api/rf/aggregate and /api/rf/observations accept the same bbox /
 * comma-separated-list / integer query primitives; previously these were
 * duplicated verbatim in each route file (fallow clone-group 292t × 2
 * instances). Extracted here so a fix to bbox parsing or a new error message
 * lands in one place.
 */

import { z } from 'zod';

function parseBboxNumbers(raw: string): number[] | null {
	const parts = raw.split(',').map((s) => Number(s.trim()));
	if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
	return parts;
}

function latsOutOfRange(minLat: number, maxLat: number): boolean {
	return minLat < -90 || maxLat > 90 || minLat >= maxLat;
}

function lonsOutOfRange(minLon: number, maxLon: number): boolean {
	return minLon < -180 || maxLon > 180 || minLon >= maxLon;
}

function bboxOutOfRange(minLon: number, minLat: number, maxLon: number, maxLat: number): boolean {
	return latsOutOfRange(minLat, maxLat) || lonsOutOfRange(minLon, maxLon);
}

/** `minLon,minLat,maxLon,maxLat` — validates ranges + ordering. */
export const BBoxSchema = z.string().transform((raw, ctx) => {
	const parts = parseBboxNumbers(raw);
	if (!parts) {
		ctx.addIssue({ code: 'custom', message: 'bbox must be "minLon,minLat,maxLon,maxLat"' });
		return z.NEVER;
	}
	const [minLon, minLat, maxLon, maxLat] = parts;
	if (bboxOutOfRange(minLon, minLat, maxLon, maxLat)) {
		ctx.addIssue({ code: 'custom', message: 'bbox coordinates out of range or inverted' });
		return z.NEVER;
	}
	return [minLon, minLat, maxLon, maxLat] as const;
});

/** Comma-separated list — splits, trims, drops empties. */
export const CsvListSchema = z.string().transform((raw) =>
	raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
);

/** Stringified integer — accepts negative; throws on non-digits. */
export const IntSchema = z
	.string()
	.regex(/^-?\d+$/)
	.transform((s) => Number.parseInt(s, 10));
