/**
 * Vendored noVNC ESM bundle integrity check.
 *
 * The user-visible bug fixed by F8 (PR after #156): `inflator.js` and
 * `deflator.js` in `static/webtak/novnc/` import from `../vendor/pako/...`,
 * but that vendor tree was missing from commit c8e9e3f8 onward. When a
 * single transitive import 404s, Chrome rejects the entire dynamic
 * import with an error pointing at the entry module (rfb.js), not the
 * missing dep — making the failure invisible without devtools.
 *
 * This test pins the manifest so a future cleanup PR can't silently
 * delete the vendor tree again.
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const STATIC_WEBTAK = resolve(process.cwd(), 'static/webtak');

const REQUIRED_PAKO_FILES = [
	'vendor/pako/lib/zlib/inflate.js',
	'vendor/pako/lib/zlib/deflate.js',
	'vendor/pako/lib/zlib/zstream.js',
	'vendor/pako/lib/zlib/adler32.js',
	'vendor/pako/lib/zlib/crc32.js',
	'vendor/pako/lib/zlib/inffast.js',
	'vendor/pako/lib/zlib/inftrees.js',
	'vendor/pako/lib/zlib/trees.js',
	'vendor/pako/lib/zlib/messages.js',
	'vendor/pako/lib/zlib/constants.js',
	'vendor/pako/lib/zlib/gzheader.js',
	'vendor/pako/lib/utils/common.js'
];

const REQUIRED_NOVNC_ENTRY = 'novnc/rfb.js';

describe('webtak vendored noVNC bundle', () => {
	it('keeps rfb.js entry module present', () => {
		expect(existsSync(resolve(STATIC_WEBTAK, REQUIRED_NOVNC_ENTRY))).toBe(true);
	});

	for (const f of REQUIRED_PAKO_FILES) {
		it(`keeps ${f} vendored (broken dynamic import without it)`, () => {
			expect(existsSync(resolve(STATIC_WEBTAK, f))).toBe(true);
		});
	}
});
