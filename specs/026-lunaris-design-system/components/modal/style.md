# Modal — Style

This document maps Carbon Modal's visual treatment to Lunaris tokens. Per spec-026 authority precedence (`authorities.md`), **Carbon source SCSS wins** when source disagrees with site docs; the citations below all point to source files.

## Carbon source-of-truth files

| File                                                                                                              | Purpose                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `node_modules/carbon-components-svelte/src/Modal/Modal.svelte`                                                    | Component template + class-name authority (`bx--modal`, `bx--modal-container`, `bx--modal-header`, `bx--modal-content`) |
| `node_modules/@carbon/styles/scss/components/modal/_modal.scss`                                                   | SCSS rules + token consumption (sizes, spacing, focus-trap chrome, scrolling-content treatment, danger variant)         |
| `node_modules/@carbon/styles/scss/components/button/_button.scss`                                                 | `bx--btn--primary`, `bx--btn--secondary`, `bx--btn--danger` button styling for the footer button row                    |
| Upstream: `https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Modal/Modal.svelte` | Pinned upstream source for diff-against-update audits                                                                   |

## Anatomy

Carbon's Modal renders this structure (`Modal.svelte:300-460`):

```
<div class="bx--modal [bx--modal-tall] [bx--modal--danger] [is-visible]" role="presentation">
  <div class="bx--modal-container bx--modal-container--{sm|md|lg}" role="dialog" aria-modal="true">
    <div class="bx--modal-header">
      <h2 class="bx--modal-header__label">{modalLabel}</h2>
      <h3 class="bx--modal-header__heading">{modalHeading}</h3>
      <button class="bx--modal-close" aria-label={iconDescription}>
        <Close class="bx--modal-close__icon" />
      </button>
    </div>
    <div class="bx--modal-content [bx--modal-content--with-form] [bx--modal-scroll-content]">
      <slot />
    </div>
    <div class="bx--modal-footer [bx--modal-footer--three-button]">
      <button class="bx--btn bx--btn--secondary">{secondaryButtonText}</button>
      <button class="bx--btn bx--btn--{primary|danger}">{primaryButtonText}</button>
    </div>
  </div>
</div>
```

The Lunaris wrapper (`src/lib/components/chassis/forms/Modal.svelte:69-123`) introduces no extra DOM — it forwards directly into CarbonModal. The `{#if carbonSecondaryButtons}` branching is purely a TypeScript discriminant for Carbon's overloaded `secondaryButtons` vs `secondaryButtonText` props.

## Token mapping (Carbon → Lunaris)

These overrides live (or will live) in `src/lib/styles/lunaris-carbon-theme.scss`. **Token additions are deferred** to whichever PR's chrome-devtools visual diff first exposes drift; do not edit the theme file unless the diff fails.

| Carbon token             | Lunaris value    | Used by                                  | Citation                                         |
| ------------------------ | ---------------- | ---------------------------------------- | ------------------------------------------------ |
| `$overlay`               | `var(--overlay)` | scrim behind `bx--modal`                 | `_modal.scss` (~L70 `.#{$prefix}--modal`)        |
| `$layer-01`              | `var(--bg-1)`    | `bx--modal-container` background         | `_modal.scss` `.#{$prefix}--modal-container`     |
| `$text-primary`          | `var(--ink)`     | heading + body text                      | shared with all surfaces                         |
| `$text-secondary`        | `var(--ink-3)`   | `bx--modal-header__label` (eyebrow)      | `_modal.scss` `.#{$prefix}--modal-header__label` |
| `$border-subtle-01`      | `var(--line-1)`  | header / footer divider                  | `_modal.scss`                                    |
| `$focus`                 | `var(--accent)`  | focused button + close-X focus ring      | shared                                           |
| `$button-danger-primary` | `var(--red)`     | danger variant primary button background | `_button.scss` + `_modal.scss` danger override   |
| `$icon-primary`          | `var(--ink)`     | `bx--modal-close__icon`                  | `Modal.svelte:~415`                              |

## Typography

Carbon Modal inherits `$heading-03` for `modalHeading`, `$label-01` for `modalLabel`, `$body-01` for content (mapped to Geist via `lunaris-carbon-theme.scss`). **The chassis wrapper applies no font-family rule itself.** Per CLAUDE.md typography rules, modal content surfaces should not redeclare fonts — Lunaris dialog headings render in Geist (UI chrome). Any data inside the modal body (coordinates, RF metrics) should be wrapped in a span with `font-family: 'Fira Code'` per the parent surface's convention.

## Sizing / variants

Carbon offers `'xs' | 'sm' | 'md' | 'lg'`. The wrapper exposes Argos sizes `'sm' | 'md' | 'lg'` and maps:

| Argos `size` | Carbon `size`              | Container max-width (Carbon source) |
| ------------ | -------------------------- | ----------------------------------- |
| `'sm'`       | `'sm'`                     | 24rem                               |
| `'md'`       | undefined (Carbon default) | 32rem                               |
| `'lg'`       | `'lg'`                     | 48rem                               |

Mapping shape is identical to Select / NumberInput precedent (`components/select/style.md`).

Variants — controlled via boolean props:

| Prop                  | Effect                                                                            |
| --------------------- | --------------------------------------------------------------------------------- |
| `passiveModal`        | Hides the footer button row entirely (informational dialog).                      |
| `danger`              | Primary button switches to `bx--btn--danger` red. For destructive confirmations.  |
| `alert`               | Adds `role="alertdialog"` + WAI-ARIA semantics for urgent attention.              |
| `hasForm`             | Adds `bx--modal-content--with-form` (extra padding for form-field rhythm).        |
| `hasScrollingContent` | Adds `bx--modal-scroll-content` + `tabindex="0"` so keyboard can scroll the body. |

## What the wrapper adds

The wrapper at `src/lib/components/chassis/forms/Modal.svelte` adds **zero visual chrome** beyond Carbon. Its responsibilities:

1. **Svelte 5 runes interop** — `$bindable(false)` for `open`, `$props()` for the typed `Props` interface (`Modal.svelte:34-59`).
2. **Argos-density size token** — maps `'sm' | 'md' | 'lg'` to Carbon's `'sm' | undefined | 'lg'` via `$derived` (`Modal.svelte:61`).
3. **Callback-prop bridge** — Carbon's Svelte-4 `dispatch("close", { trigger })` becomes `onClose?(trigger)` (`Modal.svelte:90`); same for `submit` and `click:button--secondary`.
4. **Optional two-button footer** — branches on `secondaryButtons.length === 2` for Carbon's three-button overload (`Modal.svelte:62-66`).

## Visual diff procedure (Phase 4 PR-A)

1. Pre-merge: chrome-devtools MCP `take_screenshot` of any in-app dialog (e.g. `localhost:5173/dashboard` confirmation dialog) in isolated context.
2. Apply PR.
3. Post-merge: same screenshot, same isolated context.
4. Compare. Drift > 1 pixel on any axis OR > 0.5 luma on any color sample OR new layout shift = fail; extend `lunaris-carbon-theme.scss` with the missing override and re-test.
