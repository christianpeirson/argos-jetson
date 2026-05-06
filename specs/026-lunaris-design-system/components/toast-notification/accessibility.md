# ToastNotification — Accessibility

Carbon ToastNotification is a polite/assertive live region pattern. Done right, screen-reader users hear the title + subtitle as soon as the toast renders, and can navigate to the close button without losing keyboard context.

## WCAG criteria covered

| SC              | Criterion                                          | How the wrapper satisfies it                                                                                                       |
| --------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **1.4.3** (AA)  | Contrast (Minimum)                                 | Token mapping uses `$text-inverse` on `$background-inverse` (≥7:1) and `$text-primary` on `$layer-01` for low-contrast             |
| **1.4.13** (AA) | Content on Hover or Focus (dismissible/persistent) | Toast is dismissible (× button + `Esc` via Carbon's NotificationButton); persistent unless `timeout > 0`                           |
| **2.1.1** (A)   | Keyboard                                           | Close button is a real `<button>` (browser focus, ENTER/SPACE activation)                                                          |
| **2.4.3** (A)   | Focus Order                                        | Toast does NOT steal focus on render — assistive tech announces via `role="alert"`/`status`, focus stays where the user was        |
| **3.3.1** (A)   | Error Identification                               | `kind="error"` renders the ErrorFilled icon + `role="alert"` (auto-derived) so AT users hear the error immediately                 |
| **4.1.2** (A)   | Name, Role, Value                                  | Auto-derived `role`; `closeButtonDescription` = `'Close notification'` default; `statusIconDescription` defaults to `${kind} icon` |
| **4.1.3** (AA)  | Status Messages                                    | `role="status"` for info/success/warning-alt — announced without focus shift                                                       |

## ARIA wiring done by Carbon

Carbon ToastNotification auto-wires (`ToastNotification.svelte:1-90`):

- `role` — passed through from prop. The chassis wrapper auto-derives: `kind === 'error' | 'warning' | 'warning-alt'` → `'alert'`; everything else → `'status'` (`forms/ToastNotification.svelte:40-43`).
- `kind` — exposed as both class (`bx--toast-notification--{kind}`) and visual icon. AT may not announce the kind directly — that's why the **title MUST be self-describing** ("Save failed" not "Error").
- Close button is rendered by Carbon's `<NotificationButton>` with `aria-label={closeButtonDescription}` (defaults to `'Close notification'`).
- Status icon (`<NotificationIcon>`) renders with `<title>{statusIconDescription}</title>` inside the SVG — read by AT.

The chassis wrapper does not override any of this; it only supplies safer defaults.

## Consumer obligations

| Owner        | Responsibility                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Carbon       | `role`, `aria-label` on close button, SVG title element on icon, focus management on close                                           |
| Chassis      | Auto-derive `role` from `kind`; default `statusIconDescription`; default `closeButtonDescription`                                    |
| **Consumer** | Pass a **self-describing `title`** (e.g. "Save failed", not "Error"); set `timeout=0` for actionable messages; pair status with text |

## Keyboard interactions

| Key                  | Behavior                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| TAB                  | Moves focus into the toast region only when it contains focusable elements (i.e. the close button) |
| ENTER / SPACE on `×` | Dismisses the toast; focus returns to the previously focused element (browser-default for buttons) |
| ESC                  | Not natively bound — Carbon ToastNotification does NOT close on ESC; consumers can wire if desired |

The chassis wrapper does NOT implement custom keyboard handlers. Adding ESC-to-dismiss would compete with whatever modal/dialog the user is in.

## Focus management

**Toasts MUST NOT steal focus on render.** Carbon's implementation respects this — the toast appears as a live region, AT announces the contents, but the user's keyboard focus remains where it was. This is critical for forms: a `toast.error('Save failed')` after a submit must not move focus off the submit button.

**On dismiss**, the close button receives focus → on click, browser-default behavior returns focus to the document body or the most recent focusable. For toasts inside a modal, the modal's focus trap catches it correctly.

## Screen reader behavior

| AT              | Behavior                                                                             |
| --------------- | ------------------------------------------------------------------------------------ |
| NVDA            | Reads `role="alert"` toasts immediately; `role="status"` may be queued               |
| JAWS            | Same as NVDA                                                                         |
| VoiceOver (Mac) | Reads on render; `role="status"` announces "[title] [subtitle]" via aria-live polite |
| TalkBack        | Reads on render — Android prepends "Alert" or "Status"                               |

**Caveat**: rapid back-to-back toasts (e.g. firing 5 in 100 ms) can cause AT to drop intermediate announcements. The toast store should debounce identical errors (PR-A does NOT implement debounce; tier-2 if needed).

## Common a11y pitfalls

1. **Generic title** — `title="Error"` tells the AT user nothing. Use `title="Save failed"`.
2. **Color-only signal** — already mitigated: every `kind` has a paired icon glyph (CLAUDE.md `Color Architecture` rule).
3. **Auto-dismiss too short** — `timeout=2000` gives AT users no time to hear the message. Default `4000` (`toast.svelte.ts:18`) is the floor; `5000–6000` for important content.
4. **Sticky toasts without close button** — `hideCloseButton={true}` + `timeout=0` strands AT users. Always pair `hideCloseButton` with a non-zero `timeout`.
5. **Multiple ToastRegion mounts** — duplicates everything; AT reads twice. Mount once in `+layout.svelte`.

## Verification (PR-A canary keyboard map)

For the PR-A toast-region canary:

- [ ] Trigger `toast.error('Sample')` from console; AT announces "alert Sample" without focus shift
- [ ] TAB into toast; focus lands on `×` button with visible focus ring (Lunaris accent)
- [ ] ENTER on `×`; toast dismisses; focus returns to document
- [ ] Trigger 3 toasts rapidly; all 3 visible, stacked; AT reads at least the first and last
- [ ] Trigger `toast.success('Done', { timeout: 4000 })`; auto-dismisses after 4 s; `onClose(true)` fires

## Phase 7 audit

Phase 7 (a11y audit + dead-code cleanup) re-tests the toast region against axe-core + manual NVDA / VoiceOver / TalkBack smoke. Defects file against the wrapper or store, not consumers — single choke point per spec-026 strategy.
