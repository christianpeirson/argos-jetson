# Separator — Style

`<Separator>` is **NOT a Carbon wrapper** — Carbon Design System ships no Separator primitive. It is a bespoke Argos design-system primitive (~25 LOC) inheriting Lunaris's `--border` token for the line colour.

## Source-of-truth files

| File                                                | Role                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/lib/components/chassis/forms/Separator.svelte` | Implementation (~25 LOC) — single source of truth for visual treatment |
| `src/app.css`                                       | `--border` token definition (#2E2E2E in Lunaris dark mode)             |

## Anatomy

```html
<div role="separator" aria-orientation="horizontal" class="separator separator--horizontal"></div>
```

Or for vertical:

```html
<div role="separator" aria-orientation="vertical" class="separator separator--vertical"></div>
```

## Sizing

| Orientation  | CSS                                        |
| ------------ | ------------------------------------------ |
| `horizontal` | `height: 1px; width: 100%; flex-shrink: 0` |
| `vertical`   | `width: 1px; height: 100%; flex-shrink: 0` |

`flex-shrink: 0` prevents the separator from collapsing inside a flex parent that distributes space.

## Color tokens

| Surface     | Value           | Source                                                           |
| ----------- | --------------- | ---------------------------------------------------------------- |
| Line colour | `var(--border)` | `src/app.css` `:root { --border: #2E2E2E; }` (Lunaris dark mode) |

No hover, focus, or active treatment — separators are non-interactive.

## Reduced-motion compliance

N/A — no animation.

## Visual diff vs pre-migration `bits-ui` Separator

| Aspect                | `bits-ui` Separator (pre-migration)                                       | Argos chassis Separator                                |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| Line colour           | `bg-border` Tailwind class → `var(--border)`                              | `var(--border)` direct                                 |
| Horizontal sizing     | `data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full` | `height: 1px; width: 100%`                             |
| Vertical sizing       | `data-[orientation=vertical]:min-h-full data-[orientation=vertical]:w-px` | `height: 100%; width: 1px`                             |
| `data-slot` attribute | `data-slot="separator"`                                                   | dropped (not consumed by any selector in the codebase) |

User-visible chrome unchanged. Internal markup simpler — uses `role="separator"` directly without bits-ui's `Separator.Root` indirection.

## Why bespoke

Carbon Design System has no Separator primitive (verified via `node_modules/carbon-components-svelte/src/`). The closest Carbon primitive is `<HorizontalScrollbar>` (different purpose). A 25-LOC bespoke chassis is cheaper than force-fitting Carbon — and matches the precedent set by `<PanelStatus>` (Phase 8.4, first bespoke chassis) and `<EditorTabBar>` (Phase 8.6, second bespoke chassis).

This is the THIRD bespoke chassis primitive in spec-026.

## Lunaris theme alignment

Inherits Lunaris's `--border` token directly. When the active MIL-STD-2525C palette swaps, separators do NOT change colour (they're chrome, not accent — same discipline as panel borders).

For surfaces that need a brighter divider, pass `class="separator-strong"` and override in scoped CSS:

```css
.separator-strong {
	background: var(--border-strong, var(--foreground));
}
```
