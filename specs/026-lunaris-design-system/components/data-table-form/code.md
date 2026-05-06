# DataTable — Code

**Status:** Phase 9.1 — chassis implementation in flight
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/forms/DataTable.svelte`
**Carbon component:** `<DataTable>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/DataTable/DataTable.svelte>

> **Note:** This spec supersedes the prior Phase 2 DrawerTable amendment at this path. DrawerTable can compose this chassis if a future need arises.

---

## Argos `DataTable` adapter API

The Argos `DataTable` is a Svelte 5 (runes) wrapper that delegates to Carbon's `<DataTable>`. It exists to (1) keep call-sites idiomatic with callback props (no Carbon event dispatcher), (2) provide a standard validation-prop layer (`labelText`, `helperText`, `invalid`, `invalidText`, `warn`, `warnText`) for surfaces that need form-style feedback, (3) wire toolbar slots in a Lunaris-consistent way, (4) expose a `loading` prop that auto-swaps to `<DataTableSkeleton>`.

```ts
interface Header {
	key: string; // dot-path into row object
	value: string; // visible header label
	sort?: false | ((a: unknown, b: unknown) => number); // disable or override
	width?: string; // e.g., '200px' or '20%'
	display?: (item: unknown, row: Row) => unknown; // formatter for slot:cell
}

interface Row {
	id: string; // REQUIRED — Carbon uses for selection tracking
	[key: string]: unknown;
}

interface Props {
	headers: Header[];
	rows: Row[];
	size?: 'compact' | 'short' | 'medium' | 'tall'; // default: 'short'
	sortable?: boolean; // default: false
	zebra?: boolean; // default: false
	stickyHeader?: boolean; // default: false
	useStaticWidth?: boolean; // default: false (auto-fill container)

	// Selection
	selectable?: boolean; // single radio selection
	batchSelection?: boolean; // multi checkbox selection
	selectedRowIds?: string[]; // bindable via $bindable()
	radio?: boolean; // alias for selectable in Carbon

	// Expansion
	expandable?: boolean; // default: false
	expandedRowIds?: string[]; // bindable via $bindable()

	// Title block
	title?: string;
	description?: string;

	// Validation layer (Argos-added)
	labelText?: string;
	helperText?: string;
	invalid?: boolean;
	invalidText?: string;
	warn?: boolean;
	warnText?: string;

	// Loading
	loading?: boolean; // swaps to <DataTableSkeleton>

	// Callbacks
	onRowClick?: (row: Row) => void;
	onSort?: (header: string, direction: 'ascending' | 'descending' | 'none') => void;
	onSelectChange?: (selectedIds: string[]) => void;

	// Slots
	children?: Snippet; // toolbar content
	cell?: Snippet<[{ row: Row; cell: { key: string; value: unknown } }]>;
	expandedRow?: Snippet<[{ row: Row }]>;
	emptyState?: Snippet;

	class?: string;
}
```

**Rationale**:

- `selectedRowIds` and `expandedRowIds` are `$bindable()` so consumers `bind:selectedRowIds` directly. Migration from bespoke selection state is one line.
- `headers` + `rows` are the same shape Carbon expects; no transformation layer.
- `loading` is the Argos addition — chassis swaps internally to `<DataTableSkeleton>` with matching `headers.length` and `size`.
- The validation-prop layer (`invalid` / `invalidText` / `warn` / `warnText`) is Argos-added because Carbon's `<DataTable>` itself does not support form-style feedback; the chassis renders these below the table when set, mirroring TextInput's pattern.
- `onRowClick`, `onSort`, `onSelectChange` are forwarded as plain callbacks; Carbon's event-dispatcher style is hidden.
- `cell` snippet matches Carbon's `slot:cell` exactly so formatters port without change.

---

## Consumer pattern

### Before (raw `<table>`, AGENTS sessions list)

```svelte
<table class="agents-table">
	<thead>
		<tr>
			<th onclick={() => sortBy('pid')}>PID</th>
			<th onclick={() => sortBy('status')}>STATUS</th>
			<th onclick={() => sortBy('started')}>STARTED</th>
		</tr>
	</thead>
	<tbody>
		{#each sortedSessions as session (session.id)}
			<tr
				class:selected={selectedId === session.id}
				onclick={() => (selectedId = session.id)}
			>
				<td>{session.pid}</td>
				<td><Tag kind={statusKind(session.status)}>{session.status}</Tag></td>
				<td>{formatTime(session.started)}</td>
			</tr>
		{/each}
	</tbody>
</table>
```

### After (Carbon-wrapped)

```svelte
<script lang="ts">
	import DataTable from '$lib/components/chassis/forms/DataTable.svelte';
	import Tag from '$lib/components/chassis/forms/Tag.svelte';

	const headers = [
		{ key: 'pid', value: 'PID' },
		{ key: 'status', value: 'STATUS' },
		{ key: 'started', value: 'STARTED' }
	];

	let selectedRowIds = $state<string[]>([]);
</script>

<DataTable {headers} rows={sessions} size="short" sortable selectable bind:selectedRowIds>
	{#snippet cell({ row, cell })}
		{#if cell.key === 'status'}
			<Tag kind={statusKind(row.status)}>{row.status}</Tag>
		{:else if cell.key === 'started'}
			{formatTime(row.started)}
		{:else}
			{cell.value}
		{/if}
	{/snippet}
</DataTable>
```

The bespoke `<table>` is replaced; sort logic moves into Carbon's internal comparator (string/number auto-detected); selection state migrates from `selectedId: string` to `selectedRowIds: string[]` (length-1 array for radio mode).

### With toolbar (KISMET AP table)

```svelte
<DataTable {headers} rows={apRows} sortable batchSelection bind:selectedRowIds>
	{#snippet children()}
		<ToolbarSearch placeholder="Filter APs by SSID/BSSID/channel" />
		<ToolbarBatchActions>
			<Button onclick={blacklistSelected}>Blacklist</Button>
		</ToolbarBatchActions>
	{/snippet}
</DataTable>
```

---

## Direct Carbon `<DataTable>` use

For surfaces that need Carbon-specific features the adapter does not expose (custom `<TableHeader>` slot composition, `<TableSelectAll>` outside default position, `expandable={'always'}` for permanent expansion):

```svelte
<script>
	import {
		DataTable,
		Toolbar,
		ToolbarContent,
		ToolbarSearch,
		ToolbarMenu,
		ToolbarMenuItem
	} from 'carbon-components-svelte';
</script>

<DataTable {headers} {rows} sortable>
	<Toolbar>
		<ToolbarContent>
			<ToolbarSearch />
			<ToolbarMenu>
				<ToolbarMenuItem>Export CSV</ToolbarMenuItem>
				<ToolbarMenuItem>Export JSON</ToolbarMenuItem>
			</ToolbarMenu>
		</ToolbarContent>
	</Toolbar>
</DataTable>
```

Lunaris tokens flow through automatically.

---

## State + interaction semantics

- **Sortable** — Carbon's internal comparator handles string + number; for custom sort (e.g., by RSSI dB-scale), pass a per-header `sort` function.
- **Selection (radio)** — `selectable={true}` renders a radio in column 0; only one row at a time.
- **Selection (batch)** — `batchSelection={true}` renders checkboxes; parent header checkbox auto-indeterminate.
- **Expansion** — `expandable={true}` adds a chevron column 0 (or column 1 if also batchSelection); `expandedRow` snippet renders the open content.
- **Sticky header** — `stickyHeader={true}` requires constrained-height container; chassis wraps in a `<div style="max-block-size: 100%; overflow-y: auto">` if requested.
- **Loading** — `loading={true}` swaps to `<DataTableSkeleton showHeader={!!title} showToolbar={hasToolbar} columns={headers.length} rows={5}>`.
- **Empty state** — when `rows.length === 0 && !loading`, render `emptyState` snippet if provided, else default "No data".
- **Validation feedback** — when `invalid={true}`, render `invalidText` below the table in `var(--mk2-red)` with role="alert"; same for `warn` / `warnText` in `var(--mk2-amber)`.

---

## Migration consumer call-sites (Phase 9.1 scope)

### Phase 9.1 chassis introduction — no migrations yet

Phase 9.1 introduces the chassis only. Call-site migrations land in 9.1a-9.1d:

| Phase | File                                                      | Site                                          |
| ----- | --------------------------------------------------------- | --------------------------------------------- |
| 9.1a  | `src/lib/components/dashboard/views/AgentsView.svelte`    | sessions list (canary, ~80 LOC bespoke table) |
| 9.1b  | `src/lib/components/dashboard/panels/SourcesPanel.svelte` | OVERVIEW SOURCES (~120 LOC bespoke flex grid) |
| 9.1c  | `src/lib/components/dashboard/panels/KismetPanel.svelte`  | AP table (~200 LOC, largest column count)     |
| 9.1d  | `src/lib/components/dashboard/panels/GsmEvilPanel.svelte` | IMSI table (~90 LOC)                          |

Migration order: AGENTS first (simplest schema, canary). Each sub-phase is its own atomic commit inside the Phase 9 daily PR.

---

## What we don't migrate yet

- **`<Pagination>`** — separate Carbon component; chassis-Pagination spec deferred (no Argos surface has >500 rows today).
- **Server-side sort/filter** — current surfaces sort/filter in-memory; defer until KISMET row count exceeds frame budget.
- **Inline edit** — no surface uses inline edit yet.
- **Column reorder/resize** — not Carbon-shipped; no Argos surface needs it.

---

## Authority citations

- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-datatable--default>
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/DataTable/DataTable.svelte>
- Carbon Svelte type defs: `node_modules/carbon-components-svelte/types/DataTable/DataTable.svelte.d.ts`
- Carbon SCSS source: `docs/carbon-design-system/packages/styles/scss/components/data-table/_data-table.scss`
- Argos current bespoke (canary): `src/lib/components/dashboard/views/AgentsView.svelte`
- Adapter pattern reference: Phase 5 `Tabs.svelte` + spec `tabs/code.md`
