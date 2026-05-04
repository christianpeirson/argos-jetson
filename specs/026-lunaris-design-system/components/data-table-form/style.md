# DataTable — Style

**Status:** Phase 9.1 — implementation prep
**Last updated:** 2026-05-04
**Authority precedence:** Carbon source SCSS > Carbon site mdx > Lunaris CSS overlay
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/DataTable/DataTable.svelte>

> **Note:** This spec supersedes the prior Phase 1 DrawerTable doc at this path.

---

## Canonical anatomy citations

From `docs/carbon-design-system/packages/styles/scss/components/data-table/_data-table.scss`:

```scss
.#{$prefix}--data-table {
	border-collapse: collapse;
	border-spacing: 0;
	inline-size: 100%;
	background-color: $layer;
}

.#{$prefix}--data-table th {
	@include type-style('heading-compact-01');
	background-color: $layer-accent;
	color: $text-primary;
	text-align: start;
	border-block: 1px solid $border-subtle;
}

.#{$prefix}--data-table td {
	@include type-style('body-compact-01');
	border-block-end: 1px solid $border-subtle;
	color: $text-secondary;
}

.#{$prefix}--data-table tr:hover td {
	background-color: $layer-hover;
}

.#{$prefix}--data-table.#{$prefix}--data-table--selected tr td {
	background-color: $layer-selected;
}
```

Key shape:

- **`<table>` is `border-collapse: collapse`** — single 1px row separator (`$border-subtle`); no double borders.
- **`<th>` uses `heading-compact-01`** — bold 12px / 16px line-height, designed for single-line column labels.
- **`<td>` uses `body-compact-01`** — regular 14px / 18px in Carbon source; Argos remaps to Fira Code 12px for tabular density.
- **Header background is `$layer-accent`** (one shade above body); body is `$layer`.
- **Row hover swaps to `$layer-hover`**; selected rows pin to `$layer-selected`.
- **No vertical column borders** — visual separation is via cell padding only.
- **Sticky header** uses `position: sticky; inset-block-start: 0; z-index: 1`.

---

## Lunaris token map

| Carbon token | Lunaris value | Notes |
| --- | --- | --- |
| `$layer` (table body bg) | `var(--card)` (#1A1A1A) | Single-shade card surface |
| `$layer-accent` (header bg) | `var(--bg-2)` (oklch +1) | One shade brighter than body for header contrast |
| `$layer-hover` (row hover) | `var(--card-hover)` | ~5% lighten of `--card` |
| `$layer-selected` (selected row) | `var(--card-selected)` | Accent-tinted card; uses `var(--accent)` at 12% alpha |
| `$border-subtle` (row separator) | `var(--border)` (#2E2E2E) | 1 px |
| `$border-strong` (toolbar bottom) | `var(--ink-5)` | Toolbar/table boundary |
| `$text-primary` (header text) | `var(--ink)` | Bright headers; UPPERCASE per Lunaris column-label convention |
| `$text-secondary` (cell text) | `var(--ink-2)` | Slightly muted body text |
| `$icon-primary` (sort arrow) | `var(--ink-2)` → `var(--accent)` on active sort | Accent-color flip when column is the active sort |
| `$focus` (focus ring) | `var(--accent)` | 2 px outline outside `<th>` button or row checkbox |
| `heading-compact-01` | `var(--mk2-fs-2) / 1.4 var(--mk2-f-mono)` UPPERCASE letter-spacing 1.2 | Fira Code, tactical-mono headers |
| `body-compact-01` | `var(--mk2-fs-3) / 1.5 var(--mk2-f-mono)` | Fira Code 12px for IPs / metrics / IDs |

---

## Sizing per density

Carbon ships 4 density tiers via `size` prop. Lunaris remaps row-block-size:

| Carbon `size` | Carbon row height | Lunaris remap | Argos use |
| --- | --- | --- | --- |
| `compact` | 24 px | 24 px | OVERVIEW SOURCES sidebar |
| `short` | 32 px | 32 px | AGENTS, KISMET (default) |
| `medium` | 48 px | 40 px | (none — too tall for tactical) |
| `tall` | 64 px | 56 px | (none) |

`compact` is the WCAG 2.5.8 floor for tap targets — see `accessibility.md`.

Per-cell padding follows Carbon's `$spacing-04` (8px) inline / `$spacing-03` (4px) block at compact, scaling to `$spacing-05` (16px) inline / `$spacing-04` (8px) block at tall.

---

## Toolbar styling

The `<Toolbar>` row sits above the `<table>`, separated by a 1px `var(--border)` divider. Background is `var(--card)` (matches table body, not header). Height is fixed at 48 px regardless of table density.

`<ToolbarSearch>` is full-width on mobile, fixed 256 px on desktop. `<ToolbarBatchActions>` slides over the toolbar from the start edge when ≥1 row is selected; background switches to `var(--accent)` with `var(--bg)` text.

---

## Sort indicator

Carbon renders an arrow icon (`<ChevronUp>`) inside the `<th>` `<button>`. Three states:

| State | Icon | `aria-sort` | Lunaris color |
| --- | --- | --- | --- |
| Unsorted | hidden (visible on hover only) | `none` | n/a |
| Ascending | `↑` | `ascending` | `var(--accent)` |
| Descending | `↓` (rotated 180°) | `descending` | `var(--accent)` |

Sort affordance has its own focus ring (2 px outline outside the `<button>` bounds, NOT outside the `<th>`).

---

## Selection column

When `batchSelection={true}`:

- Leftmost `<th>` is 32 px wide, contains a parent `<Checkbox>` with `indeterminate` driven by `selectedRowIds.length > 0 && selectedRowIds.length < rows.length`.
- Each `<td>` in column 0 contains a per-row `<Checkbox bind:checked>`. Checkbox styling inherits from the chassis Checkbox spec.
- Selected rows render with `var(--card-selected)` background + 2 px `var(--accent)` left border.

---

## What Argos does NOT inherit from Carbon

- **Light theme** — Argos is dark-mode only; no `--g10` overrides.
- **Inline edit cell styling** — no surface uses inline edit; styles deferred.
- **Pagination footer styling** — pagination is a separate `<Pagination>` chassis (deferred).
- **Caption styling** — Carbon's `<caption>` element is not used; visible table title lives in the panel header.

---

## State matrix

| State | Row bg | Row text | Border-block-end | Notes |
| --- | --- | --- | --- | --- |
| Default | `var(--card)` | `var(--ink-2)` | 1 px `var(--border)` | |
| Hover | `var(--card-hover)` | `var(--ink-2)` | 1 px `var(--border)` | Cursor changes only if `onRowClick` set |
| Selected | `var(--card-selected)` | `var(--ink)` | 1 px `var(--border)` | Plus 2 px `var(--accent)` inset-inline-start |
| Active sort header | `var(--bg-2)` | `var(--accent)` | 1 px `var(--border)` | Arrow visible |
| Disabled (when `loading=true`) | dimmed via `opacity: 0.5` | unchanged | unchanged | `pointer-events: none` |

---

## Authority citations

- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/data-table/_data-table.scss`
- Carbon site mdx: `docs/carbon-website/src/pages/components/DataTable/{usage,style,code,accessibility}.mdx`
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/DataTable/DataTable.svelte>
- Lunaris CSS custom properties: `src/app.css` (`:root` block)
- Theme overlay: `src/lib/styles/lunaris-carbon-theme.scss`
