# Separator — Accessibility

`<Separator>` implements the **WAI-ARIA APG Separator pattern** (https://www.w3.org/WAI/ARIA/apg/patterns/separator/) for a non-interactive visual divider. The chassis renders a `<div role="separator">` with `aria-orientation`. NO `tabindex`, NO keyboard handlers — separators are purely structural.

## No Carbon source

Carbon Design System has no Separator primitive. This chassis is bespoke. The third bespoke chassis in spec-026 after `<PanelStatus>` (Phase 8.4) and `<EditorTabBar>` (Phase 8.6).

## ARIA pattern choice

The APG Separator pattern has TWO modes:

| Mode                                    | Used for             | Implementation                                                                                                 |
| --------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Non-interactive** (this chassis)      | Visual section break | `role="separator"` + `aria-orientation`. NO tabindex                                                           |
| **Interactive (focusable + draggable)** | Resizable panes      | `role="separator"` + `tabindex="0"` + `aria-valuenow` + `aria-valuemin` + `aria-valuemax` + arrow-key handlers |

Argos already has the interactive variant hand-rolled at `dashboard/PanelContainer.svelte:112` (resize-handle for the bottom panel). This chassis covers ONLY the non-interactive case, which is the bits-ui Separator's only use site.

## ARIA wiring done by the chassis

```html
<div role="separator" aria-orientation="horizontal" class="separator separator--horizontal"></div>
```

Key wiring decisions:

- **`role="separator"`** — APG canonical role. AT announces "separator" when the user navigates by landmark or the previous/next-element shortcut.
- **`aria-orientation`** — explicit even though `horizontal` is the implicit default. Prevents AT from guessing.
- **NO `tabindex`** — non-interactive. Tab key skips the separator entirely.
- **NO `aria-label`** — separators do NOT need names. Their semantic meaning is "section break", which the role conveys.
- **NO `aria-hidden`** — the separator IS meaningful to AT users navigating section structure. Setting `aria-hidden="true"` would hide it from a section-jump shortcut, defeating the point.

## WCAG criteria covered

| SC              | Criterion              | How the chassis satisfies it                                                                                                                                                                                                                                                                                |
| --------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.1.1** (A)   | Non-text Content       | N/A — separator has no content (purely structural)                                                                                                                                                                                                                                                          |
| **1.3.1** (A)   | Info and Relationships | `role="separator"` exposes the section-break relationship to AT                                                                                                                                                                                                                                             |
| **1.4.3** (AA)  | Contrast (Minimum)     | Lunaris `--border` (#2E2E2E) is intentionally low-contrast (separators are chrome, not text). WCAG 1.4.3 doesn't apply to non-text content; 1.4.11 covers structural lines                                                                                                                                  |
| **1.4.11** (AA) | Non-text Contrast      | `--border` against `--background` (#111111) is ~1.4:1 — BELOW the 3:1 graphics threshold. Acceptable for non-essential decoration; a low-contrast separator is the canonical pattern (Carbon, Material, Apple HIG all do this). For surfaces that NEED a high-contrast separator, pass `class` and override |
| **2.1.1** (A)   | Keyboard               | N/A — separator is not interactive                                                                                                                                                                                                                                                                          |
| **4.1.2** (A)   | Name, Role, Value      | `role="separator"` provides the role; orientation is the only "value" needed                                                                                                                                                                                                                                |

## Keyboard interactions

NONE. Separators are not focusable. Tab key skips them.

## Focus management

NONE. Separators never receive focus.

## Screen reader behavior

| AT                  | Behavior                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NVDA**            | Skipped during character-by-character read. Announced as "separator" when navigated via landmark / region shortcuts (e.g. `D` in NVDA browse mode) |
| **JAWS**            | Same pattern; separators count as section landmarks                                                                                                |
| **VoiceOver (Mac)** | "separator" announced when navigating by structure (VO+U → Landmarks rotor lists separators)                                                       |
| **TalkBack**        | Skipped during linear read; surfaced via headings/landmarks navigation                                                                             |

## Why no `aria-hidden`

Setting `aria-hidden="true"` on a separator would hide it from section-jump shortcuts. AT users rely on separators to chunk long forms and config views — hiding them defeats the structural purpose. The chassis intentionally exposes the role.

## Consumer obligations

| Owner        | Responsibility                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chassis      | `role="separator"`, `aria-orientation`, low-contrast styling                                                                                                                                      |
| **Consumer** | Use ONLY for semantic section breaks; pass `orientation="vertical"` inside a height-constrained flex parent; pass `class` for one-off contrast overrides if a high-contrast separator is required |

## Common a11y pitfalls

1. **Using `<Separator>` as decoration inside a card chrome** — overuses the role. Use a plain `<div>` for decoration; reserve `<Separator>` for true section breaks.
2. **Adding `aria-hidden="true"`** — defeats the structural purpose. Don't.
3. **Wrapping a separator in an interactive element** — turns the divider into a click target without the proper resize-handle ARIA. If you need an interactive separator, use the resize-handle pattern instead.
4. **Forgetting `orientation` for vertical separators** — AT relies on `aria-orientation` to announce "vertical separator" vs "separator". Always set the prop for vertical.

## Verification (Phase 8.7 canary)

For GpConfigView and TakConfigView:

- [ ] axe-core scan with `wcag2a/wcag2aa/wcag21a/wcag21aa` returns `violations: []` for the two routes.
- [ ] AT navigation by landmark / structure surfaces each separator.
- [ ] Tab order from form fields skips separators (separators have no `tabindex`).
- [ ] Visual diff vs pre-migration: separators visible at unchanged positions, same colour.

## Phase 7 audit alignment

Phase 7 (a11y audit) did not flag bits-ui Separator usage; the chassis migration is a dependency-cleanup driver, not an a11y fix. The new chassis matches the bits-ui Separator's a11y output (both render `role="separator"`).
