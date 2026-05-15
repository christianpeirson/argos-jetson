import { json } from '@sveltejs/kit';

import { createHandler } from '$lib/server/api/create-handler';
import { getRFDatabase } from '$lib/server/db/database';
import { listPresets } from '$lib/server/services/trunk-recorder/preset-repository';
import {
	getStatus,
	restart,
	start,
	startResultToResponse,
	stop
} from '$lib/server/services/trunk-recorder/service';
import { ControlActionSchema, type ControlBody } from '$lib/server/services/trunk-recorder/types';

function resolvePresetId(
	requested: string | undefined
): { ok: true; id: string } | { ok: false; message: string } {
	if (requested) return { ok: true, id: requested };
	const presets = listPresets(getRFDatabase().rawDb);
	if (presets.length === 0) {
		return {
			ok: false,
			message: 'No presets configured — provide presetId or create a preset first'
		};
	}
	return { ok: true, id: presets[0].id };
}

/**
 * POST /api/trunk-recorder/control
 *
 * Body: { action: 'start' | 'stop' | 'restart' | 'status', presetId?: string }
 *
 * `start` and `restart` require a presetId. Starting takes an EXCLUSIVE HackRF
 * lock — trunk-recorder is not a WebRX-peer; any other tool holding the HackRF
 * returns 409 Conflict with the current owner name.
 *
 * `stop` leaves rdio-scanner running so archived calls stay replayable.
 */
export const POST = createHandler(
	// fallow-ignore-next-line complexity
	async ({ request }) => {
		const { action, presetId } = (await request.json()) as ControlBody;

		if (action === 'status') {
			const status = await getStatus();
			return json({ success: true, ...status });
		}

		if (action === 'stop') {
			const result = await stop();
			return json(result);
		}

		const resolved = resolvePresetId(presetId);
		if (!resolved.ok) {
			return json({ success: false, message: resolved.message }, { status: 400 });
		}

		const result = action === 'start' ? await start(resolved.id) : await restart(resolved.id);
		return startResultToResponse(result);
	},
	{ validateBody: ControlActionSchema }
);
