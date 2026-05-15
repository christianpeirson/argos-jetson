import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';

import { PUBLIC_SENTRY_DSN } from '$env/static/public';

if (PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: PUBLIC_SENTRY_DSN,
		sendDefaultPii: true,
		tracesSampleRate: 0.1,
		integrations: [
			Sentry.replayIntegration(),
			Sentry.feedbackIntegration({ colorScheme: 'system' })
		],
		replaysSessionSampleRate: 0.1,
		replaysOnErrorSampleRate: 1.0
	});
}

/**
 * Global error handler for unhandled client-side errors.
 *
 * Wrapped with Sentry's `handleErrorWithSentry` so the client error is captured
 * to Sentry in addition to the existing console + `App.Error` payload.
 */
const myErrorHandler: HandleClientError = ({ error, event, status }) => {
	const errorId = crypto.randomUUID();

	const errorDetails: Record<string, unknown> = {
		errorId,
		status,
		url: event.url.pathname,
		timestamp: new Date().toISOString(),
		...(error instanceof Error
			? { name: error.name, message: error.message, stack: error.stack }
			: { error: String(error), type: typeof error })
	};

	console.error('Unhandled client error occurred', errorDetails);

	return {
		message:
			'An unexpected client error occurred. Please try again or contact support if the issue persists.',
		errorId
	};
};

export const handleError: HandleClientError = Sentry.handleErrorWithSentry(myErrorHandler);
