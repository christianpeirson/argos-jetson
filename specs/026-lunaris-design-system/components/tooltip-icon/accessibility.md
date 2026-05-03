# TooltipIcon — Accessibility

Carbon TooltipIcon's a11y model treats the trigger as a real `<button type="button">` with `aria-describedby` linking to a hidden `<span class="bx--assistive-text">` containing the tooltip text. Screen readers announce the descriptive text on focus.

## WCAG criteria covered

| SC | Criterion | How the wrapper satisfies it |
|---|---|---|
| **1.4.3** (AA) | Contrast (Minimum) | Token mapping: `$icon-secondary` on parent surface (≥4.5:1); popover `$text-inverse` on `$background-inverse` (≥7:1) when shown |
| **1.4.13** (AA) | Content on Hover or Focus (dismissible/persistent/hoverable) | Carbon TooltipIcon: dismissible (Esc closes), persistent (`leaveDelayMs=300` default), hoverable (mouse can enter popover area) |
| **2.1.1** (A) | Keyboard | Trigger is real `<button type="button">`; ENTER/SPACE activates `onClick`; ESC closes tooltip if open |
| **2.4.3** (A) | Focus Order | Trigger is in TAB order by default (button is natively focusable) |
| **2.5.5** (AAA) | Target Size | Default Carbon trigger button minimum is set by Carbon's `_tooltip.scss` (typically 24×24+ px); Argos `size=16` icons inside default trigger meet AA (24×24+) but not AAA (44×44). For touch-screen surfaces, override `size={24}` or `size={32}` |
| **4.1.2** (A) | Name, Role, Value | **`tooltipText` is REQUIRED in the chassis Props interface** — chassis enforces at compile time so an unlabeled icon button cannot ship. `aria-describedby` references the hidden assistive-text span |
| **4.1.3** (AA) | Status Messages | TooltipIcon does NOT toggle `aria-expanded` (it's not a popup-trigger pattern — it's an action button with descriptive text). Status announcements happen via `aria-describedby` content, which AT reads on focus |

## ARIA wiring done by Carbon

Carbon TooltipIcon auto-wires (`TooltipIcon.svelte` source):

```html
<button
	type="button"
	class="bx--tooltip__trigger"
	aria-describedby={tooltipId}
	{disabled}
	onclick={...}
>
	<span class="bx--assistive-text" id={tooltipId}>{tooltipText}</span>
	<svelte:component this={icon} aria-hidden="true" {size} />
</button>
```

Key wiring decisions:

- **`aria-describedby`, NOT `aria-haspopup`** — distinguishes from chassis `<Tooltip>` which uses `aria-haspopup="true"`+`aria-expanded`. TooltipIcon is an action button with supplementary description; Tooltip is a popup-trigger info-icon. AT announces them differently.
- **`<span class="bx--assistive-text">`** — visually hidden via `clip-path: inset(50%)` (Carbon a11y SCSS) but readable by screen readers.
- **`aria-hidden="true"` on the icon** — prevents AT from announcing the SVG separately; only the assistive-text span is announced.
- **`type="button"`** — explicit non-submit type prevents accidental form submissions when used in form contexts.
- **ESC handler** — closes the popover and returns focus to the trigger.

The Lunaris wrapper does not override any of this; it only enforces the **REQUIRED `tooltipText`** at the TypeScript boundary.

## Why `tooltipText` is REQUIRED (not optional with a default)

Chassis `<Tooltip>` defaults `iconDescription = 'More information'` — generic but a safe baseline name (per Phase 4 PR-A CR fix `74211d8d`). TooltipIcon does NOT mirror this pattern.

**Reason**: chassis `<Tooltip>` renders its OWN info-icon trigger (the `Information` glyph). A generic default name on a generic info-icon is OK — it accurately describes the trigger's purpose. The consumer should override but the default is acceptable.

TooltipIcon wraps an EXISTING icon button. The icon glyph is the consumer's choice (Trash2, Send, Save, etc.) — semantically meaningful per surface. A default `tooltipText='More information'` would be **a lie** — the button isn't asking for more information; it's "Clear chat" or "Save" or "Refresh." Forcing the consumer to supply the actual action name at compile time prevents the lie:

```ts
interface Props {
	tooltipText: string;  // REQUIRED — no fallback
	icon: Component;       // REQUIRED — no fallback
	// ...
}
```

TypeScript errors at the consumer call site if either is omitted. WCAG 4.1.2 violation cannot ship.

## Consumer obligations

| Owner | Responsibility |
|---|---|
| Carbon | `aria-describedby`, `<span class="bx--assistive-text">`, `aria-hidden` on icon, ESC-to-close, hoverable popover |
| Chassis | REQUIRED `tooltipText` and `icon` in TypeScript; default `enterDelayMs=100` / `leaveDelayMs=300`; bridge events to Svelte-5 callbacks |
| **Consumer** | Pass a **descriptive action-verb `tooltipText`** (e.g. `'Clear chat'`, `'Send message'`, `'Refresh devices'` — not `'More information'`); pick a semantically-matched icon (trash for delete, send for submit, etc.); for touch surfaces, set `size={24}` or `size={32}` to meet 2.5.5 AAA target size |

## Keyboard interactions

| Key | Behavior |
|---|---|
| TAB | Moves focus to the trigger button (button is natively in TAB order) |
| ENTER / SPACE on trigger | Activates `onClick` (action handler) |
| ESC (tooltip open) | Closes tooltip, focus stays on trigger |
| Mouse hover on trigger | Opens tooltip after `enterDelayMs` (100 ms default) |
| Mouse leave from trigger | Closes after `leaveDelayMs` (300 ms default) |
| Focus on trigger | Opens tooltip (focus = hover-equivalent for keyboard users) |
| Blur from trigger | Closes tooltip |

The chassis wrapper does NOT add custom keyboard handlers.

## Focus management

- **Open via keyboard**: trigger keeps focus; AT reads `aria-describedby` content.
- **Close via ESC**: focus stays on trigger (no focus shift).
- **Close via blur**: focus moves to next page-level focusable.
- **Tooltip popover does NOT trap focus** — it's not a modal. Users TAB through normally.

## Screen reader behavior

| AT | Behavior |
|---|---|
| NVDA | Reads "[tooltipText] button" on focus → ENTER activates → action fires |
| JAWS | Same pattern; some versions read tooltipText via virtual cursor too |
| VoiceOver (Mac) | Reads "[tooltipText] button" → SPACE/ENTER activates |
| TalkBack | Reads trigger label + "button"; double-tap activates |

## Warm-handoff store note (`activeTooltipIcon`)

Carbon's `tooltip-icon-store.js` exports an `activeTooltipIcon` Svelte writable store. When any TooltipIcon opens, it writes its internal `tooltipId` symbol to the store. Adjacent TooltipIcons subscribe to this store and SKIP the `enterDelayMs` if a sibling is already open — visual effect: rapid mouse-scan over a row of TooltipIcons feels instant after the first hover.

A11y impact: this is a hover-feel UX, not a structural a11y concern. Keyboard navigation between adjacent TooltipIcons via TAB still triggers normal focus-open behaviour (no warm-handoff for keyboard — focus delay is intentional to give AT time to announce).

Phase 8.1 has only one TooltipIcon site (AgentChatToolbar — single isolated trigger), so the warm-handoff store is dormant. It activates automatically when Phase 8.4+ adds multi-TooltipIcon panels.

## Common a11y pitfalls

1. **Generic `tooltipText`** — `'More information'` (chassis `<Tooltip>` default) is wrong here. Use the action verb: `'Clear chat'`, `'Save'`, `'Refresh'`. Prevents AT lying to the user.
2. **Decorative-only icon** (no semantic action) — TooltipIcon is for buttons that DO something. For pure decoration, use a `<span aria-hidden="true">` with the icon component directly.
3. **`tooltipText` longer than ~6 words** — short labels read cleanly via `aria-describedby`; long descriptions belong in chassis `<Tooltip>` (popover body), `<InlineNotification>`, or a `<Modal>`.
4. **Icon without sufficient color contrast** — `var(--ink-3)` token meets AA 4.5:1 against `var(--bg-2)` only; don't override to lower-contrast colours without re-checking.
5. **TAB order disrupted by surrounding wrapper** — TooltipIcon's button is natively focusable. If wrapped in a `<div tabindex="-1">` ancestor, the button stays focusable but the wrapper interferes — keep wrappers transparent to focus.
6. **Touch surfaces with `size={16}` default** — 16 px icon inside Carbon's default button chrome lands at ~24×24 — meets AA 2.5.5 but not AAA. For touch-first surfaces (tablets, mission-control panels), override `size={24}` or `size={32}`.

## Verification (Phase 8.1 canary keyboard map)

For the AgentChatToolbar canary (`src/lib/components/dashboard/AgentChatToolbar.svelte`):

- [ ] TAB to TooltipIcon trigger; focus ring visible (Lunaris accent).
- [ ] AT announces "Clear chat button" (NVDA / JAWS / VoiceOver / TalkBack).
- [ ] ENTER activates `onClear` (chat clears).
- [ ] SPACE also activates `onClear` (button keyboard standard).
- [ ] Mouse hover on trigger; tooltip "Clear chat" appears after 100 ms.
- [ ] Mouse leave from trigger; tooltip closes after 300 ms.
- [ ] Focus on trigger via TAB; tooltip opens.
- [ ] Blur from trigger via TAB-out; tooltip closes.
- [ ] ESC while tooltip open; tooltip closes, focus stays on trigger.

## Phase 7 audit alignment

Phase 7 (a11y audit + dead-code cleanup) re-tests every Tooltip/TooltipIcon canary against axe-core + manual NVDA/VoiceOver/TalkBack smoke. Defects file against the chassis wrapper, not consumers — single choke point per spec-026 strategy. The `tooltipText`-REQUIRED enforcement guarantees Phase 7 audit cannot find unlabeled-icon-button violations on TooltipIcon consumers.
