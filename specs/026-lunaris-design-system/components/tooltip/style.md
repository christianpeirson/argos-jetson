# Tooltip — Style

This document maps Carbon Tooltip's visual treatment to Lunaris tokens. Per spec-026 authority precedence (`authorities.md`), **Carbon source SCSS wins** when source disagrees with site docs.

## Carbon source-of-truth files

| File                                                                | Purpose                                                                                            |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `node_modules/carbon-components-svelte/src/Tooltip/Tooltip.svelte`  | Component template + class authority (`bx--tooltip__label`, `bx--tooltip__trigger`, `bx--tooltip`) |
| `node_modules/@carbon/styles/scss/components/tooltip/_tooltip.scss` | SCSS rules + token consumption (popover surface, arrow, transitions)                               |
| `node_modules/@carbon/styles/scss/components/popover/_popover.scss` | Carbon Tooltip is built on the popover primitive — popover SCSS owns position/arrow/elevation      |

Upstream source mirrored at `https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tooltip/Tooltip.svelte`.

## Anatomy

Carbon's Tooltip renders this structure (`Tooltip.svelte:1-180`):

```
<div class="bx--tooltip__label">
  <span>{triggerText}</span>
  <button class="bx--tooltip__trigger" aria-haspopup="true" aria-expanded={open} aria-describedby={tooltipId}>
    <Information class="bx--tooltip__icon" />  <!-- unless hideIcon=true -->
  </button>
</div>
<div id={tooltipId} class="bx--tooltip bx--tooltip--{direction} bx--tooltip--align-{align}" data-floating-menu-direction={direction}>
  <span class="bx--tooltip__caret"></span>
  <div class="bx--tooltip__content">
    <slot />
  </div>
</div>
```

The Lunaris wrapper introduces no extra DOM — it forwards directly into `CarbonTooltip` (`src/lib/components/chassis/forms/Tooltip.svelte:42`).

## Token mapping (Carbon → Lunaris)

These overrides live (or will live) in `src/lib/styles/lunaris-carbon-theme.scss`. **Token additions are deferred** until visual diff exposes drift.

| Carbon token            | Lunaris value   | Used by                                  | Citation                                      |
| ----------------------- | --------------- | ---------------------------------------- | --------------------------------------------- |
| `$background-inverse`   | `var(--bg-3)`   | Tooltip popover surface                  | `_tooltip.scss` `.bx--tooltip`                |
| `$text-inverse`         | `var(--ink)`    | Tooltip body text                        | `_tooltip.scss` `.bx--tooltip__content`       |
| `$background-inverse`   | `var(--bg-3)`   | Caret/arrow fill (matches surface)       | `_tooltip.scss` `.bx--tooltip__caret`         |
| `$icon-secondary`       | `var(--ink-3)`  | Default trigger icon (Information glyph) | `_tooltip.scss` `.bx--tooltip__icon`          |
| `$icon-primary` (hover) | `var(--ink)`    | Trigger icon hover state                 | `_tooltip.scss` `.bx--tooltip__trigger:hover` |
| `$focus`                | `var(--accent)` | Trigger button `:focus` outline          | shared with all interactive elements          |
| `$layer-01`             | `var(--bg-2)`   | Caption-style tooltip (less common)      | shared with low-contrast notification         |

## Typography

Carbon's tooltip body uses `$body-compact-01` (14 px / 18 px line-height / 400 weight). Trigger label text inherits parent font. Per CLAUDE.md typography rules, **tooltip body text is UI chrome** (helper info, not data) → Geist via `$body-font-family` mapping is correct. Numeric values inside tooltip body (e.g. "4.2 GHz") may be wrapped in `<code>` for monospace alignment if the tooltip displays a list of measurements; otherwise plain text.

## Sizing / direction / align

Carbon Tooltip exposes a 3-axis layout grid: 4 directions × 3 align values = 12 placement combos.

| Wrapper `direction`  | Carbon `direction` | Visual                      |
| -------------------- | ------------------ | --------------------------- |
| `'top'`              | `'top'`            | Tooltip above trigger       |
| `'right'`            | `'right'`          | Tooltip to right of trigger |
| `'bottom'` (default) | `'bottom'`         | Tooltip below trigger       |
| `'left'`             | `'left'`           | Tooltip to left of trigger  |

| Wrapper `align`     | Carbon `align` | Notes                                 |
| ------------------- | -------------- | ------------------------------------- |
| `'start'` (default) | `'start'`      | Tooltip-edge aligned to trigger-start |
| `'center'`          | `'center'`     | Tooltip centered on trigger           |
| `'end'`             | `'end'`        | Tooltip-edge aligned to trigger-end   |

Default in chassis is `direction='bottom'` + `align='start'` (`forms/Tooltip.svelte:25-26`) — most common popover placement, avoids viewport overflow at top of screen.

## What the wrapper adds

- **Svelte-5 `$bindable` `open`** — bridges Carbon's `bind:open` to Svelte-5 controlled flow.
- **Default `iconDescription = 'More information'`** — set per WCAG 2.2 SC 4.1.2 in PR-A CR fix `74211d8d`. Trigger button must have an accessible name even when `hideIcon=true` (Carbon does not auto-supply this).
- **Default `enterDelayMs=100` / `leaveDelayMs=300`** — matches Carbon's default; kept explicit so tier-2 sites can tune per surface.
- **Default `tabindex='0'`** — trigger is keyboard-reachable in TAB order.
- **`onOpen` / `onClose` callback props** — bridge Carbon's `on:open` / `on:close` event dispatcher to Svelte-5 callbacks (`forms/Tooltip.svelte:55-56`).

## Variant scope (PR-A)

This chassis wraps Carbon's `<Tooltip>` — the **inline info-icon pattern** (icon trigger + popover body). For icon-button hover tooltips (e.g. migrating `<button title="Refresh">`), Carbon's `<TooltipIcon>` is the right primitive — see `code.md` for the future `TooltipIcon` chassis wrapper note.

## Visual diff procedure (PR-A)

1. Pre-merge: chrome-devtools MCP `take_screenshot` of BluetoothPanel header showing the Tooltip canary (`src/lib/components/dashboard/panels/BluetoothPanel.svelte`).
2. Apply PR-A.
3. Post-merge: same screenshot + hover state via `mcp__chrome-devtools__hover` to fire the popover.
4. Compare. Drift > 1 pixel on any axis OR > 0.5 luma on color samples = fail; extend `lunaris-carbon-theme.scss` and re-test.
