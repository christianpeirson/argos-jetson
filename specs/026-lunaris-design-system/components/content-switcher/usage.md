# ContentSwitcher — Usage

**Status:** Phase 9.1 prep (drafted ahead of chassis implementation)
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/navigation/ContentSwitcher.svelte`
**Carbon component:** `<ContentSwitcher>` + `<Switch>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ContentSwitcher/ContentSwitcher.svelte>

---

## When to use

Two-to-five mutually exclusive view-modes / filter-modes that share a single result region. The switch swaps WHAT the same panel shows, not WHERE you are. Examples in Argos: AGENTS filter tabs (`ALL` / `ACTIVE` / `IDLE` / `DEAD`), AGENTS view-mode toggle (`GRID` / `LIST` / `SPLIT`), SPECTRUM mode toggle (`PEAK` / `AVG` / `LIVE`).

## When NOT to use

- **Different routes / panels** → use `<Tabs>` (Phase 5, already shipped). Tabs change panel content with separate panel regions; ContentSwitcher mutates a single region.
- **Binary on/off state** → use `<Toggle>` (deferred phase) or `<Checkbox>` (Phase 3 shipped).
- **>5 options** → use `<Dropdown>` / `<Select>` (Phase 3 shipped). Carbon ContentSwitcher visually breaks past 5 segments (label truncation, line wrap on narrow viewports).
- **Free-text or multi-select filter** → use `<MultiSelect>` (deferred phase) or a search input.
- **Nav across kill-chain phases** → use the icon rail (bespoke, not a Carbon primitive).

## Carbon vs bespoke distinction

Per Carbon `content-switcher/usage.mdx`:

- **Default ContentSwitcher** — visually-grouped segmented control. One `<Switch>` is `selected` at a time; click or arrow-key navigation swaps `selectedIndex`.
- **Icon-only Switch** — `<Switch>` accepts a `text` slot OR an `iconDescription` for screen-reader-only labelling when only an icon renders. Argos AGENTS view-mode toggle (GRID/LIST/SPLIT) is a candidate.
- **Size axis** — Carbon ships `sm` / default / `xl`. Lunaris adopts `sm` for tactical density panels (FilterBar, BluetoothPanel) and default for top-of-view filters (AGENTS).

## Argos surface inventory (provisional)

Bespoke segmented-toggle sites Phase 9.1 retires by migrating to `<ContentSwitcher>`:

| Surface                          | File                                                          | Current pattern                                               |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| AGENTS filter tabs (4 segments)  | `src/lib/components/dashboard/views/AgentsView.svelte`        | bespoke `<button class="seg">` group with manual aria-pressed |
| AGENTS view-mode toggle (3)      | `src/lib/components/dashboard/views/AgentsView.svelte`        | bespoke icon button group                                     |
| SPECTRUM mode toggle (3)         | `src/lib/components/dashboard/panels/SpectrumControls.svelte` | bespoke `<select>` (mis-pattern — should be segmented)        |
| FilterBar quick-filter chips     | `src/lib/components/dashboard/panels/FilterBar.svelte`        | bespoke `.seg-group` with hand-rolled selected state          |
| ReportsView export-format toggle | `src/lib/components/dashboard/views/ReportsView.svelte`       | radio-input fallback                                          |

Total bespoke segmented sites: ~5-7. Migration order: SPECTRUM mode (highest visibility) → AGENTS filter → AGENTS view-mode → FilterBar → ReportsView.

## Anatomy (per Carbon source)

From `_content-switcher.scss`:

1. **Outer `<div role="tablist">`** — Carbon emits `role="tablist"` when `selectiveMode="automatic"` (default); arrow keys cycle the active switch and update `selectedIndex`. With `selectiveMode="manual"`, `role="tablist"` is still emitted but Enter/Space is required to commit selection.
2. **Per-segment `<button role="tab">`** — each `<Switch>` renders as a button; the active switch carries `aria-selected="true"` + `tabindex="0"`, inactive carries `tabindex="-1"`.
3. **Visual frame** — single 1-px border around the entire group, segment dividers via vertical 1-px borders. Rounded corners only on the outermost segments.
4. **Min height** — `2rem` (32 px) at default size; `1.5rem` (24 px) at `sm`; `3rem` (48 px) at `xl`.
5. **Indicator** — selected segment renders inverted (fg ↔ bg swap), no underline / pill.

## States to handle

- **Default unselected** — segment with default border + foreground.
- **Hover (unselected)** — slight bg lift (`var(--bg-1)`).
- **Selected** — inverted fg / bg pair (`var(--ink)` bg + `var(--bg)` fg).
- **Focus (any)** — 2-px `var(--accent)` outline outside the segment.
- **Disabled (whole switcher)** — pass-through `disabled` prop; AT announces; segments lose hover.
- **Disabled (single segment)** — Carbon allows `<Switch disabled>` per-segment; muted style + no click.

## Spacing rhythm

Carbon's segmented control is denser than typical Bootstrap pill-toggles. Lunaris adopts unchanged — matches the tactical-density aesthetic at `sm` size; default size for top-of-view filters where read-distance matters.

## Common pitfalls

1. **Confusing ContentSwitcher with Tabs.** Tabs route to different `<TabPanel>`s; ContentSwitcher mutates one region's state. If your two segments have totally different control-bars, you want Tabs.
2. **Passing `<Switch text="...">` AND a default slot.** `<Switch>` accepts EITHER `text` prop OR a slot. Mixing renders both — Carbon does not error but the layout breaks.
3. **`selectedIndex` not bindable in raw Carbon.** Carbon ships `selectedIndex` as a settable prop; the wrapper exposes `$bindable()` so `bind:selectedIndex` works.
4. **`on:change` event payload shape.** Carbon emits `CustomEvent<{ index, text }>`. The wrapper exposes a typed `onChange?: (detail: { index: number; text: string }) => void` callback so consumers don't have to unwrap `event.detail`.
5. **>5 segments on narrow viewports.** Carbon does not collapse to a dropdown; segments truncate text. Switch to `<Dropdown>` past 5.
6. **Icon-only switches missing `iconDescription`.** Without `iconDescription`, screen readers announce nothing meaningful. Wrapper enforces `iconDescription` is required when `text` is empty (lint rule, not type-system).
7. **Forgetting to disable arrow-key navigation when nested in Tabs.** Both Carbon `<Tabs>` and `<ContentSwitcher>` use arrow keys; nested usage causes key conflicts. Don't nest unless `selectiveMode="manual"` on the inner switcher.

## Out of scope for Phase 9.1

- **`<ContentSwitcherSkeleton>`** — Argos has no async-loaded segmented surfaces today; reserved.
- **Vertical orientation** — Carbon does not ship vertical; not requested.
- **Badge-on-segment** (count chips) — would need a Carbon extension; defer until AGENTS surfaces request a count badge per filter.

## Authority citations

- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ContentSwitcher/ContentSwitcher.svelte>
- Carbon Svelte component: <https://svelte.carbondesignsystem.com/?path=/docs/components-contentswitcher--default>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/content-switcher/_content-switcher.scss`
- Carbon usage mdx: `docs/carbon-website/src/pages/components/ContentSwitcher/usage.mdx`
- Argos bespoke surfaces: see "Surface inventory" table above (~5-7 call sites)
