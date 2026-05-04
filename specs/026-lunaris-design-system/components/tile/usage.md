# Tile — Usage

**Status:** Phase 9.1 prep
**Last updated:** 2026-05-04
**Implementation files (target):** `src/lib/components/chassis/data/Tile.svelte` AND `src/lib/components/chassis/data/ClickableTile.svelte`
**Carbon components:** `<Tile>` and `<ClickableTile>` from `carbon-components-svelte` v0.107.0+
**Carbon sources:**
- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/Tile.svelte>
- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/ClickableTile.svelte>

---

## When to use

A bordered card surface that visually groups related content into a discrete unit. Two flavors:

- **`<Tile>`** — non-interactive content card. Used for stat tiles (Mission Control CPU/MEM/temp readouts), grouped key/value summaries, info panels embedded inside larger views.
- **`<ClickableTile>`** — interactive card that navigates / triggers an action when clicked. Used for AGENTS session cards in grid view (click → open detail), Workflows category cards (click → enter workflow folder), tool-launcher tiles.

Argos surfaces:

- **Mission Control stat tiles** — non-clickable; show CPU TOTAL, MEM TOTAL, TEMP, UPTIME with embedded `<ProgressBar>`.
- **AGENTS session cards (grid view)** — clickable; show session name, status `<Tag>`, last-tick. Click navigates to session detail.
- **Workflows category cards** — clickable; show category icon + title + child count. Click drills into category.

## When NOT to use

- **A row in a table** → use `<DataTable>` row (chassis Phase 9.1).
- **A button-shaped action** → use `<Button>`. Tiles imply "container of content"; buttons imply "verb".
- **A modal launcher** → use `<Button>` or a list-item, not a tile.
- **Repeating list of >20 items** → consider a `<DataTable>` for density; tiles work for ≤12-tile grids.
- **Inline status chip** → use `<Tag>`, not a tile.

## Carbon vs bespoke distinction

Per Carbon `tile/usage.mdx`:

- **Default `<Tile>`** — static content container. No hover, no click handler.
- **`<ClickableTile>`** — wraps content in an `<a href>` or button-like surface; full tile area is the click target. Renders an arrow icon at the end on hover.
- **`<SelectableTile>`** — multi-select tile with built-in checkmark (NOT in Phase 9.1 scope; deferred).
- **`<RadioTile>`** + **`<TileGroup>`** — single-select group (NOT in Phase 9.1 scope; deferred).
- **`<ExpandableTile>`** — expand/collapse tile (NOT in Phase 9.1 scope; deferred).
- **Light variant** — `light={true}` swaps background; Argos is dark-only so this prop is exposed but unused.

## Argos surface inventory (provisional)

Bespoke `.card` / hand-rolled tile sites that Phase 9.1 retires:

| Surface | File | Current pattern | Variant |
| --- | --- | --- | --- |
| Mission Control stat tiles | `src/lib/components/dashboard/views/MissionControlView.svelte` | bespoke `.stat-tile` div with hand-rolled border + padding | `Tile` |
| AGENTS session cards | `src/lib/components/dashboard/views/AgentsView.svelte` | bespoke `.session-card` with `onclick` handler on outer div | `ClickableTile` |
| Workflows category cards | `src/lib/components/dashboard/views/WorkflowsView.svelte` | bespoke `.cat-card` with `<a>` wrapper | `ClickableTile` |

Total bespoke tile call sites: ~12-18 (4 stat tiles × 1 view + N session cards + ~6 workflow categories).

## Anatomy (per Carbon source)

From `_tile.scss`:

1. **`.bx--tile`** — outermost container; 1 px solid `$border-tile` (which Lunaris remaps to `var(--border)`); padding `$spacing-05` (16 px) all sides.
2. **`<Tile>`** — renders the container plus a `<slot>` for content. No interactive role.
3. **`<ClickableTile>`** — wraps content in `<a href>` (or `<button>` if no `href`); adds hover/focus styles + an arrow chevron icon (`<ArrowRight>` from carbon-icons-svelte) at the end-block-end corner.
4. **No internal grid** — caller arranges interior content (tile-tile internal structure is fully bespoke).

## States to handle

### `<Tile>` (non-interactive)

- **Default**: bordered container, no interactions.
- **Light variant**: alternate background (unused in Argos).

### `<ClickableTile>`

- **Default**: bordered container; chevron icon hidden (or muted).
- **Hover**: border swaps to `var(--ink-3)`; chevron color brightens to `var(--accent)`; cursor: pointer.
- **Focus**: 2 px `var(--accent)` outline outside the tile; chevron at full opacity.
- **Active (mousedown)**: background dims slightly (`var(--card-active)`).
- **Disabled**: `pointer-events: none`; opacity 0.5; chevron hidden.
- **Visited (`<a>` history)**: no special styling; tiles do not show visited state.

## Spacing rhythm

Carbon's default tile padding is 16 px all sides. Lunaris adopts unchanged for stat tiles and session cards. Workflows category cards use 24 px padding (Lunaris-bespoke override) for visual breathing room — apply via the `class` prop forwarding to a Lunaris CSS rule.

Tile-to-tile gap in a grid: 16 px (Lunaris default). Mission Control stat-tile row uses `gap: 12 px` for tighter packing.

## Common pitfalls

- **Wrapping `<ClickableTile>` in another `<a>`** → nested anchor invalid HTML. Pass `href` to `<ClickableTile>` directly, or use a `<Tile>` + bespoke `<a>` wrapper if you must compose.
- **Using `<Tile>` as a clickable surface via `onclick={...}` on the slot** → no keyboard accessibility; the tile won't be in the tab order. Always use `<ClickableTile>` for interactive tiles.
- **Mixing `<ClickableTile>` and `<Tile>` in the same grid without visual treatment** → users can't tell which are clickable. Either make all tiles in a grid clickable, or use a clear visual cue (chevron) on the clickable subset.
- **Deeply-nested interactive elements inside `<ClickableTile>`** → Carbon does not stop click propagation; clicking an inner button also triggers the tile's navigation. Stop propagation in inner-element handlers (`onclick={(e) => { e.stopPropagation(); ... }}`).
- **`href="#"` on `<ClickableTile>`** → causes page-jump-to-top + history pollution. Use a real route or omit `href` (renders as button).
- **Reusing tile padding for an inner header** → produces double padding. Inner content should be flush-edge of the tile body.

## Out of scope for Phase 9.1

- **`<SelectableTile>`** — multi-select; no Argos surface today.
- **`<RadioTile>` + `<TileGroup>`** — single-select group; no Argos surface today.
- **`<ExpandableTile>`** — expand/collapse; deferred.
- **Tile drag-to-reorder** — not Carbon-shipped.

## Authority citations

- Carbon Svelte component: <https://svelte.carbondesignsystem.com/?path=/docs/components-tile--default>
- Carbon Svelte sources:
  - <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/Tile.svelte>
  - <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/ClickableTile.svelte>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/tile/_tile.scss`
- Carbon usage mdx: `docs/carbon-website/src/pages/components/Tile/usage.mdx`
- Argos bespoke surfaces: see "Surface inventory" table above
