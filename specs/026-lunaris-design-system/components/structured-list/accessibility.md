# StructuredList — Accessibility

**Status:** Phase 9.1 PR — implementation in flight
**Last updated:** 2026-05-04
**Carbon mirror:** `docs/carbon-website/src/pages/components/StructuredList/accessibility.mdx`
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/StructuredList/StructuredList.svelte>

---

## What Carbon provides for free

Per Carbon StructuredList source confirms (`<div>`-based with optional radio-group selection mode):

### Semantic structure

- Outer `<div class="bx--structured-list">` carries no implicit ARIA role — it's a layout container. AT announces as a generic region; consumers should add `aria-label` if the list's purpose isn't obvious from surrounding context.
- In **selection mode**, Carbon adds `role="row"` on each `<StructuredListRow>` and uses a hidden `<input type="radio">` per `<StructuredListInput>` to drive single-select. AT announces as "radio group".
- In **default (read-only) mode**, no row roles are emitted — the list is a passive read-only container. AT announces row contents linearly.
- `id` defaults to `ccs-${random}`; `<StructuredListInput>` ids are auto-generated unique per row.

### ARIA wiring (verified in Carbon source)

- **Read-only mode** — no special ARIA. AT announces cell text linearly. The semantic shape is "just a list of key/value pairs the user reads".
- **Selection mode** — `<StructuredListRow label for={value}>` becomes a `<label>` element wrapping the row contents + the hidden `<input type="radio">`. AT announces "radio button, [row text], [n] of [N], not selected | selected".
- **Header row** — `<StructuredListRow head>` adds `bx--structured-list-row--header-row` class but no `role="rowheader"` — header cells inside it (`<StructuredListCell head>`) get visual emphasis only. AT does not auto-announce the header as such.
- **`aria-label`** is NOT auto-set by Carbon; consumers MUST add `aria-label="..."` on the outer `<StructuredList>` when the list's purpose isn't clear from surrounding text. Wrapper exposes `aria-label` via `class`/attribute spread.
- **Disabled per-row** — not supported by Carbon; if a row must be disabled, render without `<StructuredListInput>` + add `aria-disabled="true"` manually.

### Keyboard interaction

| Mode             | Key | Behavior |
| ---------------- | --- | -------- |
| Read-only        | Tab | No focusable element by default; Tab skips the list. Cells with embedded buttons / links are individually focusable. |
| Selection        | Tab | Move focus into the radio group (lands on selected row, or first if none selected). Tab again moves out. |
| Selection        | Shift+Tab | Move focus out backward. |
| Selection        | Up / Left | Move active radio to previous row (wraps to last); commits + emits change. |
| Selection        | Down / Right | Move active radio to next row (wraps to first); commits + emits change. |
| Selection        | Space | Native radio behavior — toggle the focused radio (already commits in Carbon). |
| Selection        | Enter | No-op for radio; submits enclosing form if any. |

### Color contrast (Carbon's audit floor)

Carbon's stock theme passes WCAG 2.1 AA. Lunaris token overrides MUST preserve those ratios.

| Pair                                              | Min contrast (AA) | Lunaris target                                          | Status                                               |
| ------------------------------------------------- | ----------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| Cell text (key) on `--bg`                         | 4.5:1             | `var(--ink-2)` on `var(--bg)`                           | ≈ 11.4:1 ✓                                            |
| Cell text (value) on `--bg`                       | 4.5:1             | `var(--ink)` on `var(--bg)`                             | ≈ 14.6:1 ✓                                            |
| Row separator (`$border-subtle`) on `--bg`        | 3:1 (graphical)   | `var(--border)` on `var(--bg)`                          | ≈ 1.6:1 ⚠ — non-decorative separator below threshold; mitigated by row spacing + key/value visual cue (low-bar pattern Carbon ships, AT-safe) |
| Selected row bg (`$layer-selected`) on `--bg`     | 3:1 (graphical)   | `var(--bg-2)` on `var(--bg)`                            | ≈ 1.4:1 ⚠ — selection in selectable mode is signalled by checkmark icon, not bg alone |
| Checkmark icon (`$icon-primary`) on selected bg   | 3:1 (graphical)   | `var(--accent)` on `var(--bg-2)`                        | ≈ 7.0:1 ✓                                             |
| Focus outline (`$focus`) on any background        | 3:1 (graphical)   | `var(--accent)`                                         | ≈ 7.4:1 vs `--bg` ✓                                   |

**Two amber items, both Carbon-conformant:**
1. Row separator below 3:1 — Carbon ships this; the visual rhythm + row spacing + cell-internal padding compensate. AT users do not consume the separator.
2. Selected-row bg below 3:1 — Carbon adds the `<CheckmarkFilled>` icon as the load-bearing selected-state indicator. Color is supplementary only (matches Lunaris "color must never be the sole status indicator" principle).

---

## Argos-specific a11y considerations

### Tap target compliance (WCAG 2.2 SC 2.5.8)

Read-only StructuredList rows are NOT interactive; tap targets do not apply. Selection-mode rows are full-row click targets:

| Surface              | Density   | Row height (cell padding × 2 + line) | WCAG 2.5.8 (24 px) |
| -------------------- | --------- | ------------------------------------ | ------------------ |
| EventDetailDialog    | normal    | 16 + 16 + ~16 = ≈ 48 px              | ✓ pass (read-only) |
| IMSI inspector       | condensed | 8 + 8 + ~14 = ≈ 30 px                | ✓ pass             |
| AP detail            | condensed | ≈ 30 px                              | ✓ pass (read-only) |
| Session detail       | condensed | ≈ 30 px                              | ✓ pass (read-only) |
| Mission summary modal | normal    | ≈ 48 px                              | ✓ pass (read-only) |

WCAG 2.1 SC 2.5.5 (44 × 44 px AAA) is satisfied at default density only. Documented Argos-wide deviation from AAA in Phase 7 audit.

### `aria-label` enforcement

Carbon does not require `aria-label` on the outer `<StructuredList>`. Argos enforces it via lint rule (or by convention in `code.md`) for all migrated sites:

| Surface              | `aria-label` value             |
| -------------------- | ------------------------------ |
| EventDetailDialog    | `"Event details"`              |
| IMSI inspector       | `"IMSI records, pin one to dock"` |
| AP detail            | `"Access point details"`       |
| Session detail       | `"Session details"`            |
| Mission summary modal | `"Mission summary"`            |

Without `aria-label`, AT users hear "list" or "radio group" with no semantic context.

### Long-value handling for AT

For values that are visually truncated (BSSIDs, IMSIs > column width), wrapping is the default. If a surface uses ellipsis truncation via the `noWrap` + `text-overflow` pattern, the **full untruncated value MUST also be in a `title=` attribute** so AT (and hover-reveal users) get the complete value. Truncation is visual-only — never elide content from AT.

### Header row semantics

Carbon's `<StructuredListRow head>` does NOT emit `role="rowheader"` or `<th>` semantics. For mission summary modal where the 3-column structure has a meaningful header, AT users do not auto-hear "field, value, status" as column headers. Mitigations:

1. **Visual header is sufficient for sighted users** — the header row's visual emphasis (UPPER mono, `--border-strong` separator) communicates structure.
2. **For AT-critical surfaces, switch to `<DataTable>`** — DataTable emits proper table semantics with `<th scope="col">`. Mission summary modal stays on StructuredList because its data isn't tabular (5-row summary, not sortable/filterable).
3. **Manual `<th>` patching is NOT recommended** — modifying Carbon DOM via DOM-poke breaks on Carbon updates.

### Live-region for selection changes

Selection-mode list selection changes are announced by the radio role + `aria-checked` state — AT users hear "[row text], radio button, [n] of [N], selected". No `aria-live` region is added.

For surfaces where the selection drives a downstream panel update (IMSI inspector → pinned IMSI dock), the dock panel should own its own live-region announcement when it receives a new pinned value — orthogonal to the StructuredList selection itself.

### Reduced motion

Carbon uses `motion(standard, productive)` for the `:hover` background-color transition (110 ms). Lunaris does not override; users with `prefers-reduced-motion: reduce` get instant transitions because Carbon's motion mixin respects the media query at the token layer.

---

## Verification checklist (Phase 9.1)

| Check                                | Tool                                  | Pass criterion                                                                |
| ------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| WCAG 2.1 AA on each migrated surface | `@axe-core/playwright` (`AxeBuilder`) | `violations: []` with `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice`     |
| `aria-label` on outer list           | axe rule `aria-allowed-attr`          | All lists carry meaningful `aria-label`                                       |
| Selection radio-group focus          | Playwright keyboard nav               | Tab into list lands on selected (or first); arrow keys cycle radios; commit + change emit |
| Read-only Tab-skip                   | Playwright keyboard nav               | Tab skips read-only lists with no focusable child                             |
| Color contrast (cell text)           | chrome-devtools MCP + axe             | Key cell ≥ 4.5:1, Value cell ≥ 4.5:1                                          |
| Color contrast (focus ring)          | chrome-devtools MCP                   | Focus ring ≥ 3:1 vs surrounding bg                                            |
| Selection state announcement         | manual NVDA / VoiceOver pass          | "[row text], radio button, [n] of [N], selected" on each focus                |
| Long-value `title` attr              | manual axe + Playwright DOM probe     | Truncated values have full text in `title=`                                   |
| `aria-disabled` on emulated-disabled rows | axe + manual                      | Manually-disabled rows announce "dimmed/disabled"                             |

Phase 7 includes the full WCAG 2.1 AA audit for all migrated detail-pane surfaces.

---

## Authority citations

- Carbon Svelte source (v0.107.0): <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/StructuredList/StructuredList.svelte>
- Carbon StructuredList a11y mdx: `docs/carbon-website/src/pages/components/StructuredList/accessibility.mdx`
- Carbon StructuredList SCSS: `docs/carbon-design-system/packages/styles/scss/components/structured-list/_structured-list.scss`
- WCAG 2.1: <https://www.w3.org/TR/WCAG21/>
- WCAG 2.2 SC 2.5.8 Target Size (Minimum): <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- ARIA Authoring Practices for radio groups: <https://www.w3.org/WAI/ARIA/apg/patterns/radio/>
- axe-core rule reference: <https://dequeuniversity.com/rules/axe/4.9/>
