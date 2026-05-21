/**
 * Unit tests for the VNC spawn input guard added in the v1 audit remediation:
 *  - isSafeWindowSearchName (A3, CWE-78) — `centerVncWindow` interpolates the name
 *    into a `bash -c` script, so anything outside a safe title charset is rejected.
 *
 * (A10 — Chromium url arg-injection — is already mitigated upstream: startWebtakVnc
 *  calls validateStartUrl, which `new URL()`-parses and http(s)-protocol-checks the
 *  operator url before it ever reaches spawnChromium. No separate guard needed.)
 */

import { describe, expect, test } from 'vitest';

import { isSafeWindowSearchName } from '../../src/lib/server/services/vnc-common/spawn-helpers';

describe('isSafeWindowSearchName (A3, CWE-78)', () => {
	test('accepts ordinary window titles', () => {
		expect(isSafeWindowSearchName('GNU Radio Companion')).toBe(true);
		expect(isSafeWindowSearchName('openwebrx-1.2.3')).toBe(true);
		expect(isSafeWindowSearchName('WebTAK_window')).toBe(true);
	});

	test('rejects shell-injection payloads', () => {
		expect(isSafeWindowSearchName('"; rm -rf / #')).toBe(false);
		expect(isSafeWindowSearchName('$(reboot)')).toBe(false);
		expect(isSafeWindowSearchName('a`whoami`')).toBe(false);
		expect(isSafeWindowSearchName('a"b')).toBe(false);
		expect(isSafeWindowSearchName('')).toBe(false);
	});
});
