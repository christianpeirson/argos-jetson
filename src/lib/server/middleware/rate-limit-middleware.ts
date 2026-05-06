/**
 * Rate limiting middleware helpers
 * Extracted from hooks.server.ts to keep the main hooks file under 300 lines.
 */

import type { Handle } from '@sveltejs/kit';

import { logAuthEvent } from '$lib/server/security/auth-audit';
import { RateLimiter } from '$lib/server/security/rate-limiter';

// Singleton rate limiter (globalThis for HMR persistence) - Phase 2.2.5
// globalThis.__rateLimiter and __rateLimiterCleanup are typed in src/app.d.ts.
const rateLimiter = globalThis.__rateLimiter ?? (globalThis.__rateLimiter = new RateLimiter());

// Cleanup interval (globalThis guard for HMR) - Phase 2.2.5
if (!globalThis.__rateLimiterCleanup) {
	globalThis.__rateLimiterCleanup = setInterval(
		() => rateLimiter.cleanup(),
		300_000 // 5 minutes
	);
}

/**
 * Safe client address getter - handles VPN/Tailscale networking issues.
 * Returns 'unknown' when client address cannot be determined.
 */
export function getSafeClientAddress(event: Parameters<Handle>[0]['event']): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'unknown';
	}
}

/** Extract session identifier from cookie header, or null if unavailable. */
function extractSessionId(cookieHeader: string | null): string | null {
	if (!cookieHeader) return null;
	const sessionMatch = cookieHeader.match(/__argos_session=([^;]+)/);
	return sessionMatch ? sessionMatch[1].slice(0, 16) : null;
}

/**
 * Get rate limit identifier - uses session cookie when IP unavailable.
 * This prevents all Tailscale clients from sharing the same rate limit bucket.
 */
function getRateLimitKey(event: Parameters<Handle>[0]['event'], prefix: string): string {
	try {
		return `${prefix}:${event.getClientAddress()}`;
	} catch {
		const sessionId = extractSessionId(event.request.headers.get('cookie'));
		return sessionId ? `${prefix}:session:${sessionId}` : `${prefix}:unknown`;
	}
}

/**
 * DragonSync control endpoint — exact path, NOT a prefix.
 * Declared separately so matchers can use exact/subpath check instead of
 * `startsWith` (which would also match /api/dragonsync/controller, etc.).
 */
const DRAGONSYNC_CONTROL_PATH = '/api/dragonsync/control';

/**
 * Path prefixes that should be rate-limited on the 30 req/min hardware
 * tier instead of the 200 req/min generic API tier.
 *
 * Scope: any endpoint that fronts a physical radio / scanner / capture tool
 * or an external daemon wrapping one (HackRF, Alfa/Kismet, B205 mini,
 * RTL-SDR, Bluetooth, GPS-fed recon). Bursts of these can stall hardware
 * or exhaust process/FD budgets, so they get a smaller bucket.
 *
 * TODO(architecture): prefer per-route tier metadata on createHandler({
 * tier: 'hardware' }) over this prefix list — the list drifts every time a
 * new hardware domain is added (this patch alone added 9). Track as P2
 * refactor; do not implement the decorator here.
 */
const HARDWARE_PATH_PREFIXES = [
	// Existing hardware/control routes
	'/api/hackrf/',
	'/api/kismet/control/',
	'/api/droneid/',
	'/api/rf/',
	'/api/openwebrx/control/',

	// Expanded per Task #4 (P1 audit): gsm-evil now covered broadly (status,
	// activity, frames, imsi, scan, etc. all touch the B205/OsmocomBB stack)
	// — control subpath is subsumed by the domain-wide prefix.
	'/api/gsm-evil/',

	// Hardware-adjacent recon / SDR / capture tools previously falling to
	// the 200/min generic API budget.
	'/api/sparrow/',
	'/api/sightline/',
	'/api/sdrpp/',
	'/api/novasdr/',
	'/api/bluedragon/',
	'/api/bluehood/',
	DRAGONSYNC_CONTROL_PATH,
	'/api/trunk-recorder/',
	'/api/hardware/',

	// Sensitive SQL-query endpoint (Task #15): raw DB query path sanitized +
	// readonly + LIMIT-clamped, but the factory-edge still runs arbitrary user
	// SQL. Belongs on the 30/min tier, not the 200/min generic API budget.
	'/api/database/query'
] as const;

/**
 * Exact-match + subpath matcher for /api/dragonsync/control.
 * Avoids prefix collision with sibling paths like /api/dragonsync/controller
 * (which does not exist today but would be misclassified if added).
 */
function isDragonSyncControlPath(path: string): boolean {
	return path === DRAGONSYNC_CONTROL_PATH || path.startsWith(`${DRAGONSYNC_CONTROL_PATH}/`);
}

/**
 * Check if a path is a hardware control endpoint.
 * Hardware control endpoints have stricter rate limits.
 */
export function isHardwareControlPath(path: string): boolean {
	if (isDragonSyncControlPath(path)) return true;
	return HARDWARE_PATH_PREFIXES.some((p) => p !== DRAGONSYNC_CONTROL_PATH && path.startsWith(p));
}

export function isDragonSyncReadPath(path: string): boolean {
	return path.startsWith('/api/dragonsync/') && !isDragonSyncControlPath(path);
}

/** Check if this path should skip rate limiting (streaming/SSE endpoints and map tiles). */
function isStreamingPath(path: string): boolean {
	return (
		path.includes('data-stream') ||
		path.endsWith('/stream') ||
		path.endsWith('/sse') ||
		path.startsWith('/api/map-tiles/')
	);
}

/** Build a 429 rate-limit response and log the audit event. */
function buildRateLimitResponse(
	ip: string,
	method: string,
	path: string,
	reason: string,
	retryAfter: string
): Response {
	logAuthEvent({ eventType: 'RATE_LIMIT_EXCEEDED', ip, method, path, reason });
	return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
		status: 429,
		headers: { 'Content-Type': 'application/json', 'Retry-After': retryAfter }
	});
}

/** Check hardware control rate limit. Returns 429 Response or null. */
function checkHardwareRateLimit(event: Parameters<Handle>[0]['event']): Response | null {
	const hwKey = getRateLimitKey(event, 'hw');
	const hwLimit = hwKey.includes('unknown') ? 60 : 30;
	if (rateLimiter.check(hwKey, hwLimit, hwLimit / 60)) return null;
	return buildRateLimitResponse(
		getSafeClientAddress(event),
		event.request.method,
		event.url.pathname,
		`Hardware control rate limit exceeded (${hwLimit} req/min)`,
		'60'
	);
}

/** Check API rate limit. Returns 429 Response or null. */
function checkApiRateLimit(event: Parameters<Handle>[0]['event']): Response | null {
	const apiKey = getRateLimitKey(event, 'api');
	if (rateLimiter.check(apiKey, 200, 200 / 60)) return null;
	return buildRateLimitResponse(
		getSafeClientAddress(event),
		event.request.method,
		event.url.pathname,
		'API rate limit exceeded (200 req/min)',
		'10'
	);
}

function checkDragonSyncReadRateLimit(event: Parameters<Handle>[0]['event']): Response | null {
	const dsrKey = getRateLimitKey(event, 'dsr');
	if (rateLimiter.check(dsrKey, 600, 600 / 60)) return null;
	return buildRateLimitResponse(
		getSafeClientAddress(event),
		event.request.method,
		event.url.pathname,
		'DragonSync read rate limit exceeded (600 req/min)',
		'10'
	);
}

/**
 * Apply rate limiting to a request. Returns a 429 Response if rate limit
 * is exceeded, or null if the request should proceed.
 */
export function checkRateLimit(event: Parameters<Handle>[0]['event']): Response | null {
	const path = event.url.pathname;
	if (isStreamingPath(path)) return null;
	if (isHardwareControlPath(path)) return checkHardwareRateLimit(event);
	if (isDragonSyncReadPath(path)) return checkDragonSyncReadRateLimit(event);
	if (path.startsWith('/api/')) return checkApiRateLimit(event);
	return null;
}
