/**
 * Markdown-escape helper for report templates (emcon, sitrep, …).
 *
 * Escape order matters: backslash MUST be escaped before pipe — otherwise a
 * literal `\` in the input would be left bare and the subsequent `|` escape
 * would chain with it (`\|`), breaking the Markdown table-cell boundary.
 * Per CodeQL js/incomplete-sanitization recommendation.
 */
export function escapeMd(s: string | null | undefined): string {
	if (s === null || s === undefined) return '—';
	return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}
