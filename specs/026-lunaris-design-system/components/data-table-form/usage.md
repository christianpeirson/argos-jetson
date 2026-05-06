# DataTable — Usage

**Status:** Phase 9.1 prep
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/forms/DataTable.svelte`
**Carbon component:** `<DataTable>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/DataTable/DataTable.svelte>

> **Note:** This spec supersedes the prior Phase 1/2 DrawerTable doc at this path. Phase 9.1 wraps Carbon's `<DataTable>` directly as a generic chassis; DrawerTable remains a separate composition that may layer on top of this chassis later.

---

## When to use

Tabular structured data with multiple columns, where the user must scan, sort, filter, or batch-select rows. Examples in Argos: AGENTS sessions list (PID, status, started, last-tick), OVERVIEW SOURCES panel (source name, kind, state, latency), KISMET AP table (BSSID, SSID, channel, RSSI, encryption, last-seen), GSM IMSI catcher table (IMSI, MCC/MNC, ARFCN, power, first-seen).

## When NOT to use

- **Key/value pairs** (single object's properties) → use `<StructuredList>` or a bespoke `<dl>` block.
- **Hierarchical / tree data** → use `<DataTable expandable>` row expansion or a bespoke tree component (deferred).
- **Single-screen full-bleed log streams** (>10k rows live-appending) → use a virtualized canvas list (Argos `LogTerminal` pattern), NOT DataTable. Carbon's DOM-per-cell rendering hits frame budget around 500-1000 rows.
- **Action-toolbars without data** → use `<Toolbar>` standalone.

## Carbon vs bespoke distinction

Per Carbon `data-table/usage.mdx`:

- **Default DataTable** — sortable headers, no row selection, no toolbar.
- **Sortable** — `sortable={true}` enables click-to-sort on every column; per-column override via `sort: false` in the header definition.
- **With selection** — `selectable` (radio) or `batchSelection` (checkbox) — the latter renders a parent indeterminate checkbox in the header for select-all.
- **With toolbar** — `<ToolbarSearch>`, `<ToolbarMenu>`, `<ToolbarBatchActions>` (visible when ≥1 row selected) compose around the table.
- **Expandable** — `expandable={true}` adds a chevron column; `expandedRowIds` controls open state.
- **Sticky header** — `stickyHeader={true}` keeps the `<thead>` pinned during vertical scroll.
- **Zebra rows** — `zebra={true}` alternates row backgrounds.
- **Densities** — `size: 'compact' | 'short' | 'medium' | 'tall'` adjusts row height (24 / 32 / 48 / 64 px).
- **Skeleton** — `<DataTableSkeleton>` for loading states.

## Argos surface inventory (provisional)

Bespoke / raw `<table>` sites that Phase 9.1 retires by migrating to `<DataTable>`:

| Surface                | File                                                      | Current pattern                                     |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| AGENTS sessions list   | `src/lib/components/dashboard/views/AgentsView.svelte`    | bespoke `<table>` with hand-rolled sort + selection |
| OVERVIEW SOURCES panel | `src/lib/components/dashboard/panels/SourcesPanel.svelte` | bespoke flex grid masquerading as a table           |
| KISMET AP table        | `src/lib/components/dashboard/panels/KismetPanel.svelte`  | bespoke `<table>` with hand-rolled column sort      |
| GSM IMSI catcher table | `src/lib/components/dashboard/panels/GsmEvilPanel.svelte` | bespoke `<table>` with no sort                      |

Total bespoke table call sites: 4 primary + ~3 ancillary inline tables. Migration order: AGENTS first (canary, simplest schema), then SOURCES, then KISMET (largest column count), then GSM.

## Anatomy (per Carbon source)

From `_data-table.scss` and `DataTable.svelte`:

1. **`.bx--data-table-container`** — outermost wrapper; controls overflow + sticky header positioning.
2. **`.bx--data-table-header`** — optional title + description block above the table.
3. **`.bx--toolbar-content`** — toolbar row (search, batch actions, custom buttons).
4. **`.bx--data-table`** — the `<table>` itself; semantic `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>`.
5. **Sort affordance** — `<button>` inside `<th>` with arrow-icon flip on `aria-sort` state.
6. **Selection column** — leftmost `<th>` / `<td>` with parent `<Checkbox indeterminate>` in head + per-row `<Checkbox>` in body.
7. **Row hover** — `var(--card-hover)` background swap.
8. **Expansion column** — chevron-icon button when `expandable=true`.

## States to handle

- **Empty (zero rows)**: render an empty-state slot (caller-provided) or a default "No data" message.
- **Loading**: caller swaps to `<DataTableSkeleton>`; chassis exposes a `loading` prop that auto-swaps.
- **Sorted**: `aria-sort="ascending|descending|none"` on the active `<th>`; arrow-icon indicates direction.
- **Selected (single)**: row gets `var(--card-selected)` background + left-border accent.
- **Selected (batch)**: parent header checkbox switches to indeterminate when 0 < N < total, checked when N == total.
- **Filtered**: `<ToolbarSearch>` filters in-memory by all string columns; row-count caption updates live.
- **Expanded row**: chevron rotates 90°; expansion content renders in a `colspan=N` `<tr>` below.

## Spacing rhythm

Carbon densities translate to Lunaris row heights: 24 / 32 / 48 / 64 px. Argos default is `size="short"` (32 px) — matches the Lunaris tactical-density aesthetic. AGENTS + KISMET use `short`; OVERVIEW SOURCES uses `compact` (24 px) to fit the dense sidebar.

## Common pitfalls

- **Reactive `rows` array mutated in place** → Carbon does not detect Svelte 5 deep mutations. Always reassign: `rows = [...rows, newRow]` (or use a `$derived` from a signal).
- **`headers[]` defined inline in markup** → Carbon re-runs sort comparators every render; lift `headers` to module scope or a `$derived`.
- **Selection `id` collision** → Carbon uses `row.id` for selection tracking. If your data lacks a stable id, generate one (`crypto.randomUUID()` per row at fetch time) or selection breaks on re-fetch.
- **`<ToolbarSearch>` + custom filter** → Toolbar search emits `value` events; do NOT also bind a `filteredRows` `$derived` that runs your own substring match — pick one source of truth.
- **Sticky header inside flex parent** → `stickyHeader` requires the table container to have a constrained height (`max-height` or `flex: 1` + `overflow-y: auto`). Without it, the header pins to the page top, not the panel.
- **Slot:cell rendering an interactive element** → Carbon's row-click handler swallows clicks. Stop propagation in the inner element's handler (`onclick={(e) => { e.stopPropagation(); ... }}`).
- **`size="compact"` (24 px) and tap targets** → 24 px is the WCAG 2.5.8 floor; do NOT also reduce row padding via custom CSS or you drop below.

## Out of scope for Phase 9.1

- **Server-side pagination + infinite scroll** — Carbon ships `<Pagination>` separately; deferred until a surface has >500 rows.
- **Column reordering / drag-to-resize** — Carbon does not ship this; use a custom `colgroup` if a surface needs it (none today).
- **Inline-edit cells** — Carbon supports via slot:cell composition; no Argos surface uses inline edit yet.
- **CSV / JSON export** — bespoke utility; chassis exposes `rows` + `headers` for the caller to format.

## Authority citations

- Carbon Svelte component: <https://svelte.carbondesignsystem.com/?path=/docs/components-datatable--default>
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/DataTable/DataTable.svelte>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/data-table/_data-table.scss`
- Carbon usage mdx: `docs/carbon-website/src/pages/components/DataTable/usage.mdx`
- Argos bespoke surfaces: see "Surface inventory" table above (4 primary sites)
