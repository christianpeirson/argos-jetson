import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

import { createHandler } from '$lib/server/api/create-handler';
import { BBoxSchema, CsvListSchema, IntSchema } from '$lib/server/api/rf-query-schemas';
import {
	getApCentroids,
	getDrivePath,
	getRssiHexCells,
	h3ResForZoom,
	type RfQueryFilters
} from '$lib/server/db/rf-aggregation';

const QuerySchema = z.object({
	layer: z.enum(['heatmap', 'centroids', 'path', 'all']).default('all'),
	session: z.string().min(1).optional(),
	bssid: CsvListSchema.optional(),
	bbox: BBoxSchema.optional(),
	start: IntSchema.optional(),
	end: IntSchema.optional(),
	h3res: IntSchema.optional(),
	zoom: z
		.string()
		.regex(/^-?\d+(\.\d+)?$/)
		.transform((v) => Number(v))
		.pipe(z.number().finite())
		.optional(),
	rssiFloor: z
		.string()
		.regex(/^-?\d+(\.\d+)?$/)
		.transform((v) => Number(v))
		.pipe(z.number().finite())
		.optional(),
	source: z.enum(['kismet', 'bluedragon', 'gsm-evil', 'hackrf', 'rtl-sdr']).optional()
});

function toFilters(q: z.infer<typeof QuerySchema>): RfQueryFilters {
	return {
		sessionId: q.session,
		deviceIds: q.bssid,
		bbox: q.bbox as RfQueryFilters['bbox'],
		startTs: q.start,
		endTs: q.end,
		rssiFloorDbm: q.rssiFloor,
		source: q.source
	};
}

/**
 * GET /api/rf/aggregate?layer=heatmap|centroids|path|all
 *                      &session=<id>&bssid=<csv>&bbox=<minLon,minLat,maxLon,maxLat>
 *                      &start=<ms>&end=<ms>&h3res=<5..15>
 *
 * Feeds the Flying-Squirrel-style map layers. Auth inherits from the
 * global /api/* fail-closed gate in hooks.server.ts.
 */
function runLayer(
	layer: z.infer<typeof QuerySchema>['layer'],
	filters: RfQueryFilters,
	h3res: number
): Record<string, unknown> {
	if (layer === 'heatmap') return { heatmap: getRssiHexCells(filters, h3res) };
	if (layer === 'centroids') return { centroids: getApCentroids(filters) };
	if (layer === 'path') return { path: getDrivePath(filters) };
	return {
		heatmap: getRssiHexCells(filters, h3res),
		centroids: getApCentroids(filters),
		path: getDrivePath(filters)
	};
}

export const GET = createHandler(async ({ url }) => {
	const raw = Object.fromEntries(url.searchParams.entries());
	const parsed = QuerySchema.safeParse(raw);
	if (!parsed.success) {
		throw error(400, parsed.error.issues.map((i) => i.message).join('; '));
	}
	const q = parsed.data;
	const h3res = q.h3res ?? h3ResForZoom(q.zoom);
	return json(runLayer(q.layer, toFilters(q), h3res));
});
