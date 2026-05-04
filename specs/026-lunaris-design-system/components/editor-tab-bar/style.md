# EditorTabBar — Style

`<EditorTabBar>` is **NOT a Carbon wrapper** — it is a bespoke Argos design-system primitive. There is no Carbon source to cite. Visual treatment matches the existing `TerminalTabBar` chrome (preserved during Phase 8.6 migration) so the user-visible look is unchanged.

## Source-of-truth files

| File | Role |
|---|---|
| `src/lib/components/chassis/EditorTabBar.svelte` | Implementation — single source of truth for visual treatment |
| `src/lib/components/dashboard/TerminalTabBar.svelte` (deleted in Phase 8.6) | Pre-migration chrome — visual baseline lifted into the chassis |
| `docs/argos-v2-mockup/dashboard.png` | Argos v2 visual ground-truth (terminal panel section) |

## Anatomy

```html
<div class="editor-tab-bar" role="toolbar" aria-label={ariaLabel} aria-orientation="horizontal">
	{#each tabs as t (t.id)}
		<button
			role="tab"
			aria-selected={t.id === activeId}
			tabindex={isCurrent ? 0 : -1}
			class="editor-tab-bar__tab"
			class:active={t.id === activeId}
		>
			{#if t.icon}<span class="editor-tab-bar__icon" aria-hidden="true">{@render t.icon()}</span>{/if}
			<span class="editor-tab-bar__title">{t.title}</span>
		</button>
		{#if onClose}
			<button
				type="button"
				tabindex={isCurrent ? 0 : -1}
				aria-label={`Close ${t.title}`}
				class="editor-tab-bar__close"
			>×</button>
		{/if}
	{/each}
	{#if trailing}<div class="editor-tab-bar__trailing">{@render trailing()}</div>{/if}
</div>
```

## Sizing + spacing

| Element | Value | Rationale |
|---|---|---|
| Bar height | `32px` | Matches existing `TerminalTabBar` chrome |
| Tab padding | `0 12px` | Compact tab strip |
| Tab + close gap | `4px` | Visual coupling — the close belongs to the preceding tab |
| Tab pair → next pair gap | `2px` | Breathing room between sessions |
| Icon size | `12px` | Matches existing 12×12 SVG icons |
| Title font | `12px / 500 / Geist` | Geist for chrome (per CLAUDE.md typography rules) |
| Close button | `16×16px hit target` (visual 12px ×) | Above WCAG AA 24×24 minimum via padded hit-zone |

## Color tokens

Bespoke chassis — uses Argos's existing CSS custom property tokens (no `@carbon/styles` integration).

| State | Background | Foreground | Border |
|---|---|---|---|
| Default tab | `transparent` | `var(--foreground-muted, var(--foreground))` | `none` |
| Hover tab | `var(--accent, var(--card))` | `var(--foreground)` | `none` |
| Active tab | `var(--card)` | `var(--foreground)` | `1px solid var(--border)` (top + sides) |
| Focused (any item) | inherits | inherits | `2px solid var(--ring)` `:focus-visible` |
| Close button hover | `var(--destructive-soft, rgba(255,92,51,0.1))` | `var(--destructive)` | `none` |

Per Lunaris dark-mode-only: `--background`#111111, `--card`#1A1A1A, `--border`#2E2E2E, `--ring` defaults to `--primary`.

## Typography

- Tab title: **Geist 12px / 500** (chrome font — UI text, not data).
- Close X glyph: **Geist 14px / 400** rendered as a literal `×` character (not an SVG, simpler hit target).
- Icon glyphs: Lucide 12×12, `currentColor`.

## Focus treatment

`:focus-visible` only — focus rings appear for keyboard users, not mouse users. Outline `2px solid var(--ring)` with `outline-offset: -2px` so the ring is INSIDE the tab bounds (avoids visual overflow into adjacent items).

## Reduced-motion compliance

Chassis has no animation. No `@media (prefers-reduced-motion: reduce)` block needed — there's nothing to disable.

## Visual diff vs pre-migration

The chassis lifts the existing `TerminalTabBar` chrome verbatim. Drift expected:

- Close-button hit area widens from 12×12 to 16×16 (WCAG AA target-size compliance).
- Focus ring appears (was absent in pre-migration; pre-migration relied on `tabindex=0` default browser outline that was visually inconsistent across tabs and close buttons).
- Tab + close are now SIBLING `<button>` elements at the DOM level, not parent `<div role="tab">` + child `<button>`. Visually unchanged. Accessibility tree restructured.

Visual diff procedure: chrome-devtools MCP `take_screenshot` of `/dashboard` terminal section pre/post with 3 active sessions. Drift accepted as new baseline.

## Lunaris theme alignment

- **Surfaces**: tab bar inherits parent's background; active tab fills with `var(--card)` to "lift" out of the bar surface.
- **Borders**: active tab carries top + side borders (no bottom border so it merges with the panel content below).
- **Accent for focus ring**: `var(--ring)` defaults to `var(--primary)` (steel blue #A8B8E0); auto-swaps when MIL-STD-2525C palette changes.
