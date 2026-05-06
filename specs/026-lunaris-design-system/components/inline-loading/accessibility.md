# InlineLoading — Accessibility

The Carbon InlineLoading primitive (wrapped at `src/lib/components/chassis/forms/InlineLoading.svelte`) is built to meet WCAG 2.2 Level AA for the live-region status pattern. This document records exactly which obligations Carbon owns vs which the consumer must fulfil.

## WCAG 2.2 success criteria covered

| SC                           | Level | How Carbon satisfies it                                                                                                                                                                                                                                              |
| ---------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text Content       | A     | Status icons (active spinner, checkmark for `finished`, X for `error`) carry SVG `<title>` text via `iconDescription` (defaults to `status` value for `'error'` / `'finished'`).                                                                                     |
| 1.3.1 Info and Relationships | A     | Status conveyed by both icon shape AND optional description text — not by color alone.                                                                                                                                                                               |
| 1.4.1 Use of Color           | A     | Each status has a distinct icon shape: spinner (active/inactive), checkmark (finished), X (error). Color supplements but is not the sole indicator.                                                                                                                  |
| 1.4.3 Contrast (Minimum)     | AA    | Description text uses `$text-primary` (`var(--ink)`) ≥ 4.5:1 against parent surface. Status icons use `$support-success` / `$support-error` tokens — Lunaris values verified ≥ 3:1 against `var(--card)`.                                                            |
| 1.4.11 Non-text Contrast     | AA    | Icon strokes target ≥ 3:1 against the container surface.                                                                                                                                                                                                             |
| 4.1.2 Name, Role, Value      | A     | Root `<div>` has implicit live-region role via `aria-live="assertive"`. Each icon has accessible name via SVG `<title>`.                                                                                                                                             |
| 4.1.3 Status Messages        | AA    | `aria-live="assertive"` (`node_modules/carbon-components-svelte/src/InlineLoading/InlineLoading.svelte:52` (Carbon source — chassis wrapper passes through)) ensures assistive tech announces the description on mount + on description change without moving focus. |

## ARIA — Carbon owns vs consumer owes

| Attribute                      | Owner                 | Notes                                                                                                                                                                                                             |
| ------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aria-live="assertive"`        | Carbon                | Hard-coded on the root (`node_modules/carbon-components-svelte/src/InlineLoading/InlineLoading.svelte:52` (Carbon source — chassis wrapper passes through)). Assertive — interrupts current screen reader output. |
| `<title>` inside status icons  | Carbon                | Wired to `iconDescription` (with `status`-derived fallback for `'error'` / `'finished'`).                                                                                                                         |
| Description text               | **Consumer**          | Pass a meaningful `description` so screen readers have content to announce. Empty `description` produces silent live region — bad UX.                                                                             |
| Container `role`               | Implicit              | Carbon does NOT set an explicit `role`. The `aria-live` makes it a live region implicitly.                                                                                                                        |
| Color contrast on status icons | Lunaris theme overlay | `$support-success` and `$support-error` Carbon tokens are mapped to Lunaris values in `lunaris-carbon-theme.scss`; the chassis wrapper does not enforce per-instance color.                                       |

## Keyboard interactions

None. InlineLoading is non-interactive — no focus, no keys.

The component does not appear in the Tab order. If your consumer site needs the user to acknowledge a `'finished'` or `'error'` state, pair InlineLoading with a focusable button rather than relying on the inline-status alone.

## Focus management

InlineLoading does not move, trap, or restore focus. Mounting the component does NOT steal focus from the user's current task — by design, per WCAG 4.1.3 (status messages must not interrupt by moving focus).

## Screen reader behavior

| State / event                                           | Announcement                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mount with `status='active' description='Loading…'`     | "Loading…" — assertive announcement, doesn't move focus.                                                                                                                                                                                                                                                                    |
| Mount with `status='inactive'`                          | Description (if any) announced once via the assertive live region; spinner is rendered stopped. No icon-state announcement (the inactive variant uses the same Loading SVG as `active` but with `active={false}` per `node_modules/carbon-components-svelte/src/InlineLoading/InlineLoading.svelte:71-77` (Carbon source)). |
| Mount with `status='error' description='…'`             | Description announced via the assertive live region. The X icon's `<title>` (defaulting to `'error'`) is announced only when the user navigates into the icon via screen-reader cursor mode (not Tab).                                                                                                                      |
| Mount with empty/undefined `description`                | Live region renders silent. The icon's `<title>` (`iconDescription` or status-derived fallback for `'error'` / `'finished'`) is the only screen-reader-detectable text. **Pitfall** — always pass a meaningful `description` (see "Common pitfalls" below).                                                                 |
| `description` changes (e.g., `'Loading…'` → `'Saved.'`) | New description announced (assertive live region).                                                                                                                                                                                                                                                                          |
| `status` transition `active` → `finished`               | If `description` also updates, the new description is announced. The checkmark icon is announced via its `<title>` only when the user navigates into it (screen-reader cursor mode, not Tab).                                                                                                                               |
| `status` transition `active` → `error`                  | Same as above — description re-announced if it changes; X icon `<title>` reachable in cursor mode.                                                                                                                                                                                                                          |
| `onSuccess()` fires after `successDelay`                | Programmatic — announces nothing. Use the callback to dismiss the InlineLoading or chain a follow-up announcement.                                                                                                                                                                                                          |

## Common pitfalls

1. **Empty description** — Carbon's `aria-live="assertive"` region announces nothing useful. Always pass a `description` for screen-reader users.
2. **Treating `'finished'` as terminal without `onSuccess`** — Carbon dispatches `on:success` only ONCE per status transition. Without `onSuccess` to dismiss the component, the checkmark stays visible indefinitely. Pair the callback with state mutation (e.g., `onSuccess={() => (saveState = 'idle')}`).
3. **Stacking multiple InlineLoadings in the same live region** — multiple `aria-live="assertive"` elements can interrupt each other's announcements. Render at most one per visible region.
4. **Color-only status interpretation** — never rely on the green/red icon color alone. The description text + icon shape carry the status; color supplements.
