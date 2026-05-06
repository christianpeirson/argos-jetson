# InlineLoading — Style

This document maps Carbon InlineLoading's visual treatment to Lunaris tokens. Per spec-026 authority precedence (`authorities.md`), **Carbon source SCSS wins** when source disagrees with site docs.

## Carbon source-of-truth files

| File                                                                                                                    | Purpose                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/InlineLoading/InlineLoading.svelte` | Component template + class authority (`bx--inline-loading`, `bx--inline-loading__animation`, `bx--inline-loading--error`, `bx--inline-loading__checkmark-container`, `bx--inline-loading__text`) |
| `https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Loading/Loading.svelte`             | Internal — InlineLoading reuses `<Loading small withOverlay={false}>` for the active spinner (`InlineLoading.svelte:71-77`)                                                                      |
| `node_modules/@carbon/styles/scss/components/inline-loading/_inline-loading.scss`                                       | SCSS rules + token consumption (spacing, status colors, text sizing)                                                                                                                             |

## Anatomy

Carbon's InlineLoading renders this structure (`InlineLoading.svelte:50-82`):

```
<div class="bx--inline-loading" aria-live="assertive">
  <div class="bx--inline-loading__animation">
    {#if status === 'error'}
      <ErrorFilled class="bx--inline-loading--error" />
    {:else if status === 'finished'}
      <CheckmarkFilled class="bx--inline-loading__checkmark-container" />
    {:else if status === 'inactive' || status === 'active'}
      <Loading small withOverlay={false} active={status === 'active'} />
    {/if}
  </div>
  {#if description}
    <div class="bx--inline-loading__text">{description}</div>
  {/if}
</div>
```

The Lunaris wrapper introduces no extra DOM — direct passthrough plus the `onSuccess` callback bridge.

## Token mapping (Carbon → Lunaris)

These overrides **will live in** `src/lib/styles/lunaris-carbon-theme.scss` once the first visual-diff procedure exposes drift. Phase 6 ships the chassis wrapper without explicit token overrides; the theme file is scaffold-only for InlineLoading. Carbon's defaults inherit from the global Lunaris-on-Carbon theme overlay (set up in Phase 0). Per `feedback_lunaris_spec_first.md`, the table below is the **target mapping** to apply if visual-diff fails — not the current state.

| Carbon token       | Lunaris value             | Used by                                        | Citation                  |
| ------------------ | ------------------------- | ---------------------------------------------- | ------------------------- |
| `$interactive`     | `var(--accent)`           | Active spinner stroke (inherited from Loading) | `_loading.scss`           |
| `$support-success` | `var(--success, #8bbfa0)` | Checkmark color (`status='finished'`)          | `_inline-loading.scss`    |
| `$support-error`   | `var(--error, #c45b4a)`   | Error icon color (`status='error'`)            | `_inline-loading.scss`    |
| `$text-primary`    | `var(--ink)`              | `bx--inline-loading__text` description text    | `_inline-loading.scss`    |
| `$body-compact-01` | inherits parent           | Description font size + line height            | shared with all body text |

## Typography

`bx--inline-loading__text` inherits parent `font-family`. Argos parent surfaces (FilterBar, panels, screens) typically set Fira Code per CLAUDE.md typography rules — InlineLoading's description renders in monospace by inheritance. The wrapper applies no font-family rule.

## Sizing / variants

InlineLoading has NO size prop — the spinner is always small (per Carbon source: `<Loading small withOverlay={false}>` line 71-72). Total container height ≈ 16px + text line-height. Designed for inline use within button rows, status bars, and metric panels.

## What the wrapper adds

- TypeScript `Status` type alias (`'active' | 'inactive' | 'finished' | 'error'`) exported from a `<script module>` block so callers can `import { type Status } from '$lib/components/chassis/forms/InlineLoading.svelte'`.
- `onSuccess?: () => void` callback prop — bridges Carbon's `dispatch("success")` event (fires after `successDelay` ms when `status` transitions to `'finished'`, per Carbon source line 39-45).
- Default `successDelay` = 1500 ms (matches Carbon).
- Nothing else — no class manipulation, no slot wrapping.

## Visual diff procedure

1. Pre-merge: chrome-devtools MCP `take_screenshot` of SystemInfoCard during `systemInfo === null` state and WeatherPanel during `loading === true` state.
2. Apply the migration.
3. Post-merge: same screenshots, same isolated context.
4. Compare. Drift > 1 pixel = fail; extend `lunaris-carbon-theme.scss` with the missing override and re-test.
