# Loading — Style

This document maps Carbon Loading's visual treatment to Lunaris tokens. Per spec-026 authority precedence (`authorities.md`), **Carbon source SCSS wins** when source disagrees with site docs.

## Carbon source-of-truth files

| File                                                                                                        | Purpose                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Loading/Loading.svelte` | Component template + class authority (`bx--loading`, `bx--loading-overlay`, `bx--loading--small`, `bx--loading--stop`, `bx--loading__svg`, `bx--loading__background`, `bx--loading__stroke`) |
| `node_modules/@carbon/styles/scss/components/loading/_loading.scss`                                         | SCSS rules + token consumption (spinner color, size, animation timing)                                                                                                                       |

## Anatomy

Carbon's Loading renders this structure (`Loading.svelte:17-76`):

```
{#if withOverlay}
  <div class="bx--loading-overlay [bx--loading-overlay--stop]">
    <div class="bx--loading [bx--loading--small] [bx--loading--stop]"
         aria-atomic="true" aria-live="assertive|off">
      <svg class="bx--loading__svg">
        <title>{description}</title>
        [<circle class="bx--loading__background" /> when small]
        <circle class="bx--loading__stroke" />
      </svg>
    </div>
  </div>
{:else}
  <div class="bx--loading [bx--loading--small] [bx--loading--stop]"
       aria-atomic="true" aria-live="assertive|off">
    <svg class="bx--loading__svg">…</svg>
  </div>
{/if}
```

The Lunaris wrapper introduces no extra DOM — direct passthrough.

## Token mapping (Carbon → Lunaris)

These overrides live in `src/lib/styles/lunaris-carbon-theme.scss`. Token additions are deferred to whichever PR's chrome-devtools visual diff first exposes drift; do not edit the theme file unless the diff fails.

| Carbon token      | Lunaris value                             | Used by                          | Citation        |
| ----------------- | ----------------------------------------- | -------------------------------- | --------------- |
| `$interactive`    | `var(--accent)`                           | Active spinner stroke color      | `_loading.scss` |
| `$icon-secondary` | `var(--ink-3)`                            | Background ring (small variant)  | `_loading.scss` |
| `$overlay`        | `rgba(0, 0, 0, 0.5)` (Lunaris dark scrim) | `bx--loading-overlay` background | `_loading.scss` |

## Typography

Loading carries no visible text (the `description` prop becomes the SVG `<title>` for screen readers, not visible). No font-family rule applies.

## Sizing / variants

Carbon offers two sizes:

| Argos `small` prop | Carbon class         | Spinner radius                               |
| ------------------ | -------------------- | -------------------------------------------- |
| `false` (default)  | `bx--loading`        | 44 (large, ~44px diameter)                   |
| `true`             | `bx--loading--small` | 42 + background ring (small, ~24px diameter) |

Two render modes:

| Argos `withOverlay` prop | Carbon class          | UX                                                             |
| ------------------------ | --------------------- | -------------------------------------------------------------- |
| `true` (default)         | `bx--loading-overlay` | Semi-transparent backdrop blocks interaction; spinner centered |
| `false`                  | (no overlay div)      | Inline spinner only; flex flow respects parent layout          |

## What the wrapper adds

- `description` default of `'Loading'` (capitalized) instead of Carbon's `'loading'`. Argos UX consistency.
- TypeScript `Props` interface with explicit `class?: string` for custom styling hooks.
- Nothing else — Loading has no events to bridge, no slot to forward.

## Visual diff procedure

1. Pre-merge: chrome-devtools MCP `take_screenshot` of any consumer migration site (none in Phase 6 — first consumer adoption will trigger this).
2. Apply the wrapper.
3. Post-merge: same screenshot, same isolated context.
4. Compare. Drift > 1 pixel on any axis OR > 0.5 luma on color sample = fail; extend `lunaris-carbon-theme.scss` with the missing override and re-test.
