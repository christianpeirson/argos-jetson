# ToastNotification — Style

This document maps Carbon ToastNotification's visual treatment to Lunaris tokens. Per spec-026 authority precedence (`authorities.md`), **Carbon source SCSS wins** when source disagrees with site docs.

## Carbon source-of-truth files

| File                                                                              | Purpose                                                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `node_modules/carbon-components-svelte/src/Notification/ToastNotification.svelte` | Component template + class authority (`bx--toast-notification`, `bx--toast-notification__title`) |
| `node_modules/@carbon/styles/scss/components/notification/_notification.scss`     | SCSS rules + token consumption (shared with InlineNotification + ActionableNotification)         |
| `node_modules/@carbon/styles/scss/components/notification/_tokens.scss`           | Per-kind status tokens (`$support-error-inverse`, `$support-warning-inverse`, etc.)              |

Upstream source mirrored at `https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Notification/ToastNotification.svelte`.

## Anatomy

Carbon's ToastNotification renders this structure (`ToastNotification.svelte:1-90`):

```
<div role="alert|status" kind={kind} class="bx--toast-notification bx--toast-notification--{kind} [bx--toast-notification--low-contrast] [bx--toast-notification--fullwidth]">
  <NotificationIcon class="bx--toast-notification__icon" />
  <div class="bx--toast-notification__details">
    <h3 class="bx--toast-notification__title">{title}</h3>
    <p class="bx--toast-notification__subtitle">{subtitle}</p>
    <p class="bx--toast-notification__caption">{caption}</p>
    <slot />  <!-- optional extra content -->
  </div>
  <NotificationButton class="bx--toast-notification__close-button" />
</div>
```

The Lunaris wrapper adds NO extra DOM — it forwards directly into `CarbonToastNotification` (`src/lib/components/chassis/forms/ToastNotification.svelte:46`).

## Token mapping (Carbon → Lunaris)

These overrides live (or will live) in `src/lib/styles/lunaris-carbon-theme.scss`. **Token additions are deferred** until the chrome-devtools visual diff exposes drift.

| Carbon token               | Lunaris value   | Used by                                    | Citation                                                     |
| -------------------------- | --------------- | ------------------------------------------ | ------------------------------------------------------------ | -------------- |
| `$background-inverse`      | `var(--bg-3)`   | High-contrast toast surface (default)      | `_notification.scss` `.bx--toast-notification`               |
| `$layer-01`                | `var(--bg-2)`   | Low-contrast toast surface (`lowContrast`) | `_notification.scss` `.bx--toast-notification--low-contrast` |
| `$text-inverse`            | `var(--ink)`    | Title + subtitle text on default surface   | shared with InlineNotification                               |
| `$text-primary`            | `var(--ink)`    | Title + subtitle on low-contrast surface   | shared                                                       |
| `$support-error-inverse`   | `var(--red)`    | Left bar + icon for `kind="error"`         | `_tokens.scss` per-kind                                      |
| `$support-warning-inverse` | `var(--amber)`  | Left bar + icon for `kind="warning         | warning-alt"`                                                | `_tokens.scss` |
| `$support-success-inverse` | `var(--green)`  | Left bar + icon for `kind="success"`       | `_tokens.scss`                                               |
| `$support-info-inverse`    | `var(--blue)`   | Left bar + icon for `kind="info            | info-square"`                                                | `_tokens.scss` |
| `$focus`                   | `var(--accent)` | Close-button `:focus` outline              | shared with all interactive elements                         |

## Typography

Carbon's title uses `$heading-compact-01` (14 px / 18 px line-height / 600 weight); subtitle + caption use `$body-compact-01` / `$label-01` respectively. All inherit `font-family: $body-font-family` → mapped to Geist via Phase 0 theme overlay. Per CLAUDE.md typography rules, **toast bodies are UI chrome** (status communication, not data) → Geist is the correct face. Numeric values inside the subtitle (e.g. error codes, counts) should NOT be wrapped in `<code>` here — keep the visual rhythm uniform across the toast region.

## Sizing / variants

Carbon offers six `kind` values + two boolean modifiers. The chassis wrapper exposes all six kinds:

| Wrapper `kind`  | Carbon `kind`   | Visual                                    |
| --------------- | --------------- | ----------------------------------------- |
| `'error'`       | `'error'`       | Red left bar + ErrorFilled icon (default) |
| `'warning'`     | `'warning'`     | Amber bar + WarningAltFilled icon         |
| `'warning-alt'` | `'warning-alt'` | Amber bar + WarningAlt icon (alt glyph)   |
| `'success'`     | `'success'`     | Green bar + CheckmarkFilled icon          |
| `'info'`        | `'info'`        | Blue bar + Information icon               |
| `'info-square'` | `'info-square'` | Blue bar + InformationSquareFilled icon   |

Modifiers:

- `lowContrast={true}` — swaps the dark surface for `$layer-01` (matches inline panels). Default `false` for the floating toast use case.
- `fullWidth={true}` — stretches the toast to 100% of parent width. Use inside narrow side panels; default `false` for region-fixed toasts.

## What the wrapper adds

- **Svelte-5 `$bindable` `open`** — bridges Carbon's `bind:open` to a Svelte-5 controlled flow.
- **Default `role` derivation** — `kind === 'error' | 'warning' | 'warning-alt'` → `'alert'`; everything else → `'status'`. Consumer can override (`src/lib/components/chassis/forms/ToastNotification.svelte:40`).
- **`statusIconDescription` fallback** — defaults to `` `${kind} icon` `` so `<img alt>`-equivalent text is never empty (a11y hardening).
- **Close-event normalization** — Carbon dispatches `close` with `{ detail: { timeout: boolean } }`; the wrapper exposes a Svelte-5 callback prop `onClose(fromTimeout)` (`forms/ToastNotification.svelte:60`).

## Region placement

Floating toasts mount inside `src/lib/components/chassis/ToastRegion.svelte`, fixed at `bottom: 1rem; right: 1rem; z-index: 9000`. The region is `position: fixed; pointer-events: none` (the toasts re-enable pointer events via `:global(.bx--toast-notification)`). Region must be rendered exactly once per app — `src/routes/+layout.svelte` is the canonical mount point (PR-A canary).

## Visual diff procedure (PR-A)

1. Pre-merge: chrome-devtools MCP `take_screenshot` of toast region after firing `toast.error('Sample error')` from the dev console.
2. Apply PR-A.
3. Post-merge: same screenshot, same isolated context.
4. Compare. Drift > 1 pixel on any axis OR > 0.5 luma on color samples = fail; extend `lunaris-carbon-theme.scss` and re-test.
