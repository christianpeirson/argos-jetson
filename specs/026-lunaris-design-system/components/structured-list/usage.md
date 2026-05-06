# StructuredList — Usage

**Status:** Phase 9.1 prep (drafted ahead of chassis implementation)
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/data/StructuredList.svelte`
**Carbon component:** `<StructuredList>` + `<StructuredListHead>` + `<StructuredListBody>` + `<StructuredListRow>` + `<StructuredListCell>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/StructuredList/StructuredList.svelte>

---

## When to use

Read-mostly key/value detail panes where rows have a stable schema, modest count (~5-30 rows), and don't need column-sorting / pagination / batch-selection. Examples in Argos: Event detail dialog (timestamp / source / target / freq / RSSI / dwell), IMSI inspector (IMSI / IMEI / TMSI / TAC / cell / timestamp), AP detail (BSSID / SSID / channel / vendor / first-seen / last-seen / packets), session detail (session-id / agent / start / stop / duration / bytes / status).

## When NOT to use

- **Tabular data with sortable columns** → use `<DataTable>` (deferred phase). DataTable owns sort, filter, pagination, batch-select.
- **Free-flowing prose / form inputs** → use form patterns directly. StructuredList rows are read-display, not editable.
- **>30 rows** → switch to `<DataTable>` for built-in pagination.
- **Single key/value badge** → use `<Tag>` or inline label/value pair, not a full StructuredList for one row.
- **Live-streaming logs** → use a virtualised log viewer; StructuredList does not virtualise.

## Carbon vs bespoke distinction

Per Carbon `structured-list/usage.mdx`:

- **Default StructuredList** — read-only key/value rows.
- **Selectable StructuredList** — `selection={true}` + `<StructuredListInput>` per row turns rows into radio-group selection. Used in Carbon for "pick a plan" / "pick a region" patterns. Argos uses this for IMSI inspector "pin row to dock" pattern.
- **Condensed** — `condensed={true}` shrinks vertical padding; default is comfortable-density. Lunaris adopts condensed for tactical-density panels and default for top-of-view detail dialogs.
- **Flush** — `flush={true}` removes the outer container border / padding so the list sits flush against a panel edge. Useful when the StructuredList is already inside a card.

## Argos surface inventory (provisional)

Bespoke key/value detail-pane sites Phase 9.1 retires by migrating to `<StructuredList>`:

| Surface               | File                                                            | Current pattern                                           |
| --------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| Event detail dialog   | `src/lib/components/dashboard/dialogs/EventDetailDialog.svelte` | bespoke `<dl>` + `<dt>` / `<dd>` with hand-rolled spacing |
| IMSI inspector pane   | `src/lib/components/dashboard/panels/ImsiInspector.svelte`      | bespoke `.kv-row` flex grid                               |
| AP detail pane        | `src/lib/components/dashboard/panels/ApDetail.svelte`           | bespoke `<dl>` + dot-leaders                              |
| Session detail pane   | `src/lib/components/dashboard/panels/SessionDetail.svelte`      | bespoke `.detail-row` flex grid                           |
| Mission summary modal | `src/lib/components/dashboard/views/ReportsView.svelte`         | bespoke `<table>` (mis-pattern — not tabular data)        |

Total bespoke key/value sites: ~6-9. Migration order: Event detail (highest visibility) → IMSI inspector → AP detail → session detail → mission summary.

## Anatomy (per Carbon source)

From `_structured-list.scss`:

1. **Outer `<div class="bx--structured-list">`** with optional `--condensed` / `--flush` / `--selection` modifiers.
2. **`<StructuredListHead>`** — non-scrolling header section; renders `<div class="bx--structured-list-thead">`. Contains `<StructuredListRow head={true}>` with `<StructuredListCell head={true}>` cells.
3. **`<StructuredListBody>`** — scrolling-friendly body section; `<div class="bx--structured-list-tbody">`.
4. **`<StructuredListRow>`** — `<div class="bx--structured-list-row">`. Border-block-end 1 px between rows. `head={true}` adds head class; `label={true}` makes the row clickable (selection mode).
5. **`<StructuredListCell>`** — `<div class="bx--structured-list-td">` (or `--th` if `head={true}`). 16-px inline padding, 16-px block padding (default density), 8 px (condensed).
6. **`<StructuredListInput>`** (selection mode only) — visually-hidden `<input type="radio">` paired with a checkmark icon shown when `:checked`.

## States to handle

- **Default row** — neutral bg, 1 px bottom border between rows.
- **Hover (selectable mode only)** — slight bg lift (`var(--bg-1)`).
- **Selected (selectable mode)** — `var(--bg-1)` bg + checkmark icon in dedicated trailing column.
- **Focus (selectable mode)** — 2-px `var(--accent)` outline outside the row.
- **Disabled (selectable mode)** — muted text, no hover, no click.
- **Empty state** — Carbon does not ship an empty-state row; render an empty-state component above/below the StructuredList.

## Spacing rhythm

Carbon's StructuredList uses 16-px block-padding cells (default) / 8-px (condensed). Lunaris adopts unchanged — both densities map cleanly to existing detail-pane layouts.

## Common pitfalls

1. **Using StructuredList for tabular data with sortable columns.** Symptom: users ask for sort arrows. Migrate to `<DataTable>`.
2. **Mixing `<StructuredListCell head={true}>` outside `<StructuredListHead>`.** Carbon will render but AT semantic structure breaks. Always pair head cells with the head row inside the head section.
3. **Forgetting `noWrap={true}` on cells with long content.** Carbon's default cell wraps text; long values (BSSIDs, full IMSI strings) look better truncated with `noWrap`. Wrapper exposes `noWrap` per-cell pass-through.
4. **Selection mode without unique `value` per row.** `<StructuredListInput>` requires unique `value` per row for the radio-group to work. Wrapper does NOT auto-generate values; consumers must supply.
5. **Nesting interactive controls inside cells.** Carbon's selection-mode row IS itself the click target; nesting buttons inside causes click-bubble conflict. Use a non-selection StructuredList if rows need their own action buttons.
6. **Using `<table>` semantics expectations.** StructuredList renders `<div>`-based; `tabKey` / `aria-rowindex` / row-number announcement does NOT apply. AT announces as "list, [N] items".
7. **Forgetting condensed for tactical density.** Default density looks airy in tactical panels. Use `condensed` for SDR / Bluetooth / kismet detail panes; default for prose-heavy mission summary modals.

## Out of scope for Phase 9.1

- **`<StructuredListSkeleton>`** — Argos surfaces are typically loaded synchronously from already-fetched detail data; reserved.
- **Inline editable cells** — Carbon does not support; would require a different primitive (DataTable + inline edit).
- **Multi-select** — Carbon's StructuredList selection mode is single-select (radio). Multi-select would need DataTable.

## Authority citations

- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/StructuredList/StructuredList.svelte>
- Carbon Svelte component: <https://svelte.carbondesignsystem.com/?path=/docs/components-structuredlist--default>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/structured-list/_structured-list.scss`
- Carbon usage mdx: `docs/carbon-website/src/pages/components/StructuredList/usage.mdx`
- Argos bespoke surfaces: see "Surface inventory" table above (~6-9 call sites)
