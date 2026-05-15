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

	it('allows IBM Carbon CDN for Plex fonts (font-src)', () => {
		expect(cspOf()).toContain("font-src 'self' https://1.www.s81c.com data:");
	});

	it('allows IBM Carbon CDN for companion stylesheets (style-src)', () => {
		expect(cspOf()).toContain("style-src 'self' 'unsafe-inline' https://1.www.s81c.com");
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
