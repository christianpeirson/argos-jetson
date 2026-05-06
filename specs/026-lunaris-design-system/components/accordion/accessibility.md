# Accordion — Accessibility

**Status:** Phase 9.1 PR — implementation in flight
**Last updated:** 2026-05-04
**Carbon mirror:** `docs/carbon-website/src/pages/components/Accordion/accessibility.mdx`
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/Accordion.svelte>

---

## What Carbon provides for free

Per Carbon Accordion source confirms (ARIA Authoring Practices "accordion" pattern):

### Semantic structure

- Outer `<ul class="bx--accordion">` carries no implicit ARIA role; the `<ul>` element provides "list" semantics. AT announces "list, [N] items" — semantically correct since each item is an independent disclosure.
- Each `<AccordionItem>` renders `<li>` containing a `<button class="bx--accordion__heading" aria-expanded="..." aria-controls="...">` and a `<div class="bx--accordion__content" role="region" aria-labelledby="...">`.
- Heading button is the keyboard-focusable element. The body region is NOT focusable by default (it's read-only content); focusable children inside the body get their own tab-stops.
- `id` defaults to `ccs-${random}`; per-item heading and body ids derive uniquely.

### ARIA wiring (verified in Carbon source)

- **`aria-expanded`** on each heading button — `"true"` when open, `"false"` when collapsed. AT announces "expanded" / "collapsed" on focus + on toggle.
- **`aria-controls`** on each heading button — points to the body region's `id`. AT can navigate to the linked region.
- **`role="region"`** on each body — gives the body landmark-like semantics. AT can navigate by region.
- **`aria-labelledby`** on each body region — points back to the heading's id, so the body is announced with its title context.
- **`disabled`** on the heading button — HTML attribute; AT auto-announces "disabled"; browser removes from tab order.
- **`iconDescription`** on the chevron — provides AT name for the icon ("Expand/Collapse" by default). When the surrounding heading text is sufficient context, the icon description is decorative-equivalent and can be left as default.

### Keyboard interaction

| Key           | Behavior                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab           | Move focus into accordion (lands on first heading button). Tab again moves through subsequent heading buttons + any focusable children inside open bodies.      |
| Shift+Tab     | Move focus backward.                                                                                                                                            |
| Space / Enter | Toggle the focused heading's expand state (open ↔ closed).                                                                                                     |
| Up / Down     | Carbon does NOT ship arrow-key cycling between heading buttons; the W3C accordion APG treats arrow keys as optional. AT users use Tab to move between headings. |
| Home / End    | Carbon does NOT ship Home/End; APG considers them optional.                                                                                                     |

### Color contrast (Carbon's audit floor)

Carbon's stock theme passes WCAG 2.1 AA. Lunaris token overrides MUST preserve those ratios.

| Pair                                        | Min contrast (AA) | Lunaris target                                   | Status                                                                                                     |
| ------------------------------------------- | ----------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Heading text (collapsed) on `--bg`          | 4.5:1             | `var(--ink-2)` on `var(--bg)`                    | ≈ 11.4:1 ✓                                                                                                 |
| Heading text (expanded) on `--bg`           | 4.5:1             | `var(--ink)` on `var(--bg)`                      | ≈ 14.6:1 ✓                                                                                                 |
| Item separator (`$border-subtle`) on `--bg` | 3:1 (graphical)   | `var(--border)` on `var(--bg)`                   | ≈ 1.6:1 ⚠ — non-decorative below threshold; mitigated by heading text spacing + chevron rotation, AT-safe |
| Chevron icon (`$icon-primary`) on `--bg`    | 3:1 (graphical)   | `var(--ink-2)` on `var(--bg)`                    | ≈ 11.4:1 ✓                                                                                                 |
| Hover bg (`$layer-hover`) on `--bg`         | 3:1 (graphical)   | `var(--bg-1)` on `var(--bg)`                     | ≈ 1.4:1 ⚠ — hover lift is non-load-bearing affordance, AT-safe                                            |
| Focus outline (`$focus`) on any background  | 3:1 (graphical)   | `var(--accent)` on `var(--bg)` and `var(--bg-1)` | ≈ 7.4:1 ✓                                                                                                  |
| Disabled heading text                       | 3:1 (graphical)   | `var(--ink-5)` on `var(--bg)`                    | ≈ 1.7:1 ⚠ — expected for disabled, AT auto-announces                                                      |

**Three amber items, all Carbon-conformant patterns:**

1. Item separator below 3:1 — Carbon ships this; visual rhythm + heading text spacing compensate. AT users do not consume the separator.
2. Hover bg below 3:1 — affordance, not state-of-truth. Disclosure state is announced by `aria-expanded`.
3. Disabled below 3:1 — non-interactive, AT-announced.

---

## Argos-specific a11y considerations

### Tap target compliance (WCAG 2.2 SC 2.5.8)

Heading buttons are full-width by default (`inline-size: 100%`). Effective tap target is the heading's full rendered width × height:

| Surface              | Carbon size | Heading height | Heading width         | WCAG 2.5.8 (24 px) |
| -------------------- | ----------- | -------------- | --------------------- | ------------------ |
| Workflows panel      | sm          | 32 px          | full panel (~280 px)  | ✓ pass             |
| Tools flyout         | sm          | 32 px          | full flyout (~240 px) | ✓ pass             |
| Tweaks settings      | default     | 40 px          | full panel            | ✓ pass             |
| ReportsView sections | default     | 40 px          | full modal (~600 px)  | ✓ pass             |

WCAG 2.1 SC 2.5.5 (44 × 44 px AAA) is satisfied at default size only; sm size (32 px) does not. Documented Argos-wide deviation from AAA in Phase 7 audit.

### `display: none` for collapsed bodies

Carbon uses `display: none` (NOT `visibility: hidden` or `opacity: 0`) for collapsed bodies. AT correctly does NOT announce hidden content — the body region is removed from the accessibility tree until expanded. This matches the W3C APG accordion pattern.

This means:

1. **Collapsed body content is NOT searchable by AT in-document search.** Users must expand the matching item to find its content. Acceptable for nice-to-have / secondary content; not acceptable for critical info — keep critical info always-visible.
2. **`{#if open}`-style lazy rendering inside the body is OK** — even though Carbon already hides via `display: none`, lazy-rendering further reduces DOM weight and avoids running effect hooks on hidden content.

### Nested accordion AT behavior

ToolsFlyout uses 2-level nested accordions (sub-categories inside categories). AT users hear:

1. Outer heading: "RADIO TOOLS, button, expanded" → Tab into body.
2. Inner heading: "SDR PROBES, button, collapsed" → Space to expand.
3. Inner body items: tab through.
4. Tab continues to next inner heading: "SDR ANALYSIS, button, collapsed".
5. Tab past last inner heading: returns to outer-level next heading.

Manual NVDA + VoiceOver pass on Workflows + Tools flyout confirmed unambiguous at 2 levels. 3+ levels would muddle "where am I in the disclosure tree" — avoid until a real consumer needs it AND AT pass clears.

### Active-item announcement (nav-style accordions)

Workflows / Tools accordions emphasise the "currently active" workflow category with a `class="active"` leading-border treatment. This is a _visual_ affordance only — `aria-current` is NOT auto-set by Carbon, and the wrapper does not auto-set it.

For full AT parity with sighted "you're here" affordance, consumers SHOULD set `aria-current="true"` on the matching `<AccordionItem>` heading via class spread, OR pass `aria-current` through the wrapper's class/attribute spread. Phase 9.1 wraps this as a follow-up `aria-current` prop on `<AccordionItem>` if Phase 7 audit flags it.

### Disabled item announcement

Disabled items emit `disabled` HTML attribute on the heading button → AT announces "disabled". Visual style mutes text and chevron. Click + Space + Enter no-op. Disabled items DO occupy heading space in the visual layout — they don't visually shrink. If a category should disappear entirely (e.g. "no archived workflows match filter"), conditionally render the `<AccordionItem>` instead of disabling.

### Reduced motion

Carbon uses `motion(standard, productive)` 110 ms for the chevron rotate + body padding transition. Lunaris does not override; users with `prefers-reduced-motion: reduce` get instant transitions because Carbon's motion mixin respects the media query at the token layer.

---

## Verification checklist (Phase 9.1)

| Check                                 | Tool                                  | Pass criterion                                                            |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------- | --------------------------- |
| WCAG 2.1 AA on each migrated surface  | `@axe-core/playwright` (`AxeBuilder`) | `violations: []` with `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` |
| `aria-expanded` correctness           | Playwright DOM probe                  | All headings carry `aria-expanded="true                                   | false"` matching open state |
| `aria-controls` linkage               | Playwright DOM probe                  | `aria-controls` ids match body region ids                                 |
| `role="region"` + `aria-labelledby`   | Playwright DOM probe                  | All bodies carry both, body labelled by heading                           |
| Tab order                             | Playwright keyboard nav               | Tab cycles through heading buttons + open-body focusable children         |
| Space / Enter toggle                  | Playwright keyboard test              | Space and Enter on focused heading toggle expand state                    |
| Focus ring visible                    | manual + Playwright `:focus` check    | 2-px outline visible at all densities + accents                           |
| Color contrast (heading text)         | chrome-devtools MCP + axe             | Collapsed ≥ 4.5:1, Expanded ≥ 4.5:1                                       |
| Color contrast (focus ring, chevron)  | chrome-devtools MCP                   | Focus ≥ 3:1, Chevron ≥ 3:1                                                |
| Collapsed body removal from AT tree   | manual NVDA / VoiceOver pass          | Collapsed body content not announced when traversing document             |
| Nested accordion AT pass              | manual NVDA / VoiceOver pass          | Tools flyout 2-level nesting unambiguous                                  |
| Disabled item announcement            | axe + manual                          | Disabled headings announce "disabled", skipped in tab order               |
| Active-item `aria-current` (if added) | axe + manual                          | Active heading announces "current page" when `aria-current` is wired      |

Phase 7 includes the full WCAG 2.1 AA audit for all migrated disclosure surfaces.

---

## Authority citations

- Carbon Svelte source (v0.107.0): <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/Accordion.svelte>
- Carbon Accordion a11y mdx: `docs/carbon-website/src/pages/components/Accordion/accessibility.mdx`
- Carbon Accordion SCSS: `docs/carbon-design-system/packages/styles/scss/components/accordion/_accordion.scss`
- WCAG 2.1: <https://www.w3.org/TR/WCAG21/>
- WCAG 2.2 SC 2.5.8 Target Size (Minimum): <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- ARIA Authoring Practices for accordion: <https://www.w3.org/WAI/ARIA/apg/patterns/accordion/>
- axe-core rule reference: <https://dequeuniversity.com/rules/axe/4.9/>
