# EditorTabBar — Accessibility

`<EditorTabBar>` implements the **WAI-ARIA APG Toolbar pattern** (https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) with a horizontal roving-tabindex over alternating `role="tab"` + close `<button>` siblings. The chassis exists specifically to retire the W3C ARIA APG violation that was present in the pre-migration `TerminalTabBar.svelte` (close `<button>` nested inside `role="tab"` — forbidden by the APG **Tabs** pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

## No Carbon source

Carbon's `<Tabs>` provides `<a role="tab">` anchors with no slot for nested interactives — by APG design. There is no Carbon primitive that legally supports per-tab close affordance. EditorTabBar is a bespoke composite.

## ARIA pattern choice

| Pattern considered | Verdict | Reason |
|---|---|---|
| `role="tablist"` + `role="tab"` + nested close `<button>` | **REJECTED** | APG Tabs pattern forbids nested interactives — the original violation |
| `role="tablist"` + sibling close button OUTSIDE tab | Rejected | APG-canonical tablist forbids extra interactives between tabs in DOM order; complicates focus traversal |
| `role="toolbar"` + sibling tab/close `<button>` pairs | **ACCEPTED** | Industry pattern (VS Code, Chrome). Sibling buttons are valid in toolbars; roving traverses both |
| Card-like + Cmd+W shortcut only | Rejected | Fails WCAG 2.1.1 (keyboard parity) for mouse-less close without a documented + visible shortcut hint |

## ARIA wiring done by the chassis

```html
<div role="toolbar" aria-label={ariaLabel} aria-orientation="horizontal">
	<button role="tab" aria-selected={isActive} tabindex={isCurrent ? 0 : -1}>
		<span aria-hidden="true">{icon}</span>
		<span>{title}</span>
	</button>
	<button type="button" tabindex={isCurrent ? 0 : -1} aria-label={`Close ${title}`}>×</button>
	<!-- ...repeated per tab... -->
	<div>{trailing snippet — Tab-reachable, not arrow-reachable}</div>
</div>
```

Key wiring decisions:

- **`role="toolbar"`** + **`aria-orientation="horizontal"`** — APG Toolbar pattern. Tells AT this is a horizontal grouping of related controls navigable via arrow keys.
- **`aria-label` (REQUIRED in spec, default `'Editor tabs'`)** — identifies the toolbar. Without this, AT users hear only "toolbar" with no context.
- **`role="tab"` on the SELECT half** + `aria-selected` — preserves "this is a tab strip" semantics. AT announces "tab, selected" / "tab, not selected".
- **`<button type="button">` for close** + `aria-label="Close <title>"` — interpolates the tab title so AT announces "Close terminal one button" not just "Close button".
- **Roving tabindex** — exactly one item carries `tabindex=0`; all others `tabindex=-1`. Prevents Tab key from cycling through every tab/close (which would be ~16 stops for an 8-session terminal panel).
- **Close button is SIBLING, not descendant** — the original APG violation is structurally impossible.
- **`<span aria-hidden="true">` for icons** — decorative; AT reads the title text instead.

## WCAG criteria covered

| SC | Criterion | How the chassis satisfies it |
|---|---|---|
| **1.1.1** (A) | Non-text Content | Icons are `aria-hidden="true"`; close button has accessible name via `aria-label="Close <title>"` |
| **1.4.3** (AA) | Contrast (Minimum) | Foreground tokens chosen for ≥4.5:1 contrast on Lunaris dark surfaces (`var(--card)` #1A1A1A active background vs `var(--foreground)` #FFF) |
| **1.4.11** (AA) | Non-text Contrast | Focus ring `2px solid var(--ring)` exceeds 3:1 contrast vs `var(--card)` and `var(--background)` |
| **2.1.1** (A) | Keyboard | Every operation (switch, close) reachable via keyboard. Roving arrows + Enter/Space handle activation |
| **2.1.2** (A) | No Keyboard Trap | Tab key exits the toolbar normally; arrow keys wrap but never block exit |
| **2.4.3** (A) | Focus Order | Tab key enters at the active tab (the only `tabindex=0`). Arrow keys cycle; trailing snippet is reached via Tab |
| **2.4.7** (AA) | Focus Visible | `:focus-visible` outline 2px solid `var(--ring)` on every interactive descendant |
| **2.5.5** (AAA partial) | Target Size | Tabs are 32px tall × ≥48px wide. Close button has 16×16px hit zone (passes AA 24×24 via padding; below AAA 44×44 — acceptable for compact editor strip) |
| **4.1.2** (A) | Name, Role, Value | Toolbar has accessible name. Tab role + aria-selected + name. Close button has interpolated aria-label |
| **4.1.3** (AA) | Status Messages | N/A — the chassis itself emits no live messages. Consumer's `onActivate` callback is responsible for announcing "Switched to <title>" if relevant |

## Keyboard interactions

| Key | Behavior |
|---|---|
| **Tab** | Enter the toolbar at the current item (active tab on first entry). Tab again exits to next focusable element after the toolbar |
| **Shift+Tab** | Reverse — exits backwards |
| **ArrowRight** | Move cursor to next item; wraps from last to first |
| **ArrowLeft** | Move cursor to previous item; wraps from first to last |
| **Home** | Move cursor to first item (always a tab) |
| **End** | Move cursor to last item (last tab's close button if `onClose` provided, else last tab) |
| **Enter / Space on tab** | Fire `onActivate(id)`. Does NOT fire `onClose` |
| **Enter / Space on close button** | Fire `onClose(id)`. Does NOT fire `onActivate` |

## Focus management

- **Cursor restoration after close**: when consumer removes the closed tab from `tabs`, the chassis `$effect` clamps `cursorIdx` to the new max. The next item slides into focus automatically.
- **Selection ≠ focus**: APG Toolbar pattern allows focus to roam without changing selection (unlike APG Tabs, which couples them). Selection only changes when the user explicitly activates a tab via Enter/Space/click.
- **No focus trap** — Tab key always exits the toolbar.

## Screen reader behavior

| AT | Behavior |
|---|---|
| **NVDA** | "Editor tabs toolbar. Terminal one tab, selected. 1 of 6." Arrow Right → "Close Terminal one button. 2 of 6." Arrow Right → "Terminal two tab, not selected. 3 of 6." |
| **JAWS** | Same pattern with toolbar/tab announcements |
| **VoiceOver (Mac)** | "Editor tabs, toolbar, 6 items. Terminal one, selected, tab." |
| **TalkBack** | Same pattern; close button announces "Close Terminal one, button" |

**Caveat**: when Carbon's Tab `aria-selected` flips on `onActivate`, AT may briefly speak both old and new selections. Acceptable for editor-style tabs (user expects selection feedback). For >2 rapid switches per second, consider `aria-live="polite"` debounce — not implemented in v1.

## Why nested-interactive is a real-world bug

In the pre-migration `TerminalTabBar`:

1. AT user lands focus on a tab via Tab key (`tabindex="0"`).
2. AT user presses Tab again — focus moves INTO the nested close `<button>` (still inside the same `role="tab"`).
3. AT user presses Tab again — focus exits the entire tablist, skipping all subsequent tabs.

Result: arrow-key tab cycling never engages, second-and-later tabs become keyboard-unreachable, close affordance double-counts as a tab stop. Real defect, not a theoretical APG nit.

## Consumer obligations

| Owner | Responsibility |
|---|---|
| Chassis | `role="toolbar"`, `aria-label`, `aria-orientation`, roving tabindex, all keyboard handlers, focus restoration on close |
| **Consumer** | Pass DESCRIPTIVE `tabs[i].title` (becomes part of close button's `aria-label`); maintain stable `tabs[i].id` across renders; pick new `activeId` after closing the active tab; pass meaningful `ariaLabel` if "Editor tabs" is ambiguous (e.g. "Terminal sessions" for TerminalPanel) |

## Verification (Phase 8.6 canary keyboard map)

For the TerminalPanel canary:

- [ ] Tab key from outside enters the toolbar at the active tab.
- [ ] ArrowRight from active tab moves focus to its close button.
- [ ] ArrowRight from close button moves focus to the next tab.
- [ ] Home/End jump to first/last items.
- [ ] Enter on tab activates `setActiveSession(id)`.
- [ ] Enter on close button calls `onCloseSession(_, id)`.
- [ ] After closing the active tab, focus lands on the previous tab (consumer-managed `activeId`).
- [ ] Trailing "+ new" button reachable via Tab (not arrow keys).
- [ ] axe-core scan with `wcag2a/wcag2aa/wcag21a/wcag21aa` returns `violations: []`.
- [ ] NVDA announces "Terminal sessions toolbar. Bash tab, selected. 1 of N."

## Phase 7 audit alignment

Phase 7 (a11y audit) found the original `TerminalTabBar` nested-interactive violation but deferred fix to Phase 8.6 because Carbon Tabs has no migration path. This spec closes that audit row.
