# InlineNotification — Style

This document maps Carbon InlineNotification's visual treatment to Lunaris tokens. Per spec-026 authority precedence (`authorities.md`), **Carbon source SCSS wins** when source disagrees with site docs; the citations below all point to source files.

## Carbon source-of-truth files

| File                                                                                                                                  | Purpose                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `node_modules/carbon-components-svelte/src/Notification/InlineNotification.svelte`                                                    | Component template + class-name authority (`bx--inline-notification`, `bx--inline-notification__details`)              |
| `node_modules/@carbon/styles/scss/components/notification/_notification.scss`                                                         | SCSS rules + token consumption (per-kind background, border-left treatment, low-contrast variant, close-button chrome) |
| `node_modules/@carbon/styles/scss/components/notification/_inline-notification.scss`                                                  | InlineNotification-specific layout overrides                                                                           |
| Upstream: `https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Notification/InlineNotification.svelte` | Pinned upstream source for diff-against-update audits                                                                  |

## Anatomy

Carbon's InlineNotification renders this structure (`InlineNotification.svelte:115-180`):

```
<div class="bx--inline-notification bx--inline-notification--{kind} [bx--inline-notification--low-contrast]"
     role={role} kind={kind}>
  <div class="bx--inline-notification__details">
    <{StatusIcon} class="bx--inline-notification__icon" title={statusIconDescription} />
    <div class="bx--inline-notification__text-wrapper">
      <p class="bx--inline-notification__title">{title}</p>
      <p class="bx--inline-notification__subtitle">{subtitle}</p>
    </div>
  </div>
  <button class="bx--inline-notification__close-button" aria-label={closeButtonDescription}>
    <Close class="bx--inline-notification__close-icon" />
  </button>
</div>
```

The Lunaris wrapper (`src/lib/components/chassis/forms/InlineNotification.svelte:42-55`) introduces no extra DOM — it forwards directly into CarbonInlineNotification.

## Token mapping (Carbon → Lunaris)

These overrides live (or will live) in `src/lib/styles/lunaris-carbon-theme.scss`. **Token additions are deferred** to whichever PR's chrome-devtools visual diff first exposes drift; do not edit the theme file unless the diff fails.

| Carbon token                       | Lunaris value       | Used by                                            | Citation                                                         |
| ---------------------------------- | ------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| `$support-error`                   | `var(--red)`        | `kind="error"` border-left + status icon           | `_notification.scss` `.#{$prefix}--inline-notification--error`   |
| `$support-warning`                 | `var(--amber)`      | `kind="warning"` / `warning-alt` border + icon     | `_notification.scss` `.#{$prefix}--inline-notification--warning` |
| `$support-success`                 | `var(--green)`      | `kind="success"` border + icon                     | `_notification.scss` success rule                                |
| `$support-info`                    | `var(--accent)`     | `kind="info"` / `info-square` border + icon        | `_notification.scss` info rule                                   |
| `$notification-background-error`   | `var(--bg-error)`   | error variant container background (high-contrast) | `_notification.scss`                                             |
| `$notification-background-warning` | `var(--bg-warning)` | warning variant container background               | `_notification.scss`                                             |
| `$notification-background-success` | `var(--bg-success)` | success variant container background               | `_notification.scss`                                             |
| `$notification-background-info`    | `var(--bg-info)`    | info variant container background                  | `_notification.scss`                                             |
| `$layer-01`                        | `var(--bg-1)`       | low-contrast variant container background          | `_notification.scss` low-contrast rule                           |
| `$text-primary`                    | `var(--ink)`        | title + subtitle text                              | shared with all surfaces                                         |
| `$icon-primary`                    | `var(--ink)`        | close-X icon                                       | `_notification.scss`                                             |
| `$focus`                           | `var(--accent)`     | close-button focus ring                            | shared                                                           |

## Typography

Carbon InlineNotification inherits `$body-compact-01` (mapped to Geist via `lunaris-carbon-theme.scss`). The title is rendered via a `<p>` with `font-weight: 600`; subtitle is the same font at default weight. **The chassis wrapper applies no font-family rule itself.** Per CLAUDE.md typography rules, status text and labels are Fira Code candidates; if a notification surfaces RF data (frequency, dB, MGRS coordinate) inline in the subtitle, wrap that fragment in a `<span style="font-family: 'Fira Code', monospace">` per parent surface convention.

## Sizing / variants

InlineNotification has no size prop — height is content-driven. **Variants are encoded in `kind`**:

| `kind`          | Visual                                     | Default `role` (when not overridden) |
| --------------- | ------------------------------------------ | ------------------------------------ |
| `'error'`       | Red border-left + ErrorFilled icon         | `'alert'`                            |
| `'warning'`     | Amber border-left + WarningFilled icon     | `'alert'`                            |
| `'warning-alt'` | Amber border-left + WarningAltFilled icon  | `'alert'`                            |
| `'success'`     | Green border-left + CheckmarkFilled icon   | `'status'`                           |
| `'info'`        | Blue border-left + InformationFilled icon  | `'status'`                           |
| `'info-square'` | Blue border-left + InformationSquareFilled | `'status'`                           |

Default kind in the wrapper is `'error'` (Carbon parity). Argos consumers should pass an explicit kind every time.

`lowContrast={true}` swaps the per-kind tinted background for a neutral container background — the colored border-left + icon are retained for status legibility. Use when stacking multiple notifications in dense panels (the tinted variants compete visually).

## What the wrapper adds

The wrapper at `src/lib/components/chassis/forms/InlineNotification.svelte` adds **zero visual chrome** beyond Carbon. Its responsibilities:

1. **Svelte 5 runes interop** — `$bindable(true)` for `open`, `$props()` for the typed `Props` interface (`InlineNotification.svelte:21-34`).
2. **Auto-resolve `role`** — derives `'alert'` for error/warning kinds and `'status'` otherwise via `$derived` (`InlineNotification.svelte:36-39`). Consumer can still pass an explicit `role` to override.
3. **Default `statusIconDescription`** — falls back to `` `${kind} icon` `` when omitted (`InlineNotification.svelte:51`).
4. **Callback-prop bridge** — Carbon's `dispatch("close", { timeout })` becomes `onClose?(fromTimeout)` (`InlineNotification.svelte:54`).

## Visual diff procedure (Phase 4 PR-A)

1. Pre-merge: chrome-devtools MCP `take_screenshot` of an Argos surface that renders status notifications (e.g. `localhost:5173/dashboard` form-validation feedback or a toast test page) in isolated context.
2. Apply PR.
3. Post-merge: same screenshot, same isolated context.
4. Compare. Drift > 1 pixel on any axis OR > 0.5 luma on any color sample (especially per-kind border-left and tinted background) OR new layout shift = fail; extend `lunaris-carbon-theme.scss` with the missing override and re-test.
