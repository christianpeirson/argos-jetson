/**
 * POST /api/rf-propagation/p2p
 *
 * Computes point-to-point path loss between a transmitter and receiver
 * via the CloudRF cloud API.
 */

import { json } from '@sveltejs/kit';

import { P2PRequestSchema } from '$lib/schemas/rf-propagation';
import { createHandler } from '$lib/server/api/create-handler';
import { CloudRFError, computePath } from '$lib/server/services/cloudrf/cloudrf-client';
import { safeParseWithHandling } from '$lib/utils/validation-error';

async function parseAndValidateP2PBody(request: Request) {
	let rawBody: unknown;
	try {
		rawBody = await request.json();
	} catch {
		return { error: json({ success: false, error: 'Invalid JSON body' }, { status: 400 }) };
	}
	const validated = safeParseWithHandling(P2PRequestSchema, rawBody, 'api');
	if (!validated) {
		return { error: json({ success: false, error: 'Invalid P2P request' }, { status: 400 }) };
	}
	return { validated };
}

export const POST = createHandler(
	async ({ request }) => {
		const parsed = await parseAndValidateP2PBody(request);
		if (parsed.error) return parsed.error;
		try {
			const result = await computePath(parsed.validated);
			return { success: true, ...result };
		} catch (err: unknown) {
			if (err instanceof CloudRFError) {
				return json({ success: false, error: err.message }, { status: err.statusCode });
			}
			throw err;
		}
	},
	{ validateBody: P2PRequestSchema }
);
