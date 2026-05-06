# Tile — Style

**Status:** Phase 9.1 — implementation prep
**Last updated:** 2026-05-04
**Authority precedence:** Carbon source SCSS > Carbon site mdx > Lunaris CSS overlay
**Carbon sources:**

- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/Tile.svelte>
- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/ClickableTile.svelte>

---

## Canonical anatomy citations

From `docs/carbon-design-system/packages/styles/scss/components/tile/_tile.scss`:

```scss
.#{$prefix}--tile {
	position: relative;
	min-block-size: $spacing-09; // 48px
	padding: $spacing-05; // 16px all sides
	background-color: $layer;
	outline: 2px solid transparent;
	outline-offset: -2px;
}

.#{$prefix}--tile--clickable:hover {
	background-color: $layer-hover;
	cursor: pointer;
}

.#{$prefix}--tile--clickable:focus {
	outline-color: $focus;
}

.#{$prefix}--tile--clickable:active {
	background-color: $layer-active;
}

.#{$prefix}--tile-content__above-the-fold {
	display: block;
}
```

Key shape:

- **16 px padding all sides**, min-block-size 48 px (`$spacing-09`).
- **Background is `$layer`** (one shade above page); no border by default — visual separation is via background contrast.
- **Focus ring is `outline: 2 px solid $focus`** with `outline-offset: -2 px` (inset). NOT outside the tile.
- **`<ClickableTile>` adds**: hover background swap to `$layer-hover`, active to `$layer-active`, cursor pointer, chevron icon at end-block-end corner.
- **No border-radius** — square corners; matches Carbon's geometric aesthetic.

---

## Lunaris token map

| Carbon token                                    | Lunaris value                             | Notes                                                             |
| ----------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| `$layer` (tile bg)                              | `var(--card)` (#1A1A1A)                   | Card surface — one shade above `--background`                     |
| `$layer-hover` (clickable hover)                | `var(--card-hover)`                       | ~5% lighten of `--card`                                           |
| `$layer-active` (clickable active)              | `var(--card-active)`                      | ~10% darken of `--card`                                           |
| `$layer-selected` (unused — selectable tile)    | `var(--card-selected)`                    | Reserved for future SelectableTile                                |
| `$border-tile` (Argos addition — NOT in Carbon) | `var(--border)` (#2E2E2E)                 | Argos adds 1 px border to differentiate from page bg in dark mode |
| `$focus` (focus ring)                           | `var(--accent)`                           | 2 px inset outline                                                |
| `$icon-primary` (chevron)                       | `var(--ink-3)` → `var(--accent)` on hover | Chevron color brightens on hover                                  |
| `$text-primary` (tile content)                  | `var(--ink)`                              | Bright text for primary content                                   |
| `$text-secondary` (tile metadata)               | `var(--ink-2)`                            | Muted for secondary lines                                         |

**Lunaris addition**: Argos overlay adds a 1 px `var(--border)` border to all tiles. Carbon's stock theme relies on background contrast alone, but in Argos's near-black palette (`--background` #111 vs `--card` #1A) the contrast (≈1.3:1) is below the 3:1 graphical floor; the border restores visual separation.

---

## Sizing

Carbon does NOT ship a size axis for `<Tile>` / `<ClickableTile>`. All tiles share the 16 px padding + 48 px min-block-size baseline; height is driven by content.

| Argos surface             | Min block size | Padding | Notes                                                         |
| ------------------------- | -------------- | ------- | ------------------------------------------------------------- |
| Mission Control stat tile | 96 px          | 16 px   | Fixed-height row; content includes icon + label + ProgressBar |
| AGENTS session card       | auto (≈140 px) | 16 px   | Variable height; content drives                               |
| Workflows category card   | 120 px         | 24 px   | Lunaris-bespoke padding override for breathing room           |

---

## Hover + focus + active states

`<ClickableTile>` only:

| State              | Background                | Border                         | Chevron                | Outline                    |
| ------------------ | ------------------------- | ------------------------------ | ---------------------- | -------------------------- |
| Default            | `var(--card)`             | 1 px `var(--border)`           | `var(--ink-3)` (muted) | none                       |
| Hover              | `var(--card-hover)`       | 1 px `var(--ink-3)` (brighter) | `var(--accent)`        | none                       |
| Focus              | `var(--card)`             | 1 px `var(--border)`           | `var(--ink-3)`         | 2 px `var(--accent)` inset |
| Focus + hover      | `var(--card-hover)`       | 1 px `var(--ink-3)`            | `var(--accent)`        | 2 px `var(--accent)` inset |
| Active (mousedown) | `var(--card-active)`      | 1 px `var(--ink-3)`            | `var(--accent)`        | none                       |
| Disabled           | `var(--card)` opacity 0.5 | 1 px `var(--border)`           | hidden                 | none                       |

`<Tile>` (non-interactive) does NOT have hover/focus/active states.

---

## Chevron icon (ClickableTile only)

Carbon renders `<ArrowRight>` from `carbon-icons-svelte` at the end-block-end corner of `<ClickableTile>`. Default state is muted (`var(--ink-3)`); hover brightens to `var(--accent)`. Icon size: 16 px.

For RTL languages, Carbon uses logical properties (`inset-inline-end`) so the chevron auto-flips.

---

## Content composition

Tiles do NOT impose internal layout. Caller fills the tile body with arbitrary markup. Common Lunaris patterns:

- **Stat tile**: `<div class="stat-icon"> + <div class="stat-label"> + <div class="stat-value"> + <ProgressBar>`
- **Session card**: `<div class="card-header"> (title + Tag) + <div class="card-meta"> (key/value lines) + <div class="card-footer"> (timestamp)`
- **Category card**: `<icon> + <h3 class="cat-title"> + <div class="cat-count">N items</div>`

These layouts are surface-specific; the chassis exposes only the outer container.

---

## What Argos does NOT inherit from Carbon

- **Light theme** — Argos is dark-mode only; no `light={true}` overlay.
- **`<SelectableTile>` styling** — deferred.
- **`<RadioTile>` styling** — deferred.
- **`<ExpandableTile>` styling** — deferred.

---

## State matrix summary

| Variant                    | Has hover | Has focus | Has chevron | Tab-stop            |
| -------------------------- | --------- | --------- | ----------- | ------------------- |
| `<Tile>`                   | No        | No        | No          | No                  |
| `<ClickableTile href>`     | Yes       | Yes       | Yes         | Yes (as `<a>`)      |
| `<ClickableTile onclick>`  | Yes       | Yes       | Yes         | Yes (as `<button>`) |
| `<ClickableTile disabled>` | No        | No        | No          | No                  |

---

## Authority citations

- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/tile/_tile.scss`
- Carbon site mdx: `docs/carbon-website/src/pages/components/Tile/{usage,style,code,accessibility}.mdx`
- Carbon Svelte sources:
    - <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/Tile.svelte>
    - <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/ClickableTile.svelte>
- Lunaris CSS custom properties: `src/app.css` (`:root` block)
- Theme overlay: `src/lib/styles/lunaris-carbon-theme.scss`
