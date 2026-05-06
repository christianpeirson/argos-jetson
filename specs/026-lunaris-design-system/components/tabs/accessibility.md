# Tabs — Accessibility

Carbon Tabs implements the W3C ARIA APG **Tabs** pattern (<https://www.w3.org/WAI/ARIA/apg/patterns/tabs/>) end-to-end. The chassis wrapper does NOT re-implement ARIA, focus, or keyboard logic; it forwards a thin id-keyed API to Carbon and Carbon does the rest. Per spec-026 authority precedence, Carbon source wins on a11y semantics.

## WCAG 2.2 success criteria covered

| SC                           | How Tabs satisfies it                                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.3.1 Info and Relationships | `role="tablist"` parent + `role="tab"` children + `aria-selected` express the relationship to AT                                                                                              |
| 1.4.1 Use of Color           | Active tab is signaled by accent underline AND text-color shift; warning state pairs `var(--warning)` color with the user-visible tab label (color is never the only signal)                  |
| 1.4.3 Contrast (Minimum)     | `$text-secondary` → `var(--ink-3)` mapping on inactive labels meets ≥ 4.5:1 against `var(--card)` (verified in Phase 0 token mapping)                                                         |
| 1.4.11 Non-text Contrast     | Selected-tab underline (`$interactive` / `var(--accent)`) ≥ 3:1 against background; focus outline same                                                                                        |
| 2.1.1 Keyboard               | Carbon implements full ARIA APG keyboard map (Tab to enter, Arrow Left/Right between tabs, Space/Enter to activate, Tab to leave)                                                             |
| 2.4.7 Focus Visible          | `bx--tabs__nav-link:focus` shows 2 px outline using `$focus` token (mapped to `var(--accent)`)                                                                                                |
| 4.1.2 Name, Role, Value      | `role="tab"` + `aria-selected` + `aria-disabled` are wired by Carbon; consumer supplies the accessible name via `TabDef.label`                                                                |
| 4.1.3 Status Messages        | Badge `aria-label={`${badge} items`}` (chassis `Tabs.svelte:71`) gives AT a status read of the count; warning state inherits its semantics from the surrounding live region the consumer owns |

## ARIA wiring — Carbon owns vs consumer owes

| Concern                                               | Owner                  | Source                                                                                                       |
| ----------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `role="navigation"` outer wrapper                     | Carbon                 | `Tabs.svelte` template root                                                                                  |
| `role="tablist"` on `<ul>`                            | Carbon                 | `Tabs.svelte` `<ul role="tablist">`                                                                          |
| `role="presentation"` on `<li>`                       | Carbon                 | `Tab.svelte` `<li role="presentation">`                                                                      |
| `role="tab"` on `<a>`                                 | Carbon                 | `Tab.svelte` `<a role="tab">`                                                                                |
| `aria-selected="true                                  | false"`                | Carbon                                                                                                       | derived from `selected` index                            |
| `aria-disabled="true                                  | false"`                | Carbon                                                                                                       | derived from per-Tab `disabled` prop                     |
| `tabindex="0                                          | -1"` (roving tabindex) | Carbon                                                                                                       | `Tab.svelte` — only the selected tab is in the tab order |
| Arrow-key handler + skip-disabled                     | Carbon                 | `Tab.svelte:96-106` keyboard handler                                                                         |
| Meaningful tab labels                                 | Consumer               | `TabDef.label` — must be a verbless noun phrase, sentence case                                               |
| Badge accessible name                                 | Chassis                | `aria-label={`${badge} items`}` at `chassis/forms/Tabs.svelte:71`                                            |
| Per-tab content `role="tabpanel"` + `aria-labelledby` | Consumer               | Caller renders content; if rendering panels, set `role="tabpanel"` and `aria-labelledby` matching the tab id |

## Keyboard interactions

| Key              | Behavior                                                                               |
| ---------------- | -------------------------------------------------------------------------------------- |
| TAB into tablist | Focus lands on the currently selected tab (roving tabindex)                            |
| ARROW LEFT       | Move focus to previous enabled tab; wraps to last when at first                        |
| ARROW RIGHT      | Move focus to next enabled tab; wraps to first when at last                            |
| ARROW UP / DOWN  | NOT bound (horizontal-only orientation)                                                |
| HOME             | Focus first enabled tab                                                                |
| END              | Focus last enabled tab                                                                 |
| SPACE / ENTER    | Activate the focused tab (sets `aria-selected="true"` and fires `on:change`)           |
| TAB out          | Move focus to next focusable element AFTER the tablist (typically the active tabpanel) |
| Disabled tabs    | Auto-skipped by arrow-key navigation (Carbon `Tab.svelte:96-106`)                      |

These behaviors are NOT re-implemented by the wrapper. **Do not add custom keyboard handlers** — they would compete with Carbon's APG-conformant handler and cause regressions like "Arrow Right doesn't wrap" or "Disabled tab steals focus."

## Focus management

- Roving tabindex: only one tab in the tablist is `tabindex="0"` at any time (the active one); all others are `tabindex="-1"`. This is a standard ARIA APG pattern that keeps the tablist as a single tab stop.
- After activation: focus stays on the activated tab. Carbon does NOT auto-move focus into the panel — the consumer's panel content gets focus only on the next user TAB. This matches APG "Tabs with Manual Activation" behavior.
- The chassis preserves Carbon's behavior; do not add `bind:this` + `.focus()` calls in consumers unless a specific UX justification exists.

## Screen reader behavior

- **NVDA / JAWS (Windows)**: announces "tab list, N items" entering the tablist; "selected, [label], tab" on the active tab; "[label], tab" on inactive ones; "[label], tab, dimmed" on disabled.
- **VoiceOver (macOS / iOS)**: "tab group, [label], selected" / "[label], tab"; honors `aria-disabled="true"` as "dimmed."
- **TalkBack (Android)**: similar to VoiceOver; the badge `aria-label="{n} items"` reads as "5 items, [label], tab."
- **Badge announcement**: the chassis sets `aria-label={`${badge} items`}` on the badge `<span>` (`chassis/forms/Tabs.svelte:71`). AT may read this twice if it also reads the visible badge text — that's acceptable; clarity wins over terseness here.

## Common pitfalls

### CRITICAL — do not nest interactives inside `role="tab"`

ARIA APG forbids nesting interactive elements (buttons, links, inputs) inside an element with `role="tab"`. The consequence: a per-tab close-X `<button>` inside a tab is non-conformant and breaks AT keyboard navigation (Arrow keys land on the tab, then Tab key gets stolen by the inner button, then arrow keys no longer cycle tabs).

**Why this matters for Argos**: `src/lib/components/dashboard/TerminalTabBar.svelte` wants per-tab close-X affordances (terminal-tab pattern). It **cannot** migrate to Carbon `<Tabs>` for this reason. It needs a future `EditorTabBar` chassis category implemented as a composite widget (e.g., a toolbar with each tab as a `role="tab"` PLUS a sibling `role="button"` close affordance grouped under a parent that handles focus management explicitly). This is deferred to a sub-phase after Phase 5 — see `usage.md` "Deferred" section.

### Other pitfalls

- **Don't use Tabs for sequential workflow** — use ProgressIndicator. Tabs imply peer views, not ordered steps.
- **Don't omit `TabDef.label`** — even if you render an icon, screen readers need a name. Use `aria-label`-equivalent text in `label` and let the icon supplement.
- **Don't bind `selectedId` to a value not in `tabs[*].id`** — the chassis `$derived` index will fall back to 0 and silently activate the first tab.
- **Don't put more than ~7 tabs** — horizontal scroll Tabs are hostile to keyboard users (Arrow keys don't auto-scroll the tablist into view in all browsers).

## Verification (PR-A canary keyboard map)

For PR-A, manually verify the DeviceSubTabs canary against this checklist:

- [ ] TAB into Tabs → focus ring visible on currently selected tab (Lunaris accent color)
- [ ] ARROW RIGHT → focus moves to next enabled tab; disabled tabs skipped
- [ ] ARROW LEFT at first tab → wraps to last
- [ ] HOME → focuses first enabled tab; END → focuses last
- [ ] SPACE on focused tab → activates it; `selectedId` updates; panel content swaps
- [ ] ENTER on focused tab → same as SPACE
- [ ] TAB out → focus leaves tablist to next focusable element
- [ ] Screen reader announces "tab list, 6 items" + "selected, BLE, tab" + "5 items" badge

Failures are blockers. The brittleness mode is when CSS overrides accidentally break `:focus-visible` — fix by extending `lunaris-carbon-theme.scss` rather than working around in component CSS.

## Phase 7 audit

Phase 7 (a11y audit + dead-code cleanup) re-tests every chassis in this spec dir against axe-core + manual screen-reader smoke (NVDA / VoiceOver / TalkBack). Defects found there are filed against the wrapper, not the consumer. The Lunaris wrapper is the choke point — fix once, all 4 Tabs consumers benefit.
