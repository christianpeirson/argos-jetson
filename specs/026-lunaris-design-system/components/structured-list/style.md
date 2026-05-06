# StructuredList — Style

**Status:** Phase 9.1 PR — implementation in flight
**Last updated:** 2026-05-04
**Authority precedence:** Carbon source SCSS > Carbon site mdx > Lunaris CSS overlay
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/StructuredList/StructuredList.svelte>

---

## Canonical anatomy citations

From `docs/carbon-design-system/packages/styles/scss/components/structured-list/_structured-list.scss`:

```scss
.#{$prefix}--structured-list {
	display: table;
	overflow-x: auto;
	background-color: transparent;
	border-collapse: collapse;
	border-spacing: 0;
	inline-size: 100%;
}

.#{$prefix}--structured-list-row {
	display: table-row;
	border-block-end: 1px solid $border-subtle;
	transition: background-color $duration-fast-02 motion(standard, productive);
}

.#{$prefix}--structured-list-td {
	display: table-cell;
	padding-block: $spacing-05; // 16px (default), $spacing-03 8px when condensed
	padding-inline: $spacing-05;
	color: $text-primary;
	vertical-align: top;
}

.#{$prefix}--structured-list--selection
	.#{$prefix}--structured-list-row:hover:not(.#{$prefix}--structured-list-row--header-row) {
	background-color: $layer-hover;
	cursor: pointer;
}

.#{$prefix}--structured-list-row--selected {
	background-color: $layer-selected;
}
```

Key shape:

- **Table-display layout** — `display: table` / `table-row` / `table-cell` for layout, but DOM is `<div>` for screen-reader semantics override.
- **Default cell padding** — 16 px both block + inline. `condensed` halves block to 8 px (inline stays 16 px).
- **Row separator** — 1 px `$border-subtle` bottom border between rows. Last row keeps the border (Carbon does not zero it; Lunaris does not override).
- **Selection mode** adds `:hover` background lift on body rows only (not header). Selected row uses `$layer-selected`.
- **`flush` modifier** removes outer container padding — the list sits flush to a parent's inner edge.

---

## Lunaris token map

| Carbon token                  | Lunaris value                                    | Notes                                                          |
| ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| `$text-primary` (cell text)   | `var(--ink)` for values; `var(--ink-2)` for keys | Keys slightly muted to emphasise values                        |
| `$text-secondary` (key cells) | `var(--ink-2)`                                   | Used for the leading `<StructuredListCell>` (the "key" column) |
| `$border-subtle` (row sep)    | `var(--border)` (#2E2E2E) 1 px                   | Lower-contrast than `--border-strong`; rows are quiet          |
| `$layer-hover` (row hover)    | `var(--bg-1)` (#161616)                          | Subtle lift on hover for selectable rows                       |
| `$layer-selected`             | `var(--bg-2)` (#1A1A1A)                          | Selected row in selection mode                                 |
| `$focus`                      | `var(--accent)`                                  | 2-px outline on focused selectable row                         |
| `$icon-primary` (sel check)   | `var(--accent)`                                  | Checkmark icon in selected row's trailing cell                 |
| `body-compact-01` keys        | `var(--mk2-fs-3) / 1.4 var(--mk2-f-mono)`        | Geist Mono UPPERCASE for tactical surfaces (key labels)        |
| `body-compact-01` values      | `var(--mk2-fs-3) / 1.4 var(--mk2-f-mono)`        | Geist Mono mixed case for values (BSSIDs, IMSIs, freq strings) |

---

## Sizing per surface

Carbon ships two density modes via `condensed` boolean prop. Lunaris adopts both.

| Argos surface         | Density | Carbon `condensed` | Cell block padding | Key column width | Value column width |
| --------------------- | ------- | ------------------ | ------------------ | ---------------- | ------------------ |
| Event detail dialog   | normal  | `false`            | 16 px              | 30 % (~120 px)   | 70 %               |
| IMSI inspector pane   | compact | `true`             | 8 px               | 35 % (~96 px)    | 65 %               |
| AP detail pane        | compact | `true`             | 8 px               | 30 % (~88 px)    | 70 %               |
| Session detail pane   | compact | `true`             | 8 px               | 30 % (~88 px)    | 70 %               |
| Mission summary modal | normal  | `false`            | 16 px              | 25 % (~140 px)   | 75 %               |

Touch-target compliance for selection-mode rows is achieved by full-row click areas — see `accessibility.md` for WCAG 2.5.8 reasoning.

---

## What Argos does NOT inherit from Carbon

- **Light variant** (`bx--structured-list--light`) — Argos is dark-mode only.
- **Sticky header** — Carbon does not ship sticky header; not requested.
- **Per-row actions column** (action menu trailing each row) — would conflict with selection mode; defer to `<DataTable>` if a surface needs row actions.

---

## State matrix

Per Carbon `structured-list/style.mdx` confirmed against source SCSS:

| State                   | Border (Lunaris)                        | Fill (Lunaris) | Cell text                                      |
| ----------------------- | --------------------------------------- | -------------- | ---------------------------------------------- |
| Default row             | `var(--border)` 1 px bottom             | transparent    | key `var(--ink-2)`, value `var(--ink)`         |
| Hover (selectable mode) | unchanged                               | `var(--bg-1)`  | unchanged                                      |
| Selected (sel mode)     | unchanged                               | `var(--bg-2)`  | unchanged + `var(--accent)` checkmark trailing |
| Focus (sel mode)        | + 2-px ring `var(--accent)` outside row | unchanged      | unchanged                                      |
| Disabled (sel mode row) | unchanged                               | transparent    | `var(--ink-5)` cell text                       |
| Header row              | `var(--border-strong)` 1 px bottom      | transparent    | `var(--ink-2)` UPPER mono                      |

---

## Argos KV (key/value) two-column convention

Most Argos surfaces use a two-cell row: leading "key" cell + trailing "value" cell. The key cell is muted (`var(--ink-2)`) and the value cell is full ink (`var(--ink)`). This matches the existing bespoke `<dl>` pattern.

For multi-column StructuredLists (e.g. mission summary modal where rows have name + value + status columns), the pattern extends naturally — leading cell muted, trailing cells full ink, status cell uses status color tokens (`--ok` / `--warn` / `--err`).

The two-column pattern is enforced by convention in spec `code.md`, not by the wrapper API — the wrapper accepts arbitrary cell counts.

---

## Long-value truncation

Tactical surfaces frequently render long values: full IMSI (15 digits), full BSSID (17 chars with colons), session UUIDs (36 chars). Carbon does not truncate by default — long values wrap.

For surfaces where wrapping is undesirable (BluetoothPanel detail, IMSI inspector), pass `noWrap={true}` to the value cell. The wrapper exposes `noWrap` as a per-`<StructuredListCell>` pass-through.

When values are still too long for the available column width even with `noWrap`, render with `text-overflow: ellipsis` + `overflow: hidden` via a class override + put the full value in a `title=` attribute for hover-reveal. Pattern docced in `code.md`.

---

## `flush` modifier in card panels

When a StructuredList is rendered directly inside a Lunaris card/panel (which already has its own padding), pass `flush={true}` to the outer `<StructuredList>`. The card's padding becomes the list's padding; no double-padding.

For modal-rendered StructuredLists (e.g. EventDetailDialog), use the default (non-flush) layout — the modal owns its own outer padding and the StructuredList's inner padding is the row-internal padding only.

---

## Authority citations

- Carbon Svelte source (v0.107.0): <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/StructuredList/StructuredList.svelte>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/structured-list/_structured-list.scss`
- Carbon site mdx: `docs/carbon-website/src/pages/components/StructuredList/{usage,style,code,accessibility}.mdx`
- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-structuredlist--default>
- Lunaris CSS custom properties: `src/app.css` (`:root` block)
- Theme overlay: `src/lib/styles/lunaris-carbon-theme.scss`
