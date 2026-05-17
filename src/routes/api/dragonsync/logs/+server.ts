/**
 * GET /api/dragonsync/logs — Server-Sent Events stream of journalctl output
 * for the three DragonSync services.
 *
 * Consumed by `UASScanView.svelte` via the browser's native `EventSource`.
 * Auth is enforced upstream in `src/hooks.server.ts` (session cookie or
 * X-API-Key header), so this handler can assume the caller is authorized.
 *
 * @module
 */

import { createLogStream } from '$lib/server/services/dragonsync/log-streamer';

export const GET = async ({ request }: { request: Request }): Promise<Response> => {
	const stream = createLogStream(request.signal);

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			// Disable buffering in any intermediate proxy / gzip compression.
			'Cache-Control': 'no-store, no-transform',
			Connection: 'keep-alive',
			// Explicit hint for nginx et al. that this is a long-lived stream.
			'X-Accel-Buffering': 'no'
		}
	});
};
