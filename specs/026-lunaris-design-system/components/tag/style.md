# Tag — Style

**Status:** Phase 9.1 — implementation prep
**Last updated:** 2026-05-04
**Authority precedence:** Carbon source SCSS > Carbon site mdx > Lunaris CSS overlay
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tag/Tag.svelte>

---

## Canonical anatomy citations

From `docs/carbon-design-system/packages/styles/scss/components/tag/_tag.scss`:

```scss
.#{$prefix}--tag {
	display: inline-flex;
	align-items: center;
	min-block-size: 1.5rem; // 24px
	max-inline-size: 100%;
	padding: 0 $spacing-04; // 0 8px
	@include type-style('label-01');
	border-radius: 0.9375rem; // 15px (pill shape)
	background-color: $tag-background;
	color: $tag-color;
}

.#{$prefix}--tag--sm {
	min-block-size: 1.125rem; // 18px
	padding: 0 $spacing-03; // 0 4px
}

.#{$prefix}--tag--filter {
	padding-inline-end: 0;
}

.#{$prefix}--tag--filter .#{$prefix}--tag__close-icon {
	border-radius: 50%;
	margin-inline-start: $spacing-02; // 2px
}
```

Key shape:

- **Pill (15 px border-radius)** — fully rounded ends; Lunaris keeps the pill shape.
- **24 px default block-size, 18 px small.**
- **Inline-flex** — leading icon + label + (optional) filter X all on one line.
- **`label-01` typography** — Carbon's small-bold-uppercase; Argos remaps to Geist Mono UPPERCASE for tactical surfaces.
- **Per-`kind` background + foreground** color pairs from Carbon's tag-tokens table.

---

## Lunaris token map

Carbon ships 12 `kind` color pairs. Lunaris remaps each to dark-mode-appropriate values:

| `kind`          | Carbon `$tag-background-{kind}` | Carbon `$tag-color-{kind}`   | Lunaris bg                                 | Lunaris fg                                   |
| --------------- | ------------------------------- | ---------------------------- | ------------------------------------------ | -------------------------------------------- |
| `red`           | red-80                          | red-30                       | `var(--mk2-red-bg)` (#3a1d18)              | `var(--mk2-red-fg)` (#ffaa9c)                |
| `magenta`       | magenta-80                      | magenta-30                   | `#3d1632`                                  | `#ffa3d1`                                    |
| `purple`        | purple-80                       | purple-30                    | `#321b4f`                                  | `#bda4ff`                                    |
| `blue`          | blue-80                         | blue-30                      | `var(--accent-bg)` (steel blue 25% darken) | `var(--accent)` (#A8B8E0)                    |
| `cyan`          | cyan-80                         | cyan-30                      | `#0d2a3d`                                  | `#82cfff`                                    |
| `teal`          | teal-80                         | teal-30                      | `#0a2a2c`                                  | `#3ddbd9`                                    |
| `green`         | green-80                        | green-30                     | `var(--mk2-green-bg)` (#0d2418)            | `var(--mk2-green-fg)` (#8BBFA0)              |
| `gray`          | gray-80                         | gray-30                      | `var(--bg-2)`                              | `var(--ink-2)`                               |
| `cool-gray`     | cool-gray-80                    | cool-gray-30                 | `#262932`                                  | `#c1c7d0`                                    |
| `warm-gray`     | warm-gray-80                    | warm-gray-30                 | `#2a2725`                                  | `var(--mk2-amber-fg)` (#D4A054)              |
| `high-contrast` | gray-90 (ink)                   | gray-10                      | `var(--ink)`                               | `var(--bg)` (subtractive)                    |
| `outline`       | transparent                     | gray-30 + 1px gray-50 border | transparent                                | `var(--ink-2)` + 1 px `var(--border)` border |

Type-style:

| Carbon     | Lunaris                                                                | Notes                                                          |
| ---------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| `label-01` | `var(--mk2-fs-3) / 1.4 var(--mk2-f-mono)` UPPERCASE letter-spacing 1.0 | Geist Mono 12 px (Argos default), UPPERCASE for tactical chips |

Focus ring on interactive/filter tag: `$focus` → `var(--accent)` (2 px outside).

---

## Sizing

| `size`    | Block size | Padding (inline) | Padding (block)                | Filter X size                 |
| --------- | ---------- | ---------------- | ------------------------------ | ----------------------------- |
| `default` | 24 px      | 8 px             | 0 (centered by min-block-size) | 16 px button (full-bleed end) |
| `sm`      | 18 px      | 4 px             | 0                              | 12 px button                  |

Tag-to-tag gap in a row: 4 px (Lunaris default). In KISMET filter-chip rows: 8 px.

---

## Per-kind state matrix

For interactive/filter tags only:

| `kind`          | Default bg            | Hover bg                                | Focus outline        | Disabled bg/fg |
| --------------- | --------------------- | --------------------------------------- | -------------------- | -------------- |
| `red`           | `#3a1d18`             | `#4a2a23`                               | 2 px `var(--accent)` | opacity 0.5    |
| `blue`          | `var(--accent-bg)`    | `var(--accent-bg-hover)`                | 2 px `var(--accent)` | opacity 0.5    |
| `cyan`          | `#0d2a3d`             | `#15394f`                               | 2 px `var(--accent)` | opacity 0.5    |
| `green`         | `var(--mk2-green-bg)` | `var(--mk2-green-bg-hover)`             | 2 px `var(--accent)` | opacity 0.5    |
| `gray`          | `var(--bg-2)`         | `var(--card-hover)`                     | 2 px `var(--accent)` | opacity 0.5    |
| `high-contrast` | `var(--ink)`          | `var(--ink-2)` (subtractive lightening) | 2 px `var(--accent)` | opacity 0.5    |
| `outline`       | transparent           | `var(--card-hover)`                     | 2 px `var(--accent)` | opacity 0.5    |

Non-interactive tags have no hover/focus/disabled states.

---

## Filter X close icon

When `filter={true}`:

- Renders as a small `<button>` button-shape inside the tag, end-block-end.
- 16 px circle (default size) / 12 px (sm).
- Background transparent; on hover: 50% alpha overlay of the tag's bg-darken color.
- Icon: `<Close>` from `carbon-icons-svelte` at 12 px.
- `aria-label="Clear filter, [tag label]"` set by Carbon.

Click fires the `close` callback; parent removes the tag from its array.

---

## Interactive vs filter vs default

| Variant                    | DOM                                           | Has tab-stop | Has hover state | Has focus ring |
| -------------------------- | --------------------------------------------- | ------------ | --------------- | -------------- |
| `<Tag>` (default)          | `<span>`                                      | No           | No              | No             |
| `<Tag filter>`             | `<span>` containing inner `<button>` (X)      | Yes (the X)  | On X only       | On X only      |
| `<Tag interactive>`        | `<button>` (whole tag)                        | Yes          | Yes (whole tag) | Yes            |
| `<Tag interactive filter>` | `<button>` (whole tag) + inner `<button>` (X) | Yes (both)   | Yes             | Yes            |

---

## What Argos does NOT inherit from Carbon

- **Light theme** — Argos is dark-mode only; no `--g10` overrides.
- **Custom kind values** — locked to the 12 Carbon kinds; surfaces must pick.
- **Wrapping behavior** — Carbon's `white-space: nowrap` is preserved; long labels truncate with `text-overflow: ellipsis`.
- **`<TagSkeleton>` styling** — deferred.

---

## State matrix summary

| State                         | Default bg                | Default fg           | Border                         | Notes                              |
| ----------------------------- | ------------------------- | -------------------- | ------------------------------ | ---------------------------------- |
| Default (per kind)            | per kind-table above      | per kind-table above | none (or 1 px for `outline`)   |                                    |
| Hover (interactive/filter)    | bg-hover                  | unchanged            | unchanged                      |                                    |
| Focus (interactive/filter)    | unchanged                 | unchanged            | + 2 px `var(--accent)` outline |                                    |
| Disabled (interactive/filter) | unchanged                 | unchanged            | unchanged                      | + opacity 0.5; pointer-events none |
| Filter close hovered          | bg-hover-darken on X only | unchanged            | unchanged                      | X icon alpha increase              |

---

## Authority citations

- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/tag/_tag.scss`
- Carbon site mdx: `docs/carbon-website/src/pages/components/Tag/{usage,style,code,accessibility}.mdx`
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tag/Tag.svelte>
- Lunaris CSS custom properties: `src/app.css` (`:root` block)
- Argos status palette lockdown: `specs/026-lunaris-design-system/tokens.md`
- Theme overlay: `src/lib/styles/lunaris-carbon-theme.scss`
