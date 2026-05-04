# ContentSwitcher — Accessibility

**Status:** Phase 9.1 PR — implementation in flight
**Last updated:** 2026-05-04
**Carbon mirror:** `docs/carbon-website/src/pages/components/ContentSwitcher/accessibility.mdx`
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ContentSwitcher/ContentSwitcher.svelte>

---

## What Carbon provides for free

Per Carbon ContentSwitcher source confirms (`role="tablist"` + `role="tab"` pattern, ARIA Authoring Practices "tabs" pattern adapted for inline content swapping):

### Semantic structure

- Outer `<div>` carries `role="tablist"`, `aria-label` (from `aria-label` prop or auto-generated). Each `<Switch>` renders as `<button role="tab">` with `aria-selected="true|false"` + `tabindex="0|-1"` (roving tabindex).
- The selected switch's `tabindex="0"` makes it the single tab-stop; arrow keys move active selection within and update tabindex accordingly. Inactive switches carry `tabindex="-1"` so they're not in the document tab order.
- `id` defaults to `ccs-${random}`; per-switch ids are `ccs-${random}-${index}`. No duplicate-id risk.

### ARIA wiring (verified in Carbon source)

- **`role="tablist"`** on outer div, **`role="tab"`** on each `<Switch>` button. AT announces "tab list, [N] tabs, [label] tab [n] of [N], selected".
- **`aria-selected`** is set explicitly on each tab — `"true"` for the active, `"false"` for the rest. AT consumes this for state announcement.
- **`aria-label`** on the tablist — required (Carbon does not enforce; wrapper enforces via lint rule). Without it, AT announces "tab list" with no semantic context.
- **`aria-controls`** is NOT wired by Carbon's `<ContentSwitcher>` — because it does not own the swapped panel; the consuming component does. If the swapped region is on the same page, manually wire `aria-controls={panelId}` on each `<Switch>` AND `role="tabpanel" aria-labelledby={tabId}` on the consuming panel. None of the Phase 9.1 sites currently wire this; documented as a Phase 9.1 follow-up.
- **`tabindex` roving** — Carbon manages the focus index automatically as `selectedIndex` changes; consumers do not touch tabindex.
- **`disabled`** — HTML attribute on per-segment buttons; AT auto-announces "disabled"; browser removes from tab order.

### Keyboard interaction

| Key | Behavior |
| --- | --- |
| Tab | Move focus into the switcher (lands on selected tab). Tab again moves out. |
| Shift+Tab | Move focus out backward. |
| Left / Up | Move active tab to previous (wraps to last). In `automatic` mode, also commits + emits `change`. |
| Right / Down | Move active tab to next (wraps to first). In `automatic` mode, also commits. |
| Home | Move active tab to first. |
| End | Move active tab to last. |
| Space / Enter | In `manual` mode, commits the focused tab as selected. In `automatic` mode, no-op (already committed). |

### Color contrast (Carbon's audit floor)

Carbon's stock theme passes WCAG 2.1 AA. Lunaris token overrides MUST preserve those ratios.

| Pair                                                | Min contrast (AA) | Lunaris target                                           | Status                                              |
| --------------------------------------------------- | ----------------- | -------------------------------------------------------- | --------------------------------------------------- |
| Border (`$border-strong`) on `--bg-2`               | 3:1 (graphical)   | `var(--ink-3)` on `var(--bg-2)`                          | ≈ 6.2:1 ✓                                            |
| Unselected label (`$text-secondary`) on `$layer`    | 4.5:1             | `var(--ink-2)` on `var(--bg-2)`                          | ≈ 11.4:1 ✓                                           |
| Selected label (`$text-inverse`) on selected fill   | 4.5:1             | `var(--bg)` on `var(--ink)`                              | ≈ 14.6:1 ✓ (subtractive — same as inverse)           |
| Focus outline (`$focus`) on any background          | 3:1 (graphical)   | `var(--accent)` ≈ 7.4:1 vs `--bg` and `--bg-2`           | ✓                                                    |
| Disabled label / border                             | 3:1 (graphical)   | `var(--ink-5)` (oklch 32%) on `var(--bg-2)`              | ≈ 1.7:1 ⚠ — expected for disabled, AT announces state |

**No amber flags.** Disabled contrast is intentionally low per WCAG-conformant pattern. All Phase 9.1 sites pass.

---

## Argos-specific a11y considerations

### Tap target compliance (WCAG 2.2 SC 2.5.8)

Carbon's segments are full-width (`flex: 1 1 0`). Effective tap target is the segment's full rendered width × height.

| Surface                | Carbon size | Per-segment height | Per-segment min width  | WCAG 2.5.8 (24 px) |
| ---------------------- | ----------- | ------------------ | ---------------------- | ------------------ |
| SPECTRUM mode toggle   | sm          | 24 px              | ≈ 60 px (PEAK/AVG/LIVE)| ✓ pass             |
| AGENTS filter tabs     | default     | 32 px              | ≈ 70 px each           | ✓ pass             |
| AGENTS view-mode (icon)| default     | 32 px              | 32 px (square)         | ✓ pass (32 ≥ 24)    |
| FilterBar chips        | sm          | 24 px              | varies, ≥ 50 px        | ✓ pass             |
| ReportsView export     | default     | 32 px              | ≈ 80 px each           | ✓ pass             |

WCAG 2.1 SC 2.5.5 (44 × 44 px AAA) is **not** satisfied at any density. Documented as Argos-wide deviation from AAA in Phase 7 audit.

### `aria-controls` linkage to swapped panel (Phase 9.1 follow-up)

Argos's bespoke segmented controls did not wire `aria-controls` to their consumed panels. Carbon's `<ContentSwitcher>` likewise leaves this to consumers. Per ARIA Authoring Practices "tabs" pattern, fully-conformant tablist needs:

- `<Switch aria-controls={panelId}>` — points to the region whose content swaps based on selection.
- `<region id={panelId} role="tabpanel" aria-labelledby={tabId} tabindex="0">` on the consuming panel.

Phase 9.1 ships the wrapper without enforcing this linkage (parity with bespoke). Phase 7 audit (post-Phase 9.x) re-evaluates whether ContentSwitcher consumers should mandate `aria-controls` per pattern. Three considerations:

1. SPECTRUM mode toggle swaps a numeric mode in the same canvas — region is unambiguous, linkage is low-value.
2. AGENTS filter tabs swap the same `<table>`'s row-set — region is unambiguous, linkage is low-value.
3. AGENTS view-mode (GRID/LIST/SPLIT) swaps the entire panel layout — region IS load-bearing; linkage adds AT value.

If Phase 7 mandates `aria-controls`, the wrapper grows a `<Switch panelId={...}>` mapping prop. Deferred until audit.

### Icon-only accessible names

The AGENTS view-mode toggle uses icon-only switches. Carbon's `<Switch iconDescription="...">` becomes the accessible name when the visible content is icon-only. The wrapper enforces `iconDescription` is required when `text` is empty (lint rule) so AT users always have a label.

If a future surface uses both an icon AND text, the `text` prop is the accessible name and `iconDescription` is unused — Carbon does not concatenate.

### Live-region announcements for selection changes

Selection changes are announced by the tab role + `aria-selected` state change, not via a `aria-live` region. AT users hear "[label], tab, [n] of [N], selected" on focus. There is no separate announcement when the consumed panel's content updates — the consuming panel must own its own live-region pattern if updates are load-bearing.

For SPECTRUM mode (PEAK/AVG/LIVE), the canvas's data label updates — but visual change is the primary indicator and AT users typically don't sonify the live spectrum. No `aria-live` is added.

For AGENTS filter, the table's row count changes. A `aria-live="polite"` row-count announcer would be additive — deferred to Phase 7 audit.

### Reduced motion

Carbon uses `motion(standard, productive)` for the bg-color transition on hover and selection. The duration is `$duration-fast-02` (110 ms). Lunaris does not override; users with `prefers-reduced-motion: reduce` get instant transitions because Carbon's motion mixin respects the media query at the token layer.

---

## Verification checklist (Phase 9.1)

| Check                                | Tool                                  | Pass criterion                                                                |
| ------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| WCAG 2.1 AA on each migrated surface | `@axe-core/playwright` (`AxeBuilder`) | `violations: []` with `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice`     |
| Roving tabindex                      | Playwright keyboard nav               | Tab lands on selected only; arrow keys move and update tabindex               |
| Arrow-key wrap                       | Playwright keyboard test              | Right from last wraps to first; Left from first wraps to last                  |
| Home / End                           | Playwright keyboard test              | Home moves to first; End moves to last                                        |
| Space (manual mode)                  | Playwright keyboard test              | In `selectiveMode="manual"`, Space commits focused tab                        |
| Focus ring visible                   | manual + Playwright `:focus` check    | 2-px outline visible at all densities + accents                               |
| Color contrast (border, focus, fill) | chrome-devtools MCP + axe             | Border ≥ 3:1, Focus ≥ 3:1, Selected fg ≥ 4.5:1                                |
| Icon-only `iconDescription`          | axe rule `aria-input-field-name`      | All icon-only switches have `iconDescription`                                  |
| Selection state announcement        | manual NVDA / VoiceOver pass          | "[label], tab, [n] of [N], selected" on each focus                            |

Phase 7 includes the full WCAG 2.1 AA audit for all migrated segmented surfaces.

---

## Authority citations

- Carbon Svelte source (v0.107.0): <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ContentSwitcher/ContentSwitcher.svelte>
- Carbon ContentSwitcher a11y mdx: `docs/carbon-website/src/pages/components/ContentSwitcher/accessibility.mdx`
- Carbon ContentSwitcher SCSS: `docs/carbon-design-system/packages/styles/scss/components/content-switcher/_content-switcher.scss`
- WCAG 2.1: <https://www.w3.org/TR/WCAG21/>
- WCAG 2.2 SC 2.5.8 Target Size (Minimum): <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- ARIA Authoring Practices for tabs: <https://www.w3.org/WAI/ARIA/apg/patterns/tabs/>
- axe-core rule reference: <https://dequeuniversity.com/rules/axe/4.9/>
- Roving tabindex pattern: <https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex>
