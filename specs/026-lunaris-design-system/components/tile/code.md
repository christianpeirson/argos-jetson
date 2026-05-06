# Tile — Code

**Status:** Phase 9.1 — chassis implementation in flight
**Last updated:** 2026-05-04
**Implementation files (target):** `src/lib/components/chassis/data/Tile.svelte` AND `src/lib/components/chassis/data/ClickableTile.svelte`
**Carbon components:** `<Tile>` and `<ClickableTile>` from `carbon-components-svelte` v0.107.0+
**Carbon sources:**

- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/Tile.svelte>
- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/ClickableTile.svelte>

---

## One spec, two chassis files

Carbon ships `<Tile>` and `<ClickableTile>` as separate components with overlapping but distinct responsibilities:

- `<Tile>` is purely presentational; no `href`, no `onclick`, no tab-stop.
- `<ClickableTile>` is interactive; takes `href` (renders `<a>`) or no href (renders `<button>`); ships hover/focus/active states + chevron icon.

The Argos chassis follows Carbon's split:

- `src/lib/components/chassis/data/Tile.svelte` wraps Carbon's `<Tile>`.
- `src/lib/components/chassis/data/ClickableTile.svelte` wraps Carbon's `<ClickableTile>`.

Both are documented in this single spec directory because the visual identity, token map, and Lunaris-bespoke border rule are shared.

---

## `<Tile>` adapter API

```ts
interface Props {
	light?: boolean; // exposed for symmetry; Argos dark-only, ignored
	class?: string; // forwards to outer container
	style?: string; // forwards inline style
	children?: Snippet; // tile body content
}
```

The `<Tile>` chassis is the thinnest possible wrapper: it forwards `class` for surface-bespoke styling (e.g., `class="stat-tile"`) and renders children. No callbacks, no state, no validation layer — `<Tile>` is presentational.

---

## `<ClickableTile>` adapter API

```ts
interface Props {
	href?: string; // when set, renders <a href>; otherwise <button>
	target?: '_self' | '_blank' | '_parent' | '_top'; // for <a> only
	disabled?: boolean; // disables click + tab-stop
	light?: boolean; // exposed for symmetry; ignored
	class?: string; // forwards to outer container
	onClick?: (e: MouseEvent | KeyboardEvent) => void;
	children?: Snippet;
}
```

**Rationale**:

- `href` vs `onclick` is the canonical "navigation vs action" distinction. Pass `href` for routing; pass `onClick` for in-page action.
- `disabled` short-circuits both `href` (no navigation) and `onClick` (no callback). Carbon adds `aria-disabled` automatically.
- No `bind:` props — `<ClickableTile>` is stateless from the chassis perspective; the parent owns any state mutated in `onClick`.
- No validation layer — Carbon's `<ClickableTile>` does not support form-style feedback. If a tile needs an error indicator (e.g., "agent unhealthy"), render a `<Tag kind="red">` inside the tile body.

---

## Consumer pattern

### Before (raw `<div>`, Mission Control stat tile)

```svelte
<div class="stat-tile">
	<div class="stat-header">
		<Cpu size={20} />
		<span class="stat-label">CPU TOTAL</span>
	</div>
	<div class="stat-value">{cpuPct}%</div>
	<ProgressBar value={cpuPct} max={100} />
</div>
```

### After (Carbon-wrapped `<Tile>`)

```svelte
<Tile class="stat-tile">
	<div class="stat-header">
		<Cpu size={20} />
		<span class="stat-label">CPU TOTAL</span>
	</div>
	<div class="stat-value">{cpuPct}%</div>
	<ProgressBar value={cpuPct} max={100} />
</Tile>
```

The bespoke `<div class="stat-tile">` is replaced by `<Tile class="stat-tile">`. The internal `.stat-tile` CSS rules continue to apply (Carbon's wrapper div carries the class). Carbon's default 16 px padding + Lunaris's 1 px border come for free.

### Before (raw `<a>`, AGENTS session card)

```svelte
<a class="session-card" href="/agents/{session.id}">
	<div class="card-header">
		<h3>{session.name}</h3>
		<Tag kind={statusKind(session.status)}>{session.status}</Tag>
	</div>
	<div class="card-meta">PID {session.pid}</div>
	<div class="card-footer">last tick {formatTime(session.lastTick)}</div>
</a>
```

### After (Carbon-wrapped `<ClickableTile>`)

```svelte
<ClickableTile href="/agents/{session.id}" class="session-card">
	<div class="card-header">
		<h3>{session.name}</h3>
		<Tag kind={statusKind(session.status)}>{session.status}</Tag>
	</div>
	<div class="card-meta">PID {session.pid}</div>
	<div class="card-footer">last tick {formatTime(session.lastTick)}</div>
</ClickableTile>
```

The chevron icon at the bottom-right is a Carbon free addition. Hover/focus/active states all from Carbon. Tab-stop handled by the underlying `<a>`.

### `<ClickableTile>` with `onClick` (Workflows category card)

```svelte
<ClickableTile class="cat-card" onClick={() => navigateToCategory(category.id)}>
	<CategoryIcon kind={category.icon} />
	<h3>{category.title}</h3>
	<div class="cat-count">{category.itemCount} items</div>
</ClickableTile>
```

---

## Direct Carbon use

For surfaces that need the full Tile family (selectable, radio, expandable):

```svelte
<script>
	import {
		Tile,
		ClickableTile,
		SelectableTile,
		RadioTile,
		TileGroup,
		ExpandableTile
	} from 'carbon-components-svelte';
</script>

<TileGroup legend="Notification frequency">
	<RadioTile value="immediate">Immediate</RadioTile>
	<RadioTile value="hourly">Hourly digest</RadioTile>
	<RadioTile value="daily">Daily digest</RadioTile>
</TileGroup>
```

These compose into a deferred chassis pair (`SelectableTile.svelte`, `RadioTileGroup.svelte`) — not part of Phase 9.1.

---

## State + interaction semantics

### `<Tile>`

- Pure container; no interactive semantics.
- Forwarding `class` adds Lunaris-bespoke surface styles (e.g., dim background for "inactive" stat).
- Forwarding `style` allows inline overrides (sparingly — prefer `class`).

### `<ClickableTile>`

- **Click** — fires `onClick(e)` and (if `href`) navigates. Argos chassis runs `onClick` first, then lets the browser navigate; if `e.preventDefault()` is called inside `onClick`, navigation is suppressed.
- **Keyboard activate** — Enter (always) and Space (when rendered as `<button>`) trigger the click handler. Carbon binds these natively.
- **Focus** — tab-stop. 2 px inset outline.
- **Disabled** — when `disabled={true}`, Carbon sets `aria-disabled` and removes from tab order; `href` navigation suppressed; `onClick` not called.

---

## Migration consumer call-sites (Phase 9.1 scope)

### Phase 9.1 chassis introduction — no migrations yet

Phase 9.1 introduces the chassis pair only. Call-site migrations land in 9.1e-9.1g:

| Phase | File                                                           | Site                                  | Variant         |
| ----- | -------------------------------------------------------------- | ------------------------------------- | --------------- |
| 9.1e  | `src/lib/components/dashboard/views/MissionControlView.svelte` | 4 stat tiles (CPU, MEM, TEMP, UPTIME) | `Tile`          |
| 9.1f  | `src/lib/components/dashboard/views/AgentsView.svelte`         | session cards (grid view)             | `ClickableTile` |
| 9.1g  | `src/lib/components/dashboard/views/WorkflowsView.svelte`      | category cards                        | `ClickableTile` |

Each sub-phase is its own atomic commit inside the Phase 9 daily PR.

---

## What we don't migrate yet

- **`<SelectableTile>`** — multi-select; no Argos surface today.
- **`<RadioTile>` + `<TileGroup>`** — single-select group; no Argos surface today.
- **`<ExpandableTile>`** — expand/collapse; deferred.

---

## Authority citations

- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-tile--default>
- Carbon Svelte sources:
    - <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/Tile.svelte>
    - <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/ClickableTile.svelte>
- Carbon Svelte type defs: `node_modules/carbon-components-svelte/types/Tile/`
- Carbon SCSS source: `docs/carbon-design-system/packages/styles/scss/components/tile/_tile.scss`
- Argos current bespoke (canary): `src/lib/components/dashboard/views/MissionControlView.svelte`
- Adapter pattern reference: Phase 4 `Modal.svelte` + spec `modal/code.md`
