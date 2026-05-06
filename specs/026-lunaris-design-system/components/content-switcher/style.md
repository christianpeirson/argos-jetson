# ContentSwitcher — Style

**Status:** Phase 9.1 PR — implementation in flight
**Last updated:** 2026-05-04
**Authority precedence:** Carbon source SCSS > Carbon site mdx > Lunaris CSS overlay
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ContentSwitcher/ContentSwitcher.svelte>

---

## Canonical anatomy citations

From `docs/carbon-design-system/packages/styles/scss/components/content-switcher/_content-switcher.scss`:

```scss
.#{$prefix}--content-switcher {
	display: flex;
	block-size: convert.to-rem(32px); // $spacing-07
	inline-size: 100%;
	user-select: none;
}

.#{$prefix}--content-switcher-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 1 1 0;
	background-color: $layer;
	color: $text-secondary;
	border-block-start: 1px solid $border-strong;
	border-block-end: 1px solid $border-strong;
	border-inline-end: 1px solid $border-strong;
	cursor: pointer;
	transition: background-color $duration-fast-02 motion(standard, productive);
}

.#{$prefix}--content-switcher-btn:first-of-type {
	border-inline-start: 1px solid $border-strong;
	border-start-start-radius: 1px;
	border-end-start-radius: 1px;
}

.#{$prefix}--content-switcher--selected {
	background-color: $layer-selected-inverse;
	color: $text-inverse;
	z-index: 1;
}
```

Key shape:

- **32 px default height** (`$spacing-07`). `sm` = 24 px, `xl` = 48 px.
- **Single 1-px border around the group**, vertical 1-px dividers between segments. Outer corners 1-px radius; inner segments square.
- **Selected segment is inverted** — bg becomes `$layer-selected-inverse`, fg becomes `$text-inverse`. No underline, no pill, no shadow.
- **Equal-width segments** via `flex: 1 1 0`. Carbon does not ship a content-fit mode; Lunaris does not override.
- **Hover** lifts `background-color` to `$layer-hover` on unselected only.

---

## Lunaris token map

| Carbon token                      | Lunaris value                             | Notes                                                               |
| --------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| `$layer` (segment bg, unselected) | `var(--bg-2)` (#1A1A1A)                   | Same as card surface — switcher sits flush on a panel               |
| `$layer-hover`                    | `var(--bg-3)` (#222)                      | Slight lift on hover-unselected                                     |
| `$layer-selected-inverse`         | `var(--ink)` (#E8E8E8)                    | Selected segment fill (inverted)                                    |
| `$text-secondary` (unselected fg) | `var(--ink-2)`                            | Slightly muted vs full ink — switcher labels are aux nav            |
| `$text-inverse` (selected fg)     | `var(--bg)` (#111111)                     | Inverse — page bg punched through selected fill                     |
| `$border-strong` (group border)   | `var(--ink-3)` 1 px                       | Higher contrast than `--border` for outline visibility              |
| `$focus` (focus ring)             | `var(--accent)`                           | 2-px outline outside segment, swappable per `data-accent`           |
| `$text-disabled`                  | `var(--ink-5)`                            | Most-muted ink                                                      |
| `body-compact-01` type-style      | `var(--mk2-fs-3) / 1.4 var(--mk2-f-mono)` | Geist Mono UPPERCASE for tactical surfaces; sans for prose contexts |

---

## Sizing per surface

Carbon ships three sizes via `size` prop: `"sm"` / undefined (default) / `"xl"`. Lunaris adopts all three.

| Argos surface                | Density | Carbon size | Height | Label text                                                 |
| ---------------------------- | ------- | ----------- | ------ | ---------------------------------------------------------- |
| SPECTRUM mode toggle         | compact | `"sm"`      | 24 px  | `code-compact-01` UPPER mono (PEAK / AVG / LIVE)           |
| AGENTS filter tabs           | normal  | default     | 32 px  | `body-compact-01` UPPER mono (ALL / ACTIVE / IDLE / DEAD)  |
| AGENTS view-mode toggle      | normal  | default     | 32 px  | icon-only — `iconDescription` for AT (GRID / LIST / SPLIT) |
| FilterBar quick-filter chips | compact | `"sm"`      | 24 px  | `code-compact-01` UPPER mono                               |
| ReportsView export-format    | normal  | default     | 32 px  | `body-compact-01` mixed-case (PDF / CSV / JSON)            |

Touch-target compliance is achieved at all sizes by full-width segment hitboxes — see `accessibility.md` for WCAG 2.5.8 reasoning.

---

## What Argos does NOT inherit from Carbon

- **Light variant** (`$layer-light`) — Argos is dark-mode only. The `light` prop is exposed for symmetry but unused.
- **`bx--content-switcher--with-icon-only` auto-shrink** — Carbon shrinks padding when all segments are icon-only. Lunaris keeps the wider padding for thumb-friendly touch on Jetson HDMI panels.
- **Custom `selectionColor`** — Carbon's stock theme allows a per-instance highlight color override; Lunaris drives selected color from `data-accent` palette swap globally instead.

---

## State matrix

Per Carbon `content-switcher/style.mdx` confirmed against source SCSS:

| State                  | Border (Lunaris)                                      | Fill (Lunaris)             | Label color    |
| ---------------------- | ----------------------------------------------------- | -------------------------- | -------------- |
| Default unselected     | `var(--ink-3)` 1 px (group)                           | `var(--bg-2)`              | `var(--ink-2)` |
| Hover unselected       | unchanged                                             | `var(--bg-3)`              | `var(--ink)`   |
| Selected               | unchanged (group)                                     | `var(--ink)`               | `var(--bg)`    |
| Focus (any)            | + 2-px ring `var(--accent)` outside segment           | unchanged                  | unchanged      |
| Disabled (whole)       | `var(--ink-5)` 1 px                                   | `var(--bg-2)` 50 % opacity | `var(--ink-5)` |
| Disabled (one segment) | `var(--ink-5)` 1 px                                   | `var(--bg-2)` 50 % opacity | `var(--ink-5)` |
| Invalid                | n/a — ContentSwitcher has no invalid state per Carbon | n/a                        | n/a            |

---

## Argos-bespoke `data-accent` palette behavior

The 13 MIL-STD accent palettes (steel-blue default, plus 12 alternates) flow through `var(--accent)` automatically. The selected-segment fill stays `var(--ink)` regardless of accent — selected fill is achromatic by design so the active segment is unambiguous on every palette. Focus-ring color tracks `var(--accent)` per palette swap.

If a future surface needs a chromatic selected-segment fill (e.g. status-driven where each segment maps to a kill-chain phase), use `<Tabs>` instead — segmented switchers shouldn't carry semantic color.

---

## Authority citations

- Carbon Svelte source (v0.107.0): <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ContentSwitcher/ContentSwitcher.svelte>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/content-switcher/_content-switcher.scss`
- Carbon site mdx: `docs/carbon-website/src/pages/components/ContentSwitcher/{usage,style,code,accessibility}.mdx`
- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-contentswitcher--default>
- Lunaris CSS custom properties: `src/app.css` (`:root` block)
- Theme overlay: `src/lib/styles/lunaris-carbon-theme.scss`
