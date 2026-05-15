import { json } from '@sveltejs/kit';

import { createHandler } from '$lib/server/api/create-handler';
import { resetPollerBackoff } from '$lib/server/kismet/kismet-poller';
import { WebSocketManager } from '$lib/server/kismet/web-socket-manager';
import { startKismet } from '$lib/server/services/kismet/kismet-control-service';
import { getKismetSignalSource } from '$lib/server/services/rf/kismet-source-singleton';
import { getCurrentSessionId, startNewSession } from '$lib/server/services/session/session-tracker';

/**
 * POST /api/kismet/start
 * Starts Kismet WiFi discovery service + the server-side persistence bridge
 * that polls kismet-proxy and stamps every observation with the active
 * session id. Prior to PR-3, only Blue Dragon signals were persisted.
 */
export const POST = createHandler(async () => {
	const result = await startKismet();

	if (!result.success) {
		return json(result, { status: 500 });
	}

	// Roll a new RF-visualization session on a fresh Kismet run so observations
	// land in a scoped bucket. 'already_running' skips — no new run, no boundary.
	if (result.status === 'started' || result.status === 'starting') {
		startNewSession('kismet-start', 'Kismet WiFi discovery');
	}

	// Start the persistence bridge — idempotent, safe on 'already_running'.
	await getKismetSignalSource().start(getCurrentSessionId());

	// Re-arm the kismet-proxy poller's fast cadence in case it was in
	// ECONNREFUSED backoff. Without this, the WSManager's setInterval
	// would still be skipping for up to 5 min after kismet starts.
	resetPollerBackoff(WebSocketManager.getInstance().getPollerState());

	return result;
});
