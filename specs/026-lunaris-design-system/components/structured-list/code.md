# StructuredList — Code

**Status:** Phase 9.1 chassis in progress
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/data/StructuredList.svelte`
**Carbon component:** `<StructuredList>` family from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/StructuredList/StructuredList.svelte>

---

## Argos `StructuredList` adapter API

The Argos `StructuredList` is a Svelte 5 (runes) wrapper that delegates to Carbon's `<StructuredList>` family. It exists to (1) keep call-sites concise (single import), (2) standardise the `selected` callback into a typed signature, (3) provide a `class`-forwarding seam for Lunaris-bespoke skins, (4) re-export the sub-components so consumers get them from one path.

```ts
interface Props {
	selection?: boolean;          // turns on selectable-row mode
	condensed?: boolean;          // 8 px block padding instead of 16 px
	flush?: boolean;              // remove outer container padding (use inside cards)
	selected?: string | undefined; // bindable via $bindable() — selection mode only; matches <StructuredListInput value>
	id?: string;
	class?: string;               // forwards to Carbon outer div for Lunaris skins
	onSelectionChange?: (value: string) => void;
	children?: Snippet;           // <StructuredListHead> + <StructuredListBody>
}
```

**Rationale**:

- `selected` is `$bindable()` so consumers `bind:selected` to track which row is picked. Default undefined (no selection).
- `selection` toggles Carbon's selectable-row mode. When `selection={true}`, each row needs a `<StructuredListInput value="...">` for the radio-group.
- `condensed` and `flush` pass through to Carbon's outer modifier classes.
- `class` forwards to Carbon's outermost `bx--structured-list` div for per-instance styling.
- `onSelectionChange` callback fires when the bound `selected` changes — typed `(value: string) => void` instead of unwrapping `event.detail`.

---

## Sub-component re-exports

Carbon's `<StructuredListHead>` / `<StructuredListBody>` / `<StructuredListRow>` / `<StructuredListCell>` / `<StructuredListInput>` are re-exported as-is — no per-sub-component wrapping. The wrapper bundle:

```ts
// src/lib/components/chassis/data/index.ts
export { default as StructuredList } from './StructuredList.svelte';
export {
	StructuredListHead,
	StructuredListBody,
	StructuredListRow,
	StructuredListCell,
	StructuredListInput,
} from 'carbon-components-svelte';
```

---

## Consumer pattern

### Before (raw HTML, Event detail dialog)

```svelte
<dl class="kv-list">
	<div class="kv-row">
		<dt>TIMESTAMP</dt>
		<dd>{event.ts.toISOString()}</dd>
	</div>
	<div class="kv-row">
		<dt>SOURCE</dt>
		<dd>{event.source}</dd>
	</div>
	<div class="kv-row">
		<dt>FREQ</dt>
		<dd>{event.freq.toFixed(3)} MHz</dd>
	</div>
	<div class="kv-row">
		<dt>RSSI</dt>
		<dd>{event.rssi} dBm</dd>
	</div>
</dl>
```

### After (Carbon-wrapped)

```svelte
<script lang="ts">
	import {
		StructuredList,
		StructuredListBody,
		StructuredListRow,
		StructuredListCell,
	} from '$lib/components/chassis/data';

	let { event } = $props<{ event: ArgosEvent }>();
</script>

<StructuredList condensed flush>
	<StructuredListBody>
		<StructuredListRow>
			<StructuredListCell>TIMESTAMP</StructuredListCell>
			<StructuredListCell noWrap>{event.ts.toISOString()}</StructuredListCell>
		</StructuredListRow>
		<StructuredListRow>
			<StructuredListCell>SOURCE</StructuredListCell>
			<StructuredListCell>{event.source}</StructuredListCell>
		</StructuredListRow>
		<StructuredListRow>
			<StructuredListCell>FREQ</StructuredListCell>
			<StructuredListCell>{event.freq.toFixed(3)} MHz</StructuredListCell>
		</StructuredListRow>
		<StructuredListRow>
			<StructuredListCell>RSSI</StructuredListCell>
			<StructuredListCell>{event.rssi} dBm</StructuredListCell>
		</StructuredListRow>
	</StructuredListBody>
</StructuredList>
```

The bespoke `<dl>` + `<dt>` / `<dd>` is replaced with Carbon's div-based structure. Hand-rolled `.kv-list` / `.kv-row` CSS goes away — Carbon's row/cell padding takes over. `noWrap` on the timestamp cell prevents wrapping of the long ISO string.

### With header row (mission summary modal)

```svelte
<StructuredList>
	<StructuredListHead>
		<StructuredListRow head>
			<StructuredListCell head>FIELD</StructuredListCell>
			<StructuredListCell head>VALUE</StructuredListCell>
			<StructuredListCell head>STATUS</StructuredListCell>
		</StructuredListRow>
	</StructuredListHead>
	<StructuredListBody>
		<StructuredListRow>
			<StructuredListCell>Mission</StructuredListCell>
			<StructuredListCell>{mission.name}</StructuredListCell>
			<StructuredListCell>
				<Tag type="green">ACTIVE</Tag>
			</StructuredListCell>
		</StructuredListRow>
		<!-- … more rows … -->
	</StructuredListBody>
</StructuredList>
```

### Selection mode (IMSI inspector pin-row)

```svelte
<script lang="ts">
	import {
		StructuredList,
		StructuredListBody,
		StructuredListRow,
		StructuredListCell,
		StructuredListInput,
	} from '$lib/components/chassis/data';

	let pinnedImsi = $state<string | undefined>(undefined);
</script>

<StructuredList selection condensed bind:selected={pinnedImsi}>
	<StructuredListBody>
		{#each imsiRecords as rec (rec.imsi)}
			<StructuredListRow label for={rec.imsi}>
				<StructuredListCell>{rec.imsi}</StructuredListCell>
				<StructuredListCell>{rec.tac}</StructuredListCell>
				<StructuredListCell>{rec.lastSeen}</StructuredListCell>
				<StructuredListInput value={rec.imsi} title="Pin {rec.imsi}" name="pinnedImsi" />
				<StructuredListCell>
					<CheckmarkFilled class="bx--structured-list-svg" />
				</StructuredListCell>
			</StructuredListRow>
		{/each}
	</StructuredListBody>
</StructuredList>
```

Selection mode requires:

- `selection` on the outer list.
- `label for={value}` on each row to make the row clickable.
- `<StructuredListInput value={...}>` per row (visually-hidden radio).
- A trailing `<StructuredListCell>` rendering `<CheckmarkFilled>` — Carbon's CSS hides it unless the row is selected, then shows it.

`bind:selected` returns the matched `value` string (or `undefined` if nothing picked).

---

## Direct Carbon `<StructuredList>` use

For surfaces needing Carbon-specific features the adapter does not expose (custom slot composition, deep ref access for testing):

```svelte
<script lang="ts">
	import { StructuredList, StructuredListBody, StructuredListRow, StructuredListCell } from 'carbon-components-svelte';
</script>

<StructuredList>
	<StructuredListBody>
		<StructuredListRow>
			<StructuredListCell>Key</StructuredListCell>
			<StructuredListCell>Value</StructuredListCell>
		</StructuredListRow>
	</StructuredListBody>
</StructuredList>
```

Lunaris tokens flow through automatically.

---

## State + interaction semantics

- **Read-only mode (default)** — no hover, no click, no selection. Pure key/value display.
- **Selectable mode (`selection={true}`)** — rows become clickable; `<StructuredListInput value>` provides the radio-group; `bind:selected` tracks which value is picked.
- **Condensed (`condensed={true}`)** — 8 px block padding; tactical density.
- **Flush (`flush={true}`)** — outer container padding zeroed; for use inside a card/panel that already provides padding.
- **Disabled per-row** — Carbon does NOT support per-row disabled in selection mode. If a row needs to be disabled, render it without `<StructuredListInput>` and add a custom muted class.
- **No invalid state** — selection-mode lists do not have a built-in invalid state. Form-level validation goes outside the list.

---

## Migration consumer call-sites (Phase 9.1 scope)

Per audit on 2026-05-04:

| File                                                           | Site description                                       | Mode                          |
| -------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------- |
| `src/lib/components/dashboard/dialogs/EventDetailDialog.svelte` | event detail KV list                                  | read-only, condensed, flush   |
| `src/lib/components/dashboard/panels/ImsiInspector.svelte`     | IMSI list (pin selection)                              | selectable, condensed         |
| `src/lib/components/dashboard/panels/ApDetail.svelte`          | AP detail KV list                                      | read-only, condensed, flush   |
| `src/lib/components/dashboard/panels/SessionDetail.svelte`     | session detail KV list                                 | read-only, condensed, flush   |
| `src/lib/components/dashboard/views/ReportsView.svelte`        | mission summary modal table → 3-col StructuredList     | read-only, default density    |

Total: ~5 sites in Phase 9.1; 1-4 sites deferred (BluetoothPanel detail, hardware-detail surfaces) until follow-up audit.

---

## What we don't migrate yet

- **`<StructuredListSkeleton>`** — surfaces are typically loaded synchronously; reserved.
- **Multi-select pattern** — Carbon's StructuredList is single-select-only; multi-select needs `<DataTable>`.
- **Inline-editable cells** — would need DataTable's inline-edit pattern; reserved.
- **Per-row action menus** — would conflict with selection mode; reserved.

---

## Authority citations

- Carbon Svelte source (v0.107.0): <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/StructuredList/StructuredList.svelte>
- Carbon Svelte sub-component sources: `src/StructuredList/{StructuredListHead,StructuredListBody,StructuredListRow,StructuredListCell,StructuredListInput}.svelte` at the same tag
- Carbon Svelte type defs: `node_modules/carbon-components-svelte/types/StructuredList/StructuredList.svelte.d.ts`
- Carbon SCSS source: `docs/carbon-design-system/packages/styles/scss/components/structured-list/_structured-list.scss`
- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-structuredlist--default>
- Argos current bespoke (canary): `src/lib/components/dashboard/dialogs/EventDetailDialog.svelte`
- Adapter pattern reference: Phase 5 `Tabs.svelte` + spec `tabs/code.md`
