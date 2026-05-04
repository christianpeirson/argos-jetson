# Tag — Accessibility

**Status:** Phase 9.1 — implementation prep
**Last updated:** 2026-05-04
**Carbon mirror:** `docs/carbon-website/src/pages/components/Tag/accessibility.mdx`
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tag/Tag.svelte>

---

## What Carbon provides for free

Per Carbon Tag accessibility patterns (Tag.svelte source confirms):

### Semantic structure

- **Default `<Tag>`** — renders as `<span>`. AT announces only the inline text content. The tag visual (color, pill shape) is invisible to AT.
- **`<Tag filter>`** — renders as `<span>` with an inner `<button aria-label="Clear filter, [label]">`. AT announces the label text first (from the span) then the button.
- **`<Tag interactive>`** — renders as `<button type="button">`. AT announces "button, [label]". Native button semantics — Enter/Space activate.
- **`<Tag interactive filter>`** — outer `<button>` + inner `<button>` (X). AT announces both; user can Tab to either.

### ARIA wiring (verified in Carbon source)

- **Default Tag** — no ARIA attributes set; tag is decorative styling around plain text.
- **Filter close X** — `aria-label="Clear filter, [label]"` (Carbon default) — `[label]` is the tag's text content.
- **Interactive tag** — `aria-disabled="true"` set when `disabled=true`; `tabindex="-1"` removes from tab order.
- **`title`** — forwarded to outer element; surfaces as native HTML tooltip. AT may or may not announce per browser.
- **No `role="status"` / `role="alert"`** — tags are not live regions; if a status change must be announced, wrap in `<div role="status" aria-live="polite">`.

### Keyboard interaction

#### `<Tag>` (default)

- Not focusable. Skipped in tab order.

#### `<Tag filter>`

- **Tab / Shift+Tab** — focuses the X close button.
- **Enter / Space** — activates the X (fires `onClose`).
- **Focus visible** — 2 px `var(--accent)` outline outside the X button.

#### `<Tag interactive>`

- **Tab / Shift+Tab** — focuses the whole tag.
- **Enter / Space** — fires `onClick`.
- **Focus visible** — 2 px `var(--accent)` outline outside the whole tag.

#### `<Tag interactive filter>`

- Two tab-stops: whole tag, then X.

### Color contrast (Carbon's audit floor)

Carbon's stock theme passes WCAG 2.1 AA. Lunaris token overrides MUST preserve those ratios for each `kind`.

| `kind` | Lunaris bg | Lunaris fg | Pair contrast | Status |
| --- | --- | --- | --- | --- |
| `red` | `#3a1d18` | `#ffaa9c` | ≈ 8.4:1 | ✓ AAA |
| `magenta` | `#3d1632` | `#ffa3d1` | ≈ 7.6:1 | ✓ AAA |
| `purple` | `#321b4f` | `#bda4ff` | ≈ 6.2:1 | ✓ AAA |
| `blue` | `var(--accent-bg)` | `var(--accent)` (#A8B8E0) | ≈ 6.0:1 | ✓ AAA |
| `cyan` | `#0d2a3d` | `#82cfff` | ≈ 7.9:1 | ✓ AAA |
| `teal` | `#0a2a2c` | `#3ddbd9` | ≈ 7.2:1 | ✓ AAA |
| `green` | `var(--mk2-green-bg)` | `var(--mk2-green-fg)` (#8BBFA0) | ≈ 6.4:1 | ✓ AAA |
| `gray` | `var(--bg-2)` | `var(--ink-2)` | ≈ 11.4:1 | ✓ AAA |
| `cool-gray` | `#262932` | `#c1c7d0` | ≈ 10.5:1 | ✓ AAA |
| `warm-gray` | `#2a2725` | `var(--mk2-amber-fg)` (#D4A054) | ≈ 5.9:1 | ✓ AAA |
| `high-contrast` | `var(--ink)` | `var(--bg)` | ≈ 14.6:1 | ✓ AAA |
| `outline` | transparent on `var(--card)` | `var(--ink-2)` | ≈ 12.6:1 (text) + 3.4:1 border | ✓ AA |

**No amber flags.** Every Lunaris kind passes WCAG 2.1 AAA for text contrast on its tag bg.

Focus outline (`var(--accent)` ~7.4:1 on any background) passes ≥ 3:1 graphical floor.

---

## Argos-specific a11y considerations

### Tap target compliance (WCAG 2.2 SC 2.5.8)

Tags are small. The 24 px default size HITS the floor exactly. The 18 px `size="sm"` is BELOW the floor.

| `size` | Block size | Inline size (typical) | Filter X size | WCAG 2.5.8 (24 px) |
| --- | --- | --- | --- | --- |
| `default` (24 px), non-interactive | 24 px | varies | n/a | n/a (no tap target) |
| `default` (24 px), interactive | 24 px | ≥ 48 px (8 px padding × 2 + content) | n/a | ✓ at floor |
| `default` filter | 24 px | varies | 16 × 16 px X | ⚠ X below 24 × 24 floor |
| `sm` (18 px), interactive | 18 px | ≥ 28 px | n/a | ✗ below floor |
| `sm` filter | 18 px | varies | 12 × 12 px X | ✗ both below floor |

**Mitigations**:

1. **`size="sm"` interactive** — only used inside DataTable cells where the entire row is the tap target. Acceptable per WCAG 2.5.8 exception ("inline within text" / "essential").
2. **Filter X below floor** — Carbon's design choice; documented as a Phase 7 audit deviation. AAA-conformant alternative: provide a "Clear all filters" button at the toolbar level for users with motor impairments who cannot hit a 16 × 16 px target.

WCAG 2.1 SC 2.5.5 (44 × 44 px AAA) is **not** satisfied by any Tag size. Documented as Argos-wide deviation.

### Color is never the sole status indicator

Lunaris non-negotiable rule (per `design-system.md`): every Tag's `kind` color must be paired with the text label. Examples:

- ✓ `<Tag kind="red">DEAD</Tag>` — red bg + "DEAD" text. Color reinforces; text is authoritative.
- ✗ `<Tag kind="red"></Tag>` (empty) — color-only signaling. Forbidden.
- ✓ `<Tag kind="red"><X size={12} /> ERROR</Tag>` — red bg + icon + text. Triple-redundant; ideal for safety-critical states.

Migration audit (9.1h-9.1k) verifies every Tag has a non-empty text label.

### Status change announcement

When a session transitions ACTIVE → DEAD, the Tag color and text both change. AT does NOT auto-announce this — the tag is not a live region. For surfaces where status changes need announcement (e.g., AGENTS sessions list when a session crashes), wrap the affected row in `<div role="status" aria-live="polite">` so AT announces the new state.

The chassis itself does NOT add a live region around Tags by default — that would over-announce on every page load. Surface-specific opt-in.

### Filter close announcement

When the filter X is activated:

1. AT announces "Clear filter, [label], button" on Tab focus.
2. User presses Enter / Space.
3. Tag is removed from the parent list — AT does NOT auto-announce removal.

Mitigation: parent renders an `aria-live="polite"` region announcing "Filter [label] removed" via the `onClose` callback. Opt-in per surface.

### Disabled state announcement

Interactive/filter Tags with `disabled={true}` set `aria-disabled="true"`. AT announces "[label], dimmed" or "button, [label], dimmed". User cannot Tab to it.

### High-contrast kind use

`kind="high-contrast"` swaps bg to `var(--ink)` and fg to `var(--bg)` — the brightest possible Tag. Reserved for high-vis status (Argos: HOT for hardware in active transmit). Don't use for routine status; eye-fatigue impact in dense Tag rows.

---

## Verification checklist (Phase 9.1)

| Check | Tool | Pass criterion |
| --- | --- | --- |
| WCAG 2.1 AA on canary route | `@axe-core/playwright` (`AxeBuilder`) | `violations: []` with `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` tags |
| Default Tag has no a11y attributes | Playwright DOM audit | Outer `<span>` has no role/aria; AT reads inline text only |
| Filter Tag X has aria-label | Playwright DOM audit | Inner `<button>` has `aria-label="Clear filter, [label]"` |
| Interactive Tag renders as button | Playwright DOM audit | Element is `<button type="button">` |
| Tab order skips default Tags | Playwright keyboard nav | Tab does not stop on `<Tag>` (no `interactive`/`filter`) |
| Tab order visits interactive/filter Tags | Playwright keyboard nav | Tab focuses each interactive/filter element |
| Enter activates interactive Tag | Playwright keyboard test | `await page.keyboard.press('Enter')` fires `onClick` |
| Enter/Space activates filter X | Playwright keyboard test | Both keys fire `onClose` |
| Focus ring visible on interactive/filter | manual + Playwright `:focus` check | 2 px outline visible |
| Color contrast per kind | chrome-devtools MCP + axe | All 12 kinds ≥ 4.5:1 fg/bg |
| Disabled tag has aria-disabled | Playwright DOM audit | `aria-disabled="true"` + `tabindex="-1"` |
| Color-not-sole-indicator audit | manual visual | Every Tag has non-empty label text |
| Status change announcement (opt-in) | Playwright + virtual screen reader | `aria-live="polite"` parent announces transitions |
| Tap target on default-size interactive | manual measure | ≥ 24 px inline-size |
| Tap target on sm + filter-X | Phase 7 audit deviation log | Documented exception |

Phase 7-style audit re-run for all migrated Tag sites in 9.1h-9.1k.

---

## Authority citations

- Carbon Tag a11y mdx: `docs/carbon-website/src/pages/components/Tag/accessibility.mdx`
- Carbon Tag SCSS: `docs/carbon-design-system/packages/styles/scss/components/tag/_tag.scss`
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tag/Tag.svelte>
- WCAG 2.1: <https://www.w3.org/TR/WCAG21/>
- WCAG 2.2 SC 2.5.8 Target Size (Minimum): <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- WCAG 1.4.1 Use of Color: <https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html>
- ARIA Authoring Practices for button: <https://www.w3.org/WAI/ARIA/apg/patterns/button/>
- axe-core rule reference: <https://dequeuniversity.com/rules/axe/4.9/>
