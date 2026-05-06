/**
 * /api/missions/:id
 *
 * GET    — fetch a single mission by id.
 * PATCH  — partial update of editable fields (Zod-validated body).
 * DELETE — cascade-delete the mission and all associated captures,
 *          emitters, and reports.
 */

import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { createHandler } from '$lib/server/api/create-handler';
import { getRFDatabase } from '$lib/server/db/database';
import {
	deleteMission,
	getMission,
	updateMission
} from '$lib/server/services/reports/mission-store';
import type { MissionPatch } from '$lib/server/services/reports/types';

export const _MissionPatchSchema = z
	.object({
		name: z.string().min(1).max(200).optional(),
		unit: z.string().max(100).nullable().optional(),
		ao_mgrs: z.string().max(100).nullable().optional(),
		operator: z.string().max(100).nullable().optional(),
		target: z.string().max(200).nullable().optional(),
		link_budget: z.number().finite().nullable().optional()
	})
	.strict()
	.refine((obj) => Object.keys(obj).length > 0, {
		message: 'patch must include at least one field'
	});

export const GET = createHandler(({ params }) => {
	const id = params.id;
	if (!id) {
		return json({ success: false, error: 'Missing mission id' }, { status: 400 });
	}

	const db = getRFDatabase().rawDb;
	const mission = getMission(db, id);
	if (!mission) {
		return json({ success: false, error: 'Mission not found' }, { status: 404 });
	}

	return { success: true, mission };
});

export const PATCH = createHandler(
	async ({ params, request }) => {
		const id = params.id;
		if (!id) {
			return json({ success: false, error: 'Missing mission id' }, { status: 400 });
		}

		// validateBody (createHandler option below) has already enforced
		// _MissionPatchSchema on a cloned request — re-read here only to
		// consume the body, then cast to the inferred patch shape.
		const patch = (await request.json()) as MissionPatch;

		const db = getRFDatabase().rawDb;
		const mission = updateMission(db, id, patch);
		if (!mission) {
			return json({ success: false, error: 'Mission not found' }, { status: 404 });
		}

		return { success: true, mission };
	},
	{ validateBody: _MissionPatchSchema }
);

export const DELETE = createHandler(({ params }) => {
	const id = params.id;
	if (!id) {
		return json({ success: false, error: 'Missing mission id' }, { status: 400 });
	}

	const db = getRFDatabase().rawDb;
	const existing = getMission(db, id);
	if (!existing) {
		return json({ success: false, error: 'Mission not found' }, { status: 404 });
	}

	deleteMission(db, id);
	return { success: true, deleted: true };
});
