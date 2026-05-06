# Tooltip — Accessibility

Carbon Tooltip's a11y model treats the trigger as a real `<button>` with `aria-haspopup="true"` and `aria-expanded`. The popover body is `aria-describedby`-linked to the trigger, so screen readers announce both on focus.

## WCAG criteria covered

| SC              | Criterion                                                    | How the wrapper satisfies it                                                                                                          |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **1.4.3** (AA)  | Contrast (Minimum)                                           | Token mapping: `$text-inverse` on `$background-inverse` (≥7:1) for popover body; trigger icon `$icon-secondary` on parent surface     |
| **1.4.13** (AA) | Content on Hover or Focus (dismissible/persistent/hoverable) | Carbon Tooltip is dismissible (Esc closes), persistent (`leaveDelayMs=300` default), hoverable (mouse can enter popover)              |
| **2.1.1** (A)   | Keyboard                                                     | Trigger is real `<button>` with `tabindex='0'` default; ENTER/SPACE toggles popover; ESC closes                                       |
| **2.4.3** (A)   | Focus Order                                                  | Trigger is in TAB order; popover content is non-focusable by default (read via `aria-describedby`)                                    |
| **2.5.5** (AAA) | Target Size                                                  | Default Carbon trigger button is 24 × 24 px (below AAA 44 × 44, above AA 24 × 24); Argos icon-rail buttons exceed AA                  |
| **4.1.2** (A)   | Name, Role, Value                                            | **`iconDescription = 'More information'` default** — set per CR fix commit `74211d8d` so trigger button always has an accessible name |
| **4.1.3** (AA)  | Status Messages                                              | `aria-expanded` toggles on open/close; AT announces "expanded"/"collapsed" without focus shift                                        |

## ARIA wiring done by Carbon

Carbon Tooltip auto-wires (`Tooltip.svelte:1-180`):

- `<button class="bx--tooltip__trigger" aria-haspopup="true" aria-expanded={open} aria-describedby={tooltipId}>` — popover linked via `aria-describedby`, NOT `aria-labelledby` (the popover is supplementary description, not the primary label).
- `aria-label={iconDescription}` on the trigger button when `triggerText` is empty (icon-only mode).
- `<div id={tooltipId} role="tooltip">` on the popover body.
- ESC keydown handler closes the popover and returns focus to the trigger.
- `mouseenter` / `mouseleave` on both trigger AND popover body — so the user can move their mouse from the trigger into the popover without it closing (WCAG 1.4.13 "hoverable").

The Lunaris wrapper does not override any of this; it only supplies the safe default for `iconDescription`.

## Why `iconDescription` defaults to `'More information'` (CR fix history)

The PR-A pre-CR draft of `forms/Tooltip.svelte` had `iconDescription` as an undefined-by-default prop. CodeRabbit flagged this as a WCAG 2.2 SC 4.1.2 risk — when consumers omit the prop and `hideIcon={true}` or `triggerText=''`, the `<button>` has NO accessible name. Commit **`74211d8d`** set the default to `'More information'` (`forms/Tooltip.svelte:28`), guaranteeing a baseline name even when consumers forget. Consumers SHOULD still pass a more specific value (e.g. `'About BlueDragon scanner'`) for production sites.

## Consumer obligations

| Owner        | Responsibility                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Carbon       | `aria-haspopup`, `aria-expanded`, `aria-describedby`, `role="tooltip"`, ESC-to-close, hoverable popover      |
| Chassis      | Default `iconDescription='More information'`; default `tabindex='0'`; bridge events to Svelte-5 callbacks    |
| **Consumer** | Pass a **descriptive `iconDescription`** when the default is generic; keep popover body short (≤2 sentences) |

## Keyboard interactions

| Key                                  | Behavior                                                               |
| ------------------------------------ | ---------------------------------------------------------------------- |
| TAB                                  | Moves focus to the trigger button (when `tabindex='0'`)                |
| ENTER / SPACE on trigger             | Toggles popover open/closed                                            |
| ESC (popover open)                   | Closes popover, returns focus to trigger                               |
| TAB inside popover                   | Tooltip body is not focusable — TAB skips to next page-level focusable |
| Mouse hover on trigger               | Opens after `enterDelayMs` (100 ms default)                            |
| Mouse leave from trigger AND popover | Closes after `leaveDelayMs` (300 ms default)                           |

The chassis wrapper does NOT add custom keyboard handlers.

## Focus management

- **Open via keyboard**: trigger keeps focus; AT reads popover content via `aria-describedby`.
- **Close via ESC**: focus returns to trigger automatically (Carbon implementation).
- **Close via mouse-leave**: focus is unchanged.
- **Tooltip popover does NOT trap focus** — it's not a modal. Users can TAB past it to the next page-level focusable.

## Screen reader behavior

| AT              | Behavior                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------- |
| NVDA            | Reads "[iconDescription] button collapsed" → on activate "expanded" → reads popover body |
| JAWS            | Same pattern; some versions read the popover body immediately on focus                   |
| VoiceOver (Mac) | Reads trigger label + "tooltip" hint; popover body announced on activation               |
| TalkBack        | Reads trigger; double-tap activates; popover body announced                              |

**Caveat**: tooltips that contain INTERACTIVE content (links, buttons) are an a11y anti-pattern — TAB cannot reach them because the popover is not focus-trapped. PR-A canaries use plain text only.

## Common a11y pitfalls

1. **Generic `iconDescription`** — `'More information'` (the default) is generic; use `'About <feature>'` where possible.
2. **Tooltip body too long** — anything > 2 sentences becomes a wall-of-text on the popover. Move long content into a Modal or InlineNotification instead.
3. **Interactive content in popover body** — links/buttons inside `<Tooltip>` body are NOT keyboard-reachable. Refactor to a `<Popover>` (focus-trapped) if interaction is needed.
4. **Tooltip on disabled element** — disabled buttons don't fire focus events; tooltip never opens for keyboard users. Wrap the disabled element in a focusable span if you need a hover hint, or use static helper text.
5. **`hideIcon=true` + `triggerText=''`** — leaves the trigger with NO visible content. Either keep the icon, supply triggerText, or both.

## Verification (PR-A canary keyboard map)

For the BluetoothPanel canary (`src/lib/components/dashboard/panels/BluetoothPanel.svelte`):

- [ ] TAB to Tooltip trigger; focus ring visible (Lunaris accent)
- [ ] ENTER on trigger; popover opens below the icon
- [ ] AT announces `iconDescription` + popover body
- [ ] ESC; popover closes, focus returns to trigger
- [ ] Mouse hover on trigger; popover opens after 100 ms
- [ ] Mouse leave from trigger AND popover; closes after 300 ms
- [ ] TAB out; skips popover body, lands on next page focusable

## Phase 7 audit

Phase 7 (a11y audit + dead-code cleanup) re-tests every Tooltip canary against axe-core + manual NVDA / VoiceOver / TalkBack smoke. Defects file against the chassis wrapper, not consumers — single choke point per spec-026 strategy.
