# PanelStatus — Accessibility

PanelStatus is a **status-region container** that uses ARIA live-region semantics to announce state changes to assistive technology without focus shifts. The wrapper element carries all a11y semantics; consumers do NOT need to add their own `aria-busy` / `aria-label` wrappers (unlike `<SkeletonText>` which requires consumer-supplied wrapper attrs).

## WCAG criteria covered

| SC | Criterion | How the chassis satisfies it |
|---|---|---|
| **1.4.3** (AA) | Contrast (Minimum) | Title color tokens chosen for ≥4.5:1 contrast on Lunaris dark backgrounds: `var(--foreground-muted)` (loading/empty), `var(--destructive)` (error/disconnected), `var(--muted-foreground)` (disabled). Detail text always uses `var(--muted-foreground)` (≥4.5:1) |
| **1.4.13** (AA) | Content on Hover or Focus | N/A — PanelStatus has no hover-revealed content |
| **2.1.1** (A) | Keyboard | Retry button is real `<button type="button">`; ENTER/SPACE activates `onClick`. `action` snippet is consumer's responsibility |
| **2.3.3** (AAA) | Animation from Interactions | `@media (prefers-reduced-motion: reduce)` stops the loading spinner. Static circle when motion-reduction is requested |
| **2.4.3** (A) | Focus Order | Retry button is in TAB order by default (button is natively focusable) |
| **2.5.5** (AAA) | Target Size | Retry button: 6+11+6 = 23px height × min 64px width. Meets AA (24×24) at most browser zoom levels; below AAA (44×44) for compact toolbar contexts. For touch surfaces, consumers should pass `class` prop to override sizing |
| **4.1.2** (A) | Name, Role, Value | `title` REQUIRED in TypeScript Props. Retry button has accessible name from `retryLabel` (default `'RETRY'`). Spinner has `aria-hidden="true"` (decorative only) |
| **4.1.3** (AA) | Status Messages | `role="status"` + `aria-live="polite"` on outer div: AT announces title + detail when state changes, without focus shift. `aria-busy="true"` on `state="loading"` tells AT the region is updating |

## ARIA wiring done by the chassis

```html
<div
	class="panel-status panel-status--{state}"
	role="status"
	aria-live="polite"
	aria-busy={state === 'loading'}
>
	<!-- icon OR spinner: aria-hidden="true" (decorative) -->
	<!-- title: visible, AT reads via live region -->
	<!-- detail: visible, AT reads via live region -->
	<!-- retry button: accessible name from retryLabel -->
</div>
```

Key wiring decisions:

- **`role="status"`** + **`aria-live="polite"`** — the standard W3C ARIA APG pattern for status messages that don't interrupt the user's flow. AT queues the announcement and reads it at the next pause.
- **`aria-busy={state === 'loading'}`** — explicitly tied to state. AT may pause re-announcement of stale region content while loading.
- **Spinner / icon get `aria-hidden="true"`** — decorative only. AT reads the title text instead.
- **Retry button is a real `<button type="button">`** — native focusability + keyboard activation. NOT `role="button"` on a `<div>` (which would lose native semantics).
- **No focus management** — when state transitions, focus stays where it was. Consumers handle focus themselves if needed (e.g. moving focus to the retry button after error).

## Why `title` is REQUIRED (not optional)

Same rationale as `<TooltipIcon>`'s `tooltipText`: a status region with no title would be silent to AT. Making the prop REQUIRED in the TypeScript Props interface forces consumers to supply a name at compile time:

```typescript
interface Props {
	state: PanelStatusState;
	title: string;  // REQUIRED — no fallback
	// ...
}
```

A status region without a title violates WCAG 4.1.3 ("AT must know what's loading/erroring"). Compile-time enforcement prevents the violation.

## Consumer obligations

| Owner | Responsibility |
|---|---|
| Chassis | `role="status"`, `aria-live="polite"`, `aria-busy` toggle, retry button keyboard support, reduced-motion compliance |
| **Consumer** | Pass DESCRIPTIVE `title` (e.g. `'WIRESHARK UNAVAILABLE'` not `'Status'`); set `state` reactively when underlying condition changes; for touch surfaces, override retry button sizing via `class` prop |

## Keyboard interactions

| Key | Behavior |
|---|---|
| TAB | Moves focus to retry button (if rendered) |
| ENTER / SPACE on retry button | Activates `onRetry` callback |
| TAB inside `action` snippet | Whatever the snippet provides (consumer's responsibility) |

The chassis adds NO custom keyboard handlers beyond what the retry button natively does.

## Focus management

- **State transitions DO NOT shift focus.** If user is mid-typing in a form when an unrelated panel transitions to `state="error"`, their focus stays where it was. AT announces the error via the live region without disrupting input.
- **Retry button is NOT auto-focused** when `state` becomes `error` or `disconnected`. Auto-focus would steal keyboard focus; always disruptive. Consumer can override via `tick().then(() => button.focus())` if a specific UX requires it.
- **`role="status"` is NOT focus-trapped** — TAB navigates through normally.

## Screen reader behavior

| AT | Behavior on state transition |
|---|---|
| NVDA | Announces "title detail" (live region polite). Re-announces on state change |
| JAWS | Same pattern; some versions silently honor live regions on rapid transitions |
| VoiceOver (Mac) | Announces "title detail" + "RETRY button" if action present |
| TalkBack | Announces title + detail; retry button focusable via swipe |

**Caveat**: rapid state transitions (>1 per second) may cause AT to skip announcements (live region debouncing). For UX with frequent transitions (e.g. real-time status indicators), consider `aria-live="off"` + manual announcement via a separate `<div role="status">` that updates less frequently.

## Reduced-motion compliance

The intrinsic spinner respects `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
	.panel-status__spinner {
		animation: none;
	}
}
```

When motion-reduction is requested, the spinner becomes a static ring. State semantics (`aria-busy="true"`, title text) remain intact — only the visual rotation stops.

## Common a11y pitfalls

1. **Generic `title`** (`'Status'`, `'Error'`) — useless to AT users. Use action-verb titles: `'CONNECTING...'`, `'WIRESHARK UNAVAILABLE'`, `'ERROR LOADING REPORTS'`.
2. **State left at `'loading'` after operation completes** — AT keeps thinking the region is loading. Always flip `state` reactively.
3. **Custom `icon` snippet with no `aria-hidden`** — if the icon component renders an `<svg>` without `aria-hidden`, AT may double-announce. The chassis wraps the icon slot in `aria-hidden="true"` div, but consumer's icon component should ALSO have `aria-hidden="true"` if it's purely decorative.
4. **`action` snippet with multiple buttons but no clear focus order** — TAB order follows DOM order; arrange buttons in priority order (primary action first).
5. **Long `detail` strings** — anything > 2 sentences becomes a wall-of-text. Move long content into a Modal or InlineNotification.
6. **Touch surfaces with default retry button sizing** — 23px height meets AA but not AAA target size. Override via `class` prop for touch-first surfaces.

## Verification (Phase 8.4 canary keyboard map)

For the WiresharkView canary:

- [ ] When `serviceStatus = 'checking'`: AT announces "CONNECTING... Spawning Xtigervnc + Wireshark Qt frontend + websockify"
- [ ] `aria-busy="true"` set during loading state (verify via DOM inspection)
- [ ] Spinner animates (or stays static if `prefers-reduced-motion: reduce`)
- [ ] When `serviceStatus = 'error'`: AT announces "CONNECTION FAILED Unknown error RETRY button"
- [ ] TAB navigates to RETRY button; focus ring visible (Lunaris accent via `var(--ring)`)
- [ ] ENTER on RETRY button activates `reconnect()`
- [ ] When `serviceStatus = 'disabled'`: AT announces "WIRESHARK DISABLED Preflight failed" (NO retry button rendered)
- [ ] When `serviceStatus = 'stopped'`: AT announces "WIRESHARK UNAVAILABLE Service not running START CAPTURE button"

## Phase 7 audit alignment

Phase 7 (a11y audit + dead-code cleanup) re-tests every loading-state surface against axe-core + manual NVDA/VoiceOver/TalkBack smoke. PanelStatus consumers inherit the chassis's `role="status"` discipline; defects file against the chassis, not consumers. The `title`-REQUIRED enforcement guarantees Phase 7 audit cannot find unlabeled-status-region violations on PanelStatus consumers.
