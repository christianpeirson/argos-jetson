/**
 * Smoke test for security-headers middleware.
 *
 * Pins the IBM Carbon CDN allowlist landed in PR #156 — without these
 * exact hosts in font-src + style-src, the dashboard floods the console
 * with ~250 CSP violations the moment Carbon's Plex fonts try to load.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ dev: false }));

import { applySecurityHeaders } from './security-headers';

function cspOf(): string {
	const res = new Response();
	applySecurityHeaders(res);
	return res.headers.get('Content-Security-Policy') ?? '';
}

describe('applySecurityHeaders', () => {
	it('sets Content-Security-Policy', () => {
		expect(cspOf()).toContain('default-src');
	});

	it('allows IBM Carbon CDN and Google Fonts gstatic for fonts (font-src)', () => {
		expect(cspOf()).toContain(
			"font-src 'self' https://1.www.s81c.com https://fonts.gstatic.com data:"
		);
	});

	it('allows IBM Carbon CDN and Google Fonts stylesheets (style-src)', () => {
		expect(cspOf()).toContain(
			"style-src 'self' 'unsafe-inline' https://1.www.s81c.com https://fonts.googleapis.com"
		);
	});

	it('sets style-src-elem explicitly so browsers do not fall back to style-src', () => {
		expect(cspOf()).toContain(
			"style-src-elem 'self' 'unsafe-inline' https://1.www.s81c.com https://fonts.googleapis.com"
		);
	});

	it('allows Sentry ingest + general sentry.io hosts on connect-src', () => {
		// Wired with @sentry/sveltekit so the browser SDK can POST events to
		// https://oXXX.ingest.us.sentry.io/... without tripping CSP. Without
		// these allowlist entries, every captured client error gets blocked
		// at the connect-src stage and never reaches the Sentry project.
		const csp = cspOf();
		expect(csp).toContain('https://*.ingest.us.sentry.io');
		expect(csp).toContain('https://*.sentry.io');
	});

	it('keeps object-src none for non-PDF routes', () => {
		expect(cspOf()).toContain("object-src 'none'");
	});

	it('relaxes object-src to self for PDF embed routes', () => {
		const res = new Response();
		applySecurityHeaders(res, '/api/reports/abc/view');
		expect(res.headers.get('Content-Security-Policy')).toContain("object-src 'self'");
	});
});
