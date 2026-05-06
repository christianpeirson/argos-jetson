# DataTable — Accessibility

**Status:** Phase 9.1 — implementation prep
**Last updated:** 2026-05-04
**Carbon mirror:** `docs/carbon-website/src/pages/components/DataTable/accessibility.mdx`
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/DataTable/DataTable.svelte>

> **Note:** This spec supersedes the prior Phase 1 DrawerTable doc at this path.

---

## What Carbon provides for free

Per Carbon DataTable accessibility patterns (DataTable.svelte source confirms):

### Semantic structure

- Renders real `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th scope="col">` / `<td>`. Native table semantics are preserved — assistive tech announces "table, N columns, M rows" and per-cell row/column position.
- Sortable headers use `<button>` inside `<th>` (not `<th onclick>`) so the button is in the tab order and triggers on Enter/Space.
- The selection column uses real `<input type="checkbox">` (radio for single-select); native semantics preserved per the Checkbox chassis spec.
- The expansion column uses `<button aria-expanded>` toggling `aria-controls`; expanded content is rendered in a `<tr><td colspan>` row immediately after the parent.

### ARIA wiring (verified in Carbon source)

- **`aria-sort`** is set on the active sort `<th>`: `ascending` | `descending` | `none`. AT announces "sort ascending" or similar on focus.
- **`aria-rowcount`** is NOT set by Carbon's default `<DataTable>` — only set when virtualization is in use (no Argos surface). Native `<table>` row count announced via DOM walk.
- **`aria-label`** on the `<table>` is exposed via the `title` prop or the chassis `labelText` prop. AT announces "table, [labelText]".
- **`aria-describedby`** on the `<table>` points to the `description` block (if present).
- **`aria-expanded`** + **`aria-controls`** on the row-expansion `<button>` link the chevron to the expanded `<tr>` `id`.
- **`aria-checked`** is NOT set on selection checkboxes — native `<input type="checkbox">` state is authoritative; AT announces "checkbox, [row label], checked|not checked|mixed".
- **`aria-selected`** is set on the `<tr>` when `selectable=true` and that row is the active radio selection.
- **`role="alert"`** on the `invalidText` / `warnText` region (Argos chassis adds; Carbon does not).

### Keyboard interaction

- **Tab / Shift+Tab** — cycles through interactive elements: toolbar search → toolbar buttons → sort buttons → selection checkboxes → row-expand buttons → cell-internal interactives. Carbon does NOT trap focus inside the table; table cells themselves are not focusable unless they contain an interactive element.
- **Enter / Space on sort header** — toggles `ascending → descending → none`.
- **Enter / Space on expansion button** — toggles `aria-expanded` and visibility of the expansion row.
- **Space on selection checkbox** — toggles `checked`.
- **Arrow keys** — NOT implemented by Carbon DataTable (it is not an ARIA grid; it is a tabular layout). For grid-style 2D arrow navigation, use a different component (none in Argos).
- **Focus visible** — Carbon's `focus-outline('outline')` mixin renders 2 px outline outside each `<button>` and `<input>`. Lunaris maps `$focus` → `var(--accent)`.

### Color contrast (Carbon's audit floor)

Carbon's stock theme passes WCAG 2.1 AA. Lunaris token overrides MUST preserve those ratios.

| Pair                       | Min contrast (AA) | Lunaris target                            | Status     |
| -------------------------- | ----------------- | ----------------------------------------- | ---------- |
| Header text on header bg   | 4.5:1             | `var(--ink)` on `var(--bg-2)`             | ≈ 14.0:1 ✓ |
| Cell text on row bg        | 4.5:1             | `var(--ink-2)` on `var(--card)`           | ≈ 12.6:1 ✓ |
| Cell text on hover row     | 4.5:1             | `var(--ink-2)` on `var(--card-hover)`     | ≈ 11.9:1 ✓ |
| Cell text on selected row  | 4.5:1             | `var(--ink)` on `var(--card-selected)`    | ≈ 13.4:1 ✓ |
| Row separator              | 3:1 (graphical)   | `var(--border)` on `var(--card)`          | ≈ 3.4:1 ✓  |
| Sort arrow (active)        | 3:1 (graphical)   | `var(--accent)` on `var(--bg-2)`          | ≈ 7.4:1 ✓  |
| Focus outline              | 3:1 (graphical)   | `var(--accent)` on any background         | ≈ 7.4:1 ✓  |
| Selected-row left accent   | 3:1 (graphical)   | `var(--accent)` on `var(--card-selected)` | ≈ 4.1:1 ✓  |
| Error text (`invalidText`) | 4.5:1             | `var(--mk2-red)` on `var(--bg)`           | ≈ 5.2:1 ✓  |

**No amber flags.** All Phase 9.1 surfaces pass.

---

## Argos-specific a11y considerations

### Tap target compliance (WCAG 2.2 SC 2.5.8)

The default Argos `size="short"` (32 px row height) provides a 32 × N px tap target for row-click handlers, well above the 24 px floor. The `size="compact"` (24 px) row hits the floor exactly — DO NOT reduce padding via custom CSS.

| Surface          | Density | Row height | Sort button | Selection checkbox  | WCAG 2.5.8 (24 px) |
| ---------------- | ------- | ---------- | ----------- | ------------------- | ------------------ |
| AGENTS sessions  | short   | 32 px      | 32 px tall  | full row click area | ✓ pass             |
| OVERVIEW SOURCES | compact | 24 px      | 24 px tall  | n/a (no selection)  | ✓ at floor         |
| KISMET APs       | short   | 32 px      | 32 px tall  | full cell           | ✓ pass             |
| GSM IMSI         | short   | 32 px      | 32 px tall  | n/a                 | ✓ pass             |

WCAG 2.1 SC 2.5.5 (44 × 44 px AAA) is **not** satisfied at any density. Documented as an Argos-wide deviation from AAA in Phase 7 audit.

### Header text + UPPERCASE pattern

Lunaris column headers are rendered UPPERCASE per the Geist Mono tactical convention. AT announces letter-by-letter in some screen readers when CSS `text-transform: uppercase` is applied to short strings. Mitigation: use `aria-label` on the `<th>` with the lowercase / Title-Case spoken form when the visual UPPERCASE creates ambiguity. No mitigation needed for current surfaces.

### Sort announcement

When the user activates a sort button, Carbon updates `aria-sort` immediately. Most screen readers re-announce the column header with the new sort state on next focus event. Argos chassis adds an optional `aria-live="polite"` region announcing "sorted by [column], [direction]" via the `onSort` callback for clearer feedback — opt-in via `announceSort={true}` prop.

### Batch selection announcement

Parent header checkbox switches between `unchecked → indeterminate → checked` based on `selectedRowIds.length`. Native `<input type="checkbox">` with `input.indeterminate = true` causes AT to announce "mixed". Selecting/deselecting individual rows fires native `change` events; AT announces per-checkbox state without additional plumbing.

For batch-action visibility, the `<ToolbarBatchActions>` overlay is announced via `role="region" aria-label="Batch actions"` (Carbon default). When transitioning from 0 → 1 selected, focus is NOT auto-moved — the user retains row-checkbox focus.

### Expansion content focus management

When a row is expanded, Carbon does NOT auto-move focus into the expanded content. The user must Tab into it. If the expanded `<tr>` contains a primary action (e.g., "Open agent detail"), include `tabindex="0"` on the wrapping section and document the expected Tab sequence in the consuming view.

### Empty state announcement

When `rows.length === 0`, Carbon does not auto-announce. Argos chassis renders the `emptyState` snippet (or default "No data") inside a `role="status" aria-live="polite"` region so AT announces the change when filters reduce to zero rows.

### Loading state announcement

`<DataTableSkeleton>` is wrapped in `role="status" aria-busy="true" aria-label="Loading data"` by Carbon. AT announces "Loading data, busy" on render. When `loading` flips to `false`, AT does not re-announce; the table's appearance is the visual cue.

---

## Verification checklist (Phase 9.1)

| Check                                          | Tool                                  | Pass criterion                                                                            |
| ---------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| WCAG 2.1 AA on canary route                    | `@axe-core/playwright` (`AxeBuilder`) | `violations: []` with `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` tags            |
| Table semantics                                | Playwright role audit                 | `<table>`, `<thead>`, `<tbody>` roles present; row/col counts match data                  |
| Sort keyboard activation                       | Playwright keyboard test              | Tab to sort `<button>`, Space toggles `aria-sort`                                         |
| Selection keyboard activation                  | Playwright keyboard test              | Tab to checkbox, Space toggles `checked`, parent goes to `mixed`                          |
| Expansion keyboard activation                  | Playwright keyboard test              | Tab to chevron `<button>`, Space toggles `aria-expanded` + visible content                |
| Tab order                                      | Playwright keyboard nav               | Toolbar → sort headers → row checkboxes → expansion chevrons → cell-internal in DOM order |
| Focus ring visible                             | manual + Playwright `:focus` check    | 2 px outline visible on every interactive element                                         |
| Color contrast (header, cell, hover, selected) | chrome-devtools MCP + axe             | All ≥ 4.5:1 for text, ≥ 3:1 for graphical                                                 |
| Empty state announcement                       | Playwright + virtual screen reader    | `role="status"` region announces empty-state message                                      |
| Loading state announcement                     | Playwright + virtual screen reader    | `aria-busy="true"` on skeleton                                                            |
| Mixed selection announcement                   | manual NVDA / VoiceOver test          | "mixed" announced when 0 < selected < total                                               |

Phase 7-style audit re-run for the 4 migrated tables in 9.1a-9.1d.

---

## Authority citations

- Carbon DataTable a11y mdx: `docs/carbon-website/src/pages/components/DataTable/accessibility.mdx`
- Carbon DataTable SCSS: `docs/carbon-design-system/packages/styles/scss/components/data-table/_data-table.scss`
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/DataTable/DataTable.svelte>
- WCAG 2.1: <https://www.w3.org/TR/WCAG21/>
- WCAG 2.2 SC 2.5.8 Target Size (Minimum): <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- ARIA Authoring Practices for tables: <https://www.w3.org/WAI/ARIA/apg/patterns/table/>
- ARIA Authoring Practices for grid (not used here): <https://www.w3.org/WAI/ARIA/apg/patterns/grid/>
- axe-core rule reference: <https://dequeuniversity.com/rules/axe/4.9/>
