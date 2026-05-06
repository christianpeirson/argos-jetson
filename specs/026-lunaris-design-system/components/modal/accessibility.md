# Modal — Accessibility

The Carbon Modal primitive (wrapped at `src/lib/components/chassis/forms/Modal.svelte`) is built to meet WCAG 2.2 Level AA for the dialog pattern. This document records exactly which obligations Carbon owns vs which the consumer must fulfil.

## WCAG 2.2 success criteria covered

| SC                                             | Level | How Carbon satisfies it                                                                                                              |
| ---------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1.3.1 Info and Relationships                   | A     | `role="dialog"` (or `alertdialog` when `alert={true}`); heading wired via `aria-labelledby` to `bx--modal-header__heading`.          |
| 1.4.3 Contrast (Minimum)                       | AA    | Lunaris token map keeps body, header, button text ≥ 4.5:1 against `--bg-1`. Focus ring uses `--accent` ≥ 3:1 against the container.  |
| 1.4.11 Non-text Contrast                       | AA    | Close-X icon, button borders, and divider lines target ≥ 3:1.                                                                        |
| 2.1.1 Keyboard                                 | A     | All controls reachable by Tab; primary action triggered by Enter (when `shouldSubmitOnEnter`); dismiss via Escape.                   |
| 2.1.2 No Keyboard Trap                         | A     | Focus-trap is **intentional** while open — Carbon releases focus when `open=false` and restores it to the invoking element.          |
| 2.4.3 Focus Order                              | A     | Tab cycles header-close → body-focusable → footer-secondary → footer-primary → wraps. `selectorPrimaryFocus` controls initial focus. |
| 2.4.7 Focus Visible                            | AA    | Carbon applies a 2px focus ring using `$focus` token (mapped to `var(--accent)`).                                                    |
| 2.4.11 Focus Not Obscured (Minimum)            | AA    | Modal container is positioned above the scrim with z-index higher than any sticky chrome.                                            |
| 3.2.1 On Focus                                 | A     | Opening the modal does not trigger unexpected navigation; focus moves to `selectorPrimaryFocus` only.                                |
| 3.3.1 Error Identification (when used as form) | A     | Consumer obligation — pair `<Modal hasForm>` with form-field `invalid` / `invalidText` props.                                        |
| 4.1.2 Name, Role, Value                        | A     | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (or `aria-label` via `modalAriaLabel` when no heading exists).               |

## ARIA — Carbon owns vs consumer owes

| Attribute                 | Owner    | Notes                                                                                                                |
| ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `role="dialog"`           | Carbon   | Set on `bx--modal-container`. Switches to `role="alertdialog"` when `alert={true}`.                                  |
| `aria-modal="true"`       | Carbon   | Always set on container.                                                                                             |
| `aria-labelledby`         | Carbon   | Wired to `bx--modal-header__heading` id when `modalHeading` is supplied.                                             |
| `aria-label`              | Consumer | If neither `modalHeading` nor `modalLabel` is visible, supply `modalAriaLabel` so the dialog has an accessible name. |
| `aria-describedby`        | Consumer | Optional — wire to a descriptive paragraph id inside the body when the heading alone is insufficient context.        |
| Close button `aria-label` | Carbon   | Defaults to `iconDescription` ("Close the modal"). Override per locale if i18n applies.                              |
| Form-field labels         | Consumer | When `hasForm`, every `<TextInput>` / `<Select>` etc. inside the body must carry `labelText`.                        |

## Keyboard interactions

| Key                           | Behaviour                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Tab`                         | Move focus to next focusable element inside the modal. Wraps at end.                                  |
| `Shift + Tab`                 | Move focus to previous focusable element. Wraps at start.                                             |
| `Enter`                       | When `shouldSubmitOnEnter={true}` (default), triggers `onSubmit`. Suppressed if focus is on a button. |
| `Escape`                      | Closes the modal; fires `onClose('escape-key')`. Cannot be disabled by Carbon.                        |
| `Space` / `Enter` on a button | Activates the focused button (default browser behaviour).                                             |

## Focus management

Carbon handles the full focus-trap lifecycle:

1. **On open**: focus moves to the element matching `selectorPrimaryFocus` (default `[data-modal-primary-focus]`). If no match, focus falls back to the first focusable element inside the dialog (typically the close-X button).
2. **While open**: Tab and Shift+Tab cycle ONLY through descendants of `bx--modal-container`. Focus cannot escape to the page behind the scrim.
3. **On close**: focus is restored to the element that had focus immediately before the modal opened (typically the trigger button).

**Consumer pitfall**: do not steal focus inside the modal via `autofocus` or `element.focus()` in `$effect` unless you also clear `selectorPrimaryFocus={undefined}` — competing focus claims will trigger a flash of focus on the close-X.

## Screen reader behaviour

| SR        | Announcement                                                     |
| --------- | ---------------------------------------------------------------- |
| NVDA      | "<modalLabel> dialog, <modalHeading>" then current focus target. |
| JAWS      | Same, with "modal" appended.                                     |
| VoiceOver | Reads `aria-labelledby` target then `<h3>` content.              |

When `alert={true}`, the dialog is announced as "alert dialog" instead — reserve for genuinely urgent attention (data loss confirmation, destructive action). Overuse causes alert fatigue.

## Common a11y pitfalls

1. **Missing accessible name** — passive informational modals with no heading fail SC 4.1.2. Always supply at least one of `modalHeading`, `modalLabel`, or `modalAriaLabel`.
2. **Outside-click dismiss on destructive action** — `preventCloseOnClickOutside={false}` (default) lets a stray click discard a destructive confirmation. Set `preventCloseOnClickOutside` for delete / overwrite flows.
3. **Disabling Escape via custom handlers** — Argos consumers must NOT add `onkeydown` handlers that `preventDefault()` on Escape. Per WCAG 2.1.2 the user must always have an unconditional dismissal.
4. **Hidden close-X without footer buttons** — combining `passiveModal` with `iconDescription=""` (empty) leaves the user with no obvious dismiss control. Always supply a meaningful `iconDescription` for passive modals.
5. **Focus-restore failure** — opening a modal from a button that itself unmounts (e.g. the trigger lives inside an item that is removed when the action completes) breaks focus restore. Move focus explicitly in `onClose` when this applies.
6. **Nested modals** — Carbon does not support modal-on-modal. If a confirmation is needed inside a dialog, restructure the flow rather than nest.
