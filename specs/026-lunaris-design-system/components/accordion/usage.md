# Accordion — Usage

**Status:** Phase 9.1 prep (drafted ahead of chassis implementation)
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/disclosure/Accordion.svelte`
**Carbon component:** `<Accordion>` + `<AccordionItem>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/Accordion.svelte>

---

## When to use

Vertical stack of expand/collapse sections grouping related items, where the user reveals only the section they care about right now. Examples in Argos: Workflows panel category groups (`RECON` / `GSM-SDR` / `BLUE-TEAM` / `POST-OPS` / `CUSTOM` / `ARCHIVED`), Tools flyout sub-categories, "Advanced Settings" disclosure on configuration screens, post-mission report section grouping.

## When NOT to use

- **Two-state inline reveal of a single block** → use a single `<AccordionItem>` standalone, OR a bespoke "show/hide" toggle if the item belongs to a different visual rhythm.
- **Mutually exclusive panels picked from a menu** → use `<Tabs>` (Phase 5, already shipped). Tabs swap content; Accordion stacks it.
- **Hierarchical nav tree** → use a tree component (deferred phase) or a flat list with category headings.
- **Modal / dialog content** → use `<Modal>` (Phase 4 shipped). Accordion does not own a backdrop.
- **One section that just needs a "more details" link** → use a simple `<details>` / `<summary>` HTML pair or a Lunaris bespoke disclosure if Carbon styling is over-kill.

## Carbon vs bespoke distinction

Per Carbon `accordion/usage.mdx`:

- **Default (single-select)** — only one `<AccordionItem>` open at a time. Opening a second auto-closes the first. NOT the Carbon default — Carbon ships _multi-select_ by default.
- **Multi-select (Carbon default)** — multiple items can be open simultaneously. User explicitly toggles each. This is Argos's preferred behavior for category groupings.
- **Skeleton** — `<AccordionSkeleton>` for async-loaded items; not used in Phase 9.1 (Workflows panel is synchronous).
- **Sizing** — Carbon ships `sm` / default / `xl`. Lunaris uses `sm` for tactical-density nav (Workflows panel) and default for prose-heavy disclosures.
- **Alignment** — `align="start"` puts the chevron on the leading edge; `align="end"` (Carbon default) puts it on the trailing edge. Argos uses `align="start"` for nav-style accordions to mirror tree-view expand affordance.

## Argos surface inventory (provisional)

Bespoke disclosure-stack sites Phase 9.1 retires by migrating to `<Accordion>`:

| Surface                     | File                                                        | Current pattern                                                   |
| --------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Workflows panel categories  | `src/lib/components/dashboard/panels/WorkflowsPanel.svelte` | bespoke `.cat` button + collapse with hand-rolled `aria-expanded` |
| Tools flyout sub-categories | `src/lib/components/dashboard/overlays/ToolsFlyout.svelte`  | bespoke nested-list expand/collapse                               |
| Advanced settings sections  | `src/lib/components/mk2/Tweaks.svelte`                      | bespoke `<details>` / `<summary>`                                 |
| Mission report sections     | `src/lib/components/dashboard/views/ReportsView.svelte`     | bespoke `.section-toggle` button group                            |

Total bespoke accordion sites: ~4-6. Migration order: Workflows panel (highest visibility, biggest payoff) → Tools flyout → ReportsView mission sections → Tweaks.

## Anatomy (per Carbon source)

From `_accordion.scss`:

1. **Outer `<ul class="bx--accordion">`** — container with optional `--start` (chevron-left) / `--xl` / `--sm` modifiers.
2. **Per-item `<li class="bx--accordion__item">`** — single section.
3. **Item heading button** — `<button class="bx--accordion__heading" aria-expanded="..." aria-controls="...">`. Holds the item title + chevron icon. The button is the keyboard-focusable element.
4. **`<div class="bx--accordion__content" role="region" aria-labelledby="...">`** — collapsible body. Carbon hides it via `display: none` when collapsed (NOT just `visibility: hidden`) so AT does not announce hidden content.
5. **Chevron icon** (`<ChevronRight>` / rotated 90° on open) — Carbon source uses Carbon's own chevron asset; default 16-px size. The chevron rotates via CSS transform with `motion(standard, productive)` 240 ms.
6. **Border** — 1-px `$border-subtle` between items. Last item retains the border.

## States to handle

- **Collapsed item (default)** — heading visible, body hidden via `display: none`.
- **Expanded item** — body slides open with chevron rotation. `aria-expanded="true"` on heading.
- **Hover (heading)** — slight bg lift on the heading button (`var(--bg-1)`).
- **Focus (heading)** — 2-px `var(--accent)` outline outside the heading button.
- **Disabled item** — heading visually muted, click + Space + Enter no-op, AT announces "disabled".
- **Empty body** — Carbon does not auto-handle; consumer renders empty state inside the body if appropriate.

## Spacing rhythm

Carbon's accordion uses 16-px block-padding heading (default) / 12-px (sm) / 24-px (xl). Body content respects the parent's 16-px inline padding by default. Lunaris adopts unchanged.

## Common pitfalls

1. **Confusing Accordion with Tabs.** Accordions stack; tabs swap. If your sections share a horizontal header, you want Tabs. If users want to read multiple sections without losing context, you want Accordion.
2. **Forcing single-select when Carbon defaults to multi-select.** Set `<Accordion>` `--single-select` modifier (no Carbon prop name; would need a wrapper-level prop OR client-side coordination). Argos's wrapper does NOT auto-enforce single-select; Workflows panel uses multi-select intentionally.
3. **Animating display-toggle.** Carbon uses `display: none` for collapse, which means CSS transitions on `height` don't work natively (display-none breaks transitions). Carbon DOES animate via `max-height` + `motion()`; do not override `display`.
4. **Per-item disabled in nested-tree contexts.** Disabled accordion items still occupy heading space — they don't visually shrink. If a category should disappear entirely (no items match filter), conditionally render the `<AccordionItem>` instead of disabling.
5. **Using accordion for content that should always be visible.** Critical info hidden inside a collapsed accordion is missed. Reserve accordions for nice-to-have / secondary info.
6. **Nesting accordions.** Carbon allows it but AT confusion is high — nested expand/collapse creates ambiguous keyboard semantics. Avoid > 1 level deep. ToolsFlyout's nested categories are 2 levels — verified manually by NVDA pass.
7. **`open` prop bidirectional binding.** Carbon `<AccordionItem open>` is settable but emits `change` events with `event.detail = { open: boolean }`. The wrapper exposes `open` as `$bindable()` so `bind:open` works.

## Out of scope for Phase 9.1

- **`<AccordionSkeleton>`** — synchronous Workflows / Tools data; reserved.
- **Drag-reorder accordion items** — would need a different primitive.
- **Async lazy-load body content** — Carbon does not own; consumer can lazy-render via `{#if open}`.

## Authority citations

- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/Accordion.svelte>
- Carbon Svelte `<AccordionItem>`: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/AccordionItem.svelte>
- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-accordion--default>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/accordion/_accordion.scss`
- Carbon usage mdx: `docs/carbon-website/src/pages/components/Accordion/usage.mdx`
- Argos bespoke surfaces: see "Surface inventory" table above (~4-6 call sites)
