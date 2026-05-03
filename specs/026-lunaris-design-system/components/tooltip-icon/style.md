# TooltipIcon — Style

This document maps Carbon TooltipIcon's visual treatment to Lunaris tokens. Per spec-026 authority precedence (`authorities.md`), **Carbon source SCSS wins** when source disagrees with site docs.

## Carbon source-of-truth files

| File | Purpose |
|---|---|
| `node_modules/carbon-components-svelte/src/TooltipIcon/TooltipIcon.svelte` | Component template + class authority (`bx--tooltip--icon`, `bx--tooltip__trigger`, `bx--assistive-text`) |
| `node_modules/carbon-components-svelte/src/TooltipIcon/tooltip-icon-store.js` | `activeTooltipIcon` store — warm-handoff between adjacent TooltipIcons |
| `node_modules/carbon-components-svelte/src/Portal/PortalTooltip.svelte` | Portal mode (auto-enabled in `<Modal>` context to escape `overflow: hidden`) |
| `node_modules/@carbon/styles/scss/components/tooltip/_tooltip.scss` | SCSS rules + token consumption |

Upstream source mirrored at https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/TooltipIcon/TooltipIcon.svelte.

## Anatomy

Carbon's TooltipIcon renders this structure (`TooltipIcon.svelte:1-220+`):

```html
<div class="bx--tooltip--icon" data-floating-menu-direction={direction}>
	<button
		type="button"
		class="bx--tooltip__trigger bx--tooltip--a11y bx--tooltip--icon__{direction} bx--tooltip--align-{align}"
		aria-describedby={tooltipId}
		{disabled}
	>
		<span class="bx--assistive-text">{tooltipText}</span>
		<svelte:component this={icon} aria-hidden="true" {size} />
	</button>
	{#if portalOpen}
		<PortalTooltip ... />
	{/if}
</div>
```

The Lunaris wrapper introduces no extra DOM — it forwards directly into `CarbonTooltipIcon` (`src/lib/components/chassis/forms/TooltipIcon.svelte:40`).

## Token mapping (Carbon → Lunaris)

These overrides live (or will live) in `src/lib/styles/lunaris-carbon-theme.scss`. **Token additions are DEFERRED** until visual diff exposes drift — matches Phase 4 PR-A discipline. The icon button is a real `<button>`, so it inherits existing button-token mappings from prior phases.

| Carbon token | Lunaris value | Used by | Citation |
|---|---|---|---|
| `$icon-secondary` | `var(--ink-3)` | Default trigger icon glyph color | `_tooltip.scss` `.bx--tooltip__trigger > svg` |
| `$icon-primary` (hover) | `var(--ink)` | Trigger icon hover state | `_tooltip.scss` `.bx--tooltip__trigger:hover > svg` |
| `$icon-disabled` | `var(--ink-disabled)` | Trigger icon disabled state | `_tooltip.scss` `.bx--tooltip__trigger:disabled > svg` |
| `$focus` | `var(--accent)` | Trigger button `:focus-visible` outline | shared with all interactive elements |
| `$layer-01` | `var(--bg-2)` | Hover background on trigger button | inherited from Carbon button base |
| `$background-inverse` | `var(--bg-3)` | Tooltip popover surface (when shown) | shared with chassis `<Tooltip>` mapping |
| `$text-inverse` | `var(--ink)` | Tooltip popover text | shared with chassis `<Tooltip>` mapping |

## Typography

The popover body uses Carbon's `$body-compact-01` (14 px / 18 px line-height / 400 weight). Per CLAUDE.md typography rules, **tooltip text is UI chrome** (helper info, not data) → Geist via `$body-font-family` mapping is correct.

The icon glyph itself has no text — `tooltipText` is hidden in `<span class="bx--assistive-text">` for screen readers (visually `clip-path: inset(50%)` per Carbon a11y SCSS). Visible text only appears in the popover when triggered.

## Sizing

Carbon's `size` prop accepts `16 | 20 | 24 | 32 | (number)`. Default `16`. The chassis exposes the same scale + falls through to the default. Argos icon sizes:

| Context | Recommended `size` |
|---|---|
| Toolbar action (matching `AgentChatToolbar` pattern) | `16` (default) |
| Panel header control | `20` |
| Map / canvas overlay control | `24` |
| Statusbar / large badge button | `32` |

## Direction + align grid

12 placement combos = 4 directions × 3 align values:

| Wrapper `direction` | Carbon `direction` | Visual |
|---|---|---|
| `'top'` | `'top'` | Tooltip above trigger |
| `'right'` | `'right'` | Tooltip to right of trigger |
| `'bottom'` (default) | `'bottom'` | Tooltip below trigger |
| `'left'` | `'left'` | Tooltip to left of trigger |

| Wrapper `align` | Carbon `align` | Notes |
|---|---|---|
| `'start'` | `'start'` | Tooltip-edge aligned to trigger-start |
| `'center'` (default) | `'center'` | Tooltip centered on trigger — Carbon source default |
| `'end'` | `'end'` | Tooltip-edge aligned to trigger-end |

Default in chassis is `direction='bottom'` + `align='center'` (`forms/TooltipIcon.svelte:25-26`) — matches Carbon source defaults exactly (chassis `<Tooltip>` chose `align='start'` instead — different primitive, different default).

## What the wrapper adds

- **Svelte-5 `$bindable` `open`** — bridges Carbon's `bind:open` to Svelte-5 controlled flow.
- **`tooltipText` REQUIRED in TypeScript** — no safe default. WCAG 4.1.2: an unlabeled icon button is a name-role-value fail; making the prop non-optional forces consumers to supply a name at compile time. See `accessibility.md`.
- **Default `enterDelayMs=100` / `leaveDelayMs=300`** — matches Carbon's defaults; explicit so consumers can tune per surface (rapid-toolbar contexts may want lower delays).
- **`onClick` / `onOpen` / `onClose` callback props** — bridge Carbon's `on:click` / `on:open` / `on:close` event dispatcher to Svelte-5 callbacks (`forms/TooltipIcon.svelte:42-44`). The 3 most-used events for icon-button UX.

## Variant scope (Phase 8.1)

This chassis wraps Carbon's `<TooltipIcon>` — the **icon-button-with-hover-tooltip pattern**. For info-icon-with-popover-body patterns (e.g. multi-line scanner-status descriptions), use chassis `<Tooltip>` from Phase 4 PR-A. For primary-action branded buttons (e.g. AgentChatPanel send button), defer to a future chassis `<Button>` sub-phase.

## Visual diff procedure (Phase 8.1)

1. Pre-merge: chrome-devtools MCP `take_screenshot` of `AgentChatToolbar` showing the existing native `<button title="Clear chat">` rendering.
2. Apply Phase 8.1 chassis migration.
3. Post-merge: same screenshot + `mcp__chrome-devtools__hover` on the icon to fire the popover.
4. Compare: drift > 1 px on layout OR > 0.5 luma on colour samples → extend `lunaris-carbon-theme.scss` with `--cds-tooltip-*` overrides scoped to TooltipIcon and re-test. Otherwise defer per the "Token additions deferred" discipline.

## Warm-handoff visual behaviour

Carbon's `activeTooltipIcon` store (`tooltip-icon-store.js`) coordinates between adjacent TooltipIcons: when one is open, hovering a sibling SKIPS the `enterDelayMs` and snaps the popover to the new icon. Visual effect: in toolbars with multiple TooltipIcons (future use), users can scan icons rapidly without per-icon delay friction. Phase 8.1 has only one TooltipIcon site — store wiring is dormant but ready for Phase 8.4+ multi-TooltipIcon contexts.
