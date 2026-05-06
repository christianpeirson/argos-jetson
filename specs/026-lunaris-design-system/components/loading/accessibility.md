# Loading — Accessibility

The Carbon Loading primitive (wrapped at `src/lib/components/chassis/forms/Loading.svelte`) is built to meet WCAG 2.2 Level AA for the live-region status pattern. This document records exactly which obligations Carbon owns vs which the consumer must fulfil.

## WCAG 2.2 success criteria covered

| SC                       | Level | How Carbon satisfies it                                                                                                                                                                                                                                                                  |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text Content   | A     | SVG carries a `<title>` element wired to the `description` prop (`node_modules/carbon-components-svelte/src/Loading/Loading.svelte:31, 59` (Carbon source — chassis wrapper passes through)). Screen readers announce the title when focus enters the loading region.                    |
| 1.4.1 Use of Color       | A     | The animation itself communicates state (movement = active, paused = stopped). Color is supplementary.                                                                                                                                                                                   |
| 1.4.3 Contrast (Minimum) | AA    | `bx--loading__stroke` uses `$interactive` token (mapped to `var(--accent)`) — Lunaris accents all clear ≥ 3:1 against `var(--background)` per the design-system contract.                                                                                                                |
| 4.1.3 Status Messages    | AA    | Root element carries `aria-live="assertive"` while `active`, `aria-live="off"` when stopped (`node_modules/carbon-components-svelte/src/Loading/Loading.svelte:25, 52` (Carbon source — chassis wrapper passes through)). Assistive tech announces the description without moving focus. |

## ARIA — Carbon owns vs consumer owes

| Attribute                              | Owner        | Notes                                                                                                                                                                                                |
| -------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aria-live`                            | Carbon       | Auto-toggles `"assertive"` ↔ `"off"` from `active` prop.                                                                                                                                            |
| `aria-atomic="true"`                   | Carbon       | Set unconditionally so the WHOLE description is re-announced on change, not just the diff.                                                                                                           |
| `<title>` inside SVG                   | Carbon       | Wired to `description` prop. Chassis defaults `description='Loading'` so screen readers always have text.                                                                                            |
| Overlay scrim                          | Carbon       | When `withOverlay=true`, `bx--loading-overlay` blocks clicks behind the spinner. No `aria-modal` because Loading is not a modal.                                                                     |
| Accessible name for the loading region | **Consumer** | If the loading replaces a labeled region (e.g., a table being refetched), the parent should retain its label. Loading itself doesn't need an extra `aria-label` because the SVG `<title>` covers it. |

## Keyboard interactions

None. Loading is non-interactive — no focus, no keys.

When `withOverlay=true`, focus is NOT trapped by the overlay. The overlay blocks pointer interaction visually but keyboard focus can still traverse to underlying elements. Consumers needing focus management during loading should use a `<Modal>` instead.

## Focus management

Loading does not move, trap, or restore focus. The browser's natural focus order is unchanged.

## Screen reader behavior

| State                                | Announcement                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mount with `active=true`             | "Loading" (or custom `description`) — assertive announcement.                                                                                                                                                                                                                                                                                                        |
| Mount with `active=false` initially  | Carbon sets `aria-live="off"` from the first render (`node_modules/carbon-components-svelte/src/Loading/Loading.svelte:25, 52` (Carbon source — chassis wrapper passes through)); the live region does NOT announce the description. The SVG `<title>` is still reachable via screen-reader cursor mode. Use case: pre-rendered SSR placeholder waiting to activate. |
| Update of `description` while active | New description re-announced (because `aria-atomic="true"`).                                                                                                                                                                                                                                                                                                         |
| `active` flips `false` → `true`      | `aria-live` flips `off` → `assertive`; the description IS announced assertively on the activation event. Use this to start a deferred loading state.                                                                                                                                                                                                                 |
| `active` flips `true` → `false`      | Carbon sets `aria-live="off"` — stops further announcements. SVG continues to render but spinner animation pauses.                                                                                                                                                                                                                                                   |
| Unmount                              | No "loading finished" announcement — Loading is stateless w.r.t. completion. Use `<InlineLoading>` with `status="finished"` if you need success feedback.                                                                                                                                                                                                            |

## Common pitfalls

1. **Sticky overlay forgotten** — leaving `withOverlay=true` on a Loading that mounts inside a small region may cover the wrong area visually. Set `withOverlay=false` for inline use.
2. **Empty description** — Carbon falls back to `'loading'` lowercase. Chassis defaults `'Loading'` (capitalized). If you pass `description=''`, screen readers announce nothing meaningful.
3. **Treating Loading as a modal** — Loading does not trap focus and has no ESC handler. For modal blocking with keyboard semantics, use `<Modal>`.
4. **Animation triggers vestibular issues** — for users with `prefers-reduced-motion`, Carbon's CSS does NOT auto-disable the animation. Future enhancement: add a `prefers-reduced-motion` override in `lunaris-carbon-theme.scss`.
