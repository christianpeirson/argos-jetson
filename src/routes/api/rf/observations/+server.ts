import { error, json } from '@sveltejs/kit';
import { z } from 'zod';

import { createHandler } from '$lib/server/api/create-handler';
import { BBoxSchema, IntSchema } from '$lib/server/api/rf-query-schemas';
import { computeDeviceEllipse } from '$lib/server/db/device-ellipse';
import { getDeviceObservations } from '$lib/server/db/rf-aggregation';

/**
 * GET /api/rf/observations?bssid=<deviceId>&session=<sessionId>
 *                        &bbox=<minLon,minLat,maxLon,maxLat>&start=<ms>&end=<ms>
 *
 * Returns raw signal observations for a single BSSID, used by the
 * Flying-Squirrel highlight-on-select UI to draw rays from the AP
 * centroid to each observation point.
 *
 * Auth inherits from the global /api/* fail-closed gate.
 */

const QuerySchema = z.object({
	bssid: z.string().min(1),
	session: z.string().min(1).optional(),
	bbox: BBoxSchema.optional(),
	start: IntSchema.optional(),
	end: IntSchema.optional()
});

export const GET = createHandler(async ({ url }) => {
	const raw = Object.fromEntries(url.searchParams.entries());
	const parsed = QuerySchema.safeParse(raw);
	if (!parsed.success) {
		throw error(400, parsed.error.issues.map((i) => i.message).join('; '));
	}
	const q = parsed.data;
	if (q.start !== undefined && q.end !== undefined && q.start > q.end) {
		throw error(400, 'start must be <= end');
	}
	const observations = getDeviceObservations({
		deviceId: q.bssid,
		sessionId: q.session,
		bbox: q.bbox as [number, number, number, number] | undefined,
		startTs: q.start,
		endTs: q.end
	});
	const ellipse = computeDeviceEllipse(observations);
	return json({ observations, ellipse });
});
