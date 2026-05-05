/**
 * Shared control-endpoint client used by sibling service stores
 * (`bluetooth-store`, `uas-store`, and any future store that talks to
 * an `/api/<service>/control` POST endpoint with the
 * `{ success, message?, error? }` response shape).
 *
 * Each store owns its own error setter + status refetch; this factory only
 * holds the POST-and-classify logic and the standard error-message fallback
 * chain (`data.error → data.message → failLabel → caught error message`).
 *
 * @module
 */

interface ControlResponse {
	success?: boolean;
	message?: string;
	error?: string;
}

export interface ControlClientHooks {
	/** Invoked with the resolved error message on every non-success path. */
	setError: (msg: string) => void;
	/** Invoked after a successful POST so the store re-syncs its visible state. */
	refreshStatus: () => Promise<void>;
}

/**
 * Factory: bind a control endpoint URL + the store's error/refresh hooks
 * once and return a `runControl(body, failLabel)` closure that POSTs the
 * body, classifies the response, and dispatches success vs failure.
 */
function resolveErrorMessage(data: ControlResponse, failLabel: string): string {
	return data.error ?? data.message ?? failLabel;
}

function caughtErrorMessage(err: unknown, failLabel: string): string {
	return err instanceof Error ? err.message : failLabel;
}

export function createControlClient(
	endpoint: string,
	hooks: ControlClientHooks
): (body: Record<string, unknown>, failLabel: string) => Promise<boolean> {
	async function runControl(body: Record<string, unknown>, failLabel: string): Promise<boolean> {
		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify(body)
			});
			const data = (await res.json()) as ControlResponse;
			if (!res.ok || data.success !== true) {
				hooks.setError(resolveErrorMessage(data, failLabel));
				return false;
			}
			await hooks.refreshStatus();
			return true;
		} catch (err) {
			hooks.setError(caughtErrorMessage(err, failLabel));
			return false;
		}
	}
	return runControl;
}
