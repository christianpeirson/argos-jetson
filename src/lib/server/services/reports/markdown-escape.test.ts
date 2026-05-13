import { describe, expect, it } from 'vitest';

import { escapeMd } from './markdown-escape';

describe('escapeMd', () => {
	it('returns the em-dash placeholder for null/undefined', () => {
		expect(escapeMd(null)).toBe('—');
		expect(escapeMd(undefined)).toBe('—');
	});

	it('passes plain strings through unchanged', () => {
		expect(escapeMd('hello world')).toBe('hello world');
		expect(escapeMd('')).toBe('');
	});

	it('escapes literal pipes for Markdown table cells', () => {
		expect(escapeMd('a|b')).toBe('a\\|b');
		expect(escapeMd('|||')).toBe('\\|\\|\\|');
	});

	it('escapes backslashes before pipes (CodeQL js/incomplete-sanitization fix)', () => {
		// Without backslash-first escaping, a literal `\` chains with the
		// subsequent pipe-escape to produce `\\|`, which a strict Markdown
		// parser reads as escaped-backslash + pipe — breaking the table cell.
		// Backslash-first produces `\\\|`: escaped-backslash + escaped-pipe.
		expect(escapeMd('a\\|b')).toBe('a\\\\\\|b');
		expect(escapeMd('\\')).toBe('\\\\');
	});

	it('escapes only backslash and pipe — leaves other markdown chars alone', () => {
		// This is a *table-cell* escaper, not a full Markdown sanitizer. Other
		// chars (`*`, `_`, `<`, etc.) pass through; the consumer is expected to
		// be a vetted Markdown renderer.
		expect(escapeMd('*italic*')).toBe('*italic*');
		expect(escapeMd('<script>')).toBe('<script>');
	});
});
