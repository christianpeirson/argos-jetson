/**
 * POST /api/gnuradio/control
 *
 * Start, stop, or check the status of the GNU Radio VNC stack
 * (Xtigervnc + gnuradio-companion + websockify).
 *
 * Body shapes:
 *   { action: "start", flowgraph?: "/tmp/argos-grc-demo.grc" }
 *   { action: "stop" }
 *   { action: "status" }
 *
 * Mirrors src/routes/api/wireshark/control/+server.ts.
 */

import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { createHandler } from '$lib/server/api/create-handler';
import {
	getGnuRadioVncStatus,
	startGnuRadioVnc,
	stopGnuRadioVnc
} from '$lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service';

const _flowgraphSchema = z
	.string()
	.min(1)
	.max(512)
	.regex(/\.grc$/i, 'flowgraph path must end in .grc');

export const _GnuRadioVncControlSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('start'),
		flowgraph: _flowgraphSchema.optional()
	}),
	z.object({ action: z.literal('stop') }),
	z.object({ action: z.literal('status') })
]);

type GnuRadioVncResult =
	| Awaited<ReturnType<typeof startGnuRadioVnc | typeof stopGnuRadioVnc>>
	| ReturnType<typeof getGnuRadioVncStatus>;

function resultStatus(result: GnuRadioVncResult): number {
	if (result.success) return 200;
	return 'error' in result && result.error ? 400 : 500;
}

export const POST = createHandler(
	async ({ request }) => {
		// createHandler has already run _GnuRadioVncControlSchema.safeParse on
		// a clone of this body and returned 400 on failure, so .parse() here is
		// a typed narrow that cannot throw at runtime.
		const body = (await request.json()) as unknown;
		const validated = _GnuRadioVncControlSchema.parse(body);

		if (validated.action === 'start') {
			const result = await startGnuRadioVnc(validated.flowgraph);
			return json(result, { status: resultStatus(result) });
		}
		if (validated.action === 'stop') {
			const result = await stopGnuRadioVnc();
			return json(result, { status: resultStatus(result) });
		}
		return json(getGnuRadioVncStatus());
	},
	{ validateBody: _GnuRadioVncControlSchema }
);
