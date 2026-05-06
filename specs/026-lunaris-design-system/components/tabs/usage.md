# Tabs — Usage

**Status:** Phase 5 — shipped (DeviceSubTabs canary, single phase-close PR)
**Last updated:** 2026-04-30
**Implementation files:** `src/lib/components/chassis/forms/Tabs.svelte`, `src/lib/components/chassis/forms/TabsSkeleton.svelte`
**Carbon component:** `<Tabs>` / `<Tab>` / `<TabsSkeleton>` from `carbon-components-svelte` v0.107.0+

---

## When to use

Switch between 2-7 mutually exclusive views of the **same scope** without leaving the current page. Examples in Argos: device-class sub-views inside the dashboard panel (BLE / BT-Classic / Wi-Fi APs / Wi-Fi Clients / GSM / Cellular), HackRF mode sub-views inside the spectrum control surface (sweep / waterfall / IQ), report category filters (PDF / JSON / CoT) inside a single dashboard panel.

The user's mental model must be "one panel, several lenses" — not "several pages." Each tab's content shares the panel's surrounding chrome (header, controls bar, status footer); only the body region swaps.

## When NOT to use

- **Top-level page navigation** → use the icon rail + page routing. Tabs do not belong in the 48 px rail.
- **Sequential workflow steps** → use `<ProgressIndicator>` (linear, ordered, completable).
- **Crumb-style location trail** → use `<Breadcrumb>` (parent-child, navigable up).
- **More than ~7 peers** → tabs become a horizontal scroll list which is hostile to keyboard + screen readers; use a vertical side nav or a `<Dropdown>`-controlled view selector instead.
- **Per-tab close affordance** (terminal-tab pattern) → Carbon `<Tabs>` is forbidden because nesting a `<button>` close-X inside `role="tab"` violates ARIA APG composition rules. See `accessibility.md` "common pitfalls" for the Argos-specific consequence (TerminalTabBar deferred to a future EditorTabBar chassis category).

## Argos surface inventory (Phase 5)

| File                                                               | Site count | Tab cohort                                                              | Migration PR         |
| ------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------- | -------------------- |
| `src/lib/components/dashboard/panels/devices/DeviceSubTabs.svelte` | 1          | 6 device classes with live count badges + warning state for stale items | **Phase 5 (PR #93)** |

**Total Tabs cohort: 1 file / 1 site shipped.** Phase 1 audit found no other consumer sites that fit Carbon Tabs cleanly — the codebase has zero shadcn-svelte tabs imports, zero bits-ui Tabs imports, and the remaining tab-shaped patterns (TerminalTabBar, ToolsFlyout pillar nav) are deferred (see below). Future tab use cases will adopt the chassis directly.

### Deferred (NOT migrated to Carbon Tabs)

| File                                                         | Reason                                                                                                                                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/components/dashboard/TerminalTabBar.svelte`         | Per-tab close-X buttons nested inside `role="tab"` are forbidden by ARIA APG. Needs a dedicated `EditorTabBar` chassis category with composite-widget pattern. Sub-phase deferred. |
| `src/lib/components/chassis/ToolsFlyout.svelte` (pillar nav) | Bespoke focus trap + arrow-key pillar nav + kbd-hint footer; needs careful Carbon Modal integration. Already deferred to Phase 4 follow-up sub-phase D.                            |

### Decision rule applied

- Static or count-badged peer views, no per-tab affordances → `<Tabs>` (this spec).
- Per-tab close / rename / drag → defer to future `EditorTabBar` chassis category (composite widget per ARIA APG).

## Pattern variants

Carbon ships two visual variants:

- **`type="default"`** — minimal underline beneath the active tab; no surrounding container fill. Use when the tabs sit directly above panel content and the surrounding card/panel chrome already provides the visual frame. Argos default — used by DeviceSubTabs.
- **`type="container"`** — filled tab strip with a card-like background that extends from tab to content. Use when tabs sit on bare canvas (no parent card) and need to define their own surface.

`autoWidth={true}` lets each tab size to its label (recommended when labels vary in length, e.g. "BLE" vs "Wi-Fi Clients"). `fullWidth={true}` distributes available width evenly (use only when tab count is fixed and small).

## States to handle

- **Empty (no tabs)**: don't render — caller should suppress the `<Tabs>` wrapper if `tabs.length === 0`.
- **Default (one selected)**: chassis preselects `tabs[0]` if `selectedId` is unbound.
- **Active**: Carbon paints the underline + accent text on the selected tab.
- **Disabled (per tab)**: pass `disabled: true` on the `TabDef`; Carbon greys + skips on arrow-key navigation.
- **Warning (per tab — Argos-specific)**: pass `hasItems: true` to apply `lunaris-has-items` class — colors the inactive label with `--warning` to flag stale data while keeping the underline color intact when active.
- **Loading**: render `<TabsSkeleton count={4} />` instead of `<Tabs>` until the tab definitions are known.
- **Disconnected**: caller decides — usually swap the body content for a connection-error state while leaving the tabs themselves interactive.

## Headless content pattern

The chassis intentionally omits Carbon's `<TabContent>` slots. The caller manages content based on `selectedId`:

```svelte
<Tabs {tabs} bind:selectedId />
{#if selectedId === 'ble'}
	<BlePanel />
{:else if selectedId === 'bt'}
	<BtPanel />
{/if}
```

This avoids forcing every consumer to mount all panels at once (Carbon's `<TabContent>` keeps each in the DOM with `hidden={!selected}`, costing memory on heavy panels). See `code.md` for the rationale + alternatives.

## Out of scope for Phase 4

- Vertical tabs — Carbon Svelte ships horizontal only; vertical orientation deferred until a real Argos surface needs it.
- Lazy-rendered `<TabContent>` slot wiring — caller handles content show/hide because Argos panels are heavy (maps, spectrum canvases) and we do not want to keep them all mounted.
- Drag-to-reorder, context menus, per-tab close — see deferred TerminalTabBar above.

## Authority citations

- Carbon Svelte component: <https://svelte.carbondesignsystem.com/?path=/docs/components-tabs--default>
- Carbon source SCSS: `node_modules/@carbon/styles/scss/components/tabs/_tabs.scss`
- Carbon usage mdx: `docs/carbon-website/src/pages/components/tabs/usage.mdx`
- Carbon a11y pattern: ARIA APG Tabs (W3C) — <https://www.w3.org/WAI/ARIA/apg/patterns/tabs/>
- Argos surfaces: see "Surface inventory" table above
