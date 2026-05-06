# Toggle — Accessibility

`<Toggle>` defers accessibility to Carbon's `<Toggle>` primitive, which implements the WAI-ARIA Switch role pattern (https://www.w3.org/WAI/ARIA/apg/patterns/switch/). The chassis adds two a11y guarantees on top of Carbon's defaults:

1. **`labelText` REQUIRED in TypeScript** — prevents shipping an unlabeled toggle. Same discipline as `forms/Checkbox.svelte` (Phase 3a) and `PanelStatus.svelte` (Phase 8.4).
2. **No sibling `<label>` wrapping** — Carbon owns its own label DOM. Wrapping the chassis in a sibling label (the bits-ui Switch pattern) creates a dual-label situation that can confuse AT.

## ARIA wiring done by Carbon (inherited by the chassis)

```html
<div class="bx--form-item">
	<label id="<auto>" class="bx--label">{labelText}</label>
	<button
		type="button"
		class="bx--toggle__button"
		role="switch"
		aria-checked="{toggled}"
		aria-labelledby="<auto>"
		[aria-disabled="{disabled}]"
	>
		<span aria-hidden="true">{labelA OR labelB}</span>
	</button>
</div>
```

Key wiring decisions:

- **`role="switch"`** — APG Switch pattern. AT announces "switch, on/off" rather than "checkbox, checked/not checked". Better fit for binary settings that take immediate effect.
- **`aria-checked={toggled}`** — REQUIRED by the Switch role. Carbon flips it as `toggled` changes.
- **`aria-labelledby` → labelText** — accessible name comes from the heading label. AT users hear the label even when `hideLabel` visually hides it.
- **Inline state label `<span aria-hidden="true">`** — the "Off" / "On" inline text is decorative; AT announces the state via `aria-checked`, not the visual text.
- **Native `<button>`** — focusable + Enter/Space activation are native. No custom keyboard handlers.

## WCAG criteria covered

| SC                      | Criterion          | How Carbon satisfies it                                                                                                                                                                          |
| ----------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1.4.3** (AA)          | Contrast (Minimum) | Carbon's `$interactive` token chosen for ≥ 4.5:1 contrast against the page background. Lunaris re-binds to `var(--primary)` (steel blue #A8B8E0) which meets AA on `var(--background)` (#111111) |
| **1.4.11** (AA)         | Non-text Contrast  | Track + thumb meet 3:1 against the surrounding surface                                                                                                                                           |
| **2.1.1** (A)           | Keyboard           | Native `<button>`; Enter/Space toggle                                                                                                                                                            |
| **2.1.2** (A)           | No Keyboard Trap   | Tab key exits normally                                                                                                                                                                           |
| **2.4.7** (AA)          | Focus Visible      | Carbon's `2px` focus ring on the track                                                                                                                                                           |
| **2.5.5** (AAA partial) | Target Size        | `48×24px` (default) or `32×16px` (sm). Default passes AA 24×24; sm size below AAA 44×44 — acceptable for compact toolbar contexts                                                                |
| **4.1.2** (A)           | Name, Role, Value  | `role="switch"` + `aria-labelledby` (label) + `aria-checked` (value)                                                                                                                             |
| **4.1.3** (AA)          | Status Messages    | N/A — toggles don't fire live messages. The new state is encoded in `aria-checked` which AT re-announces on focus                                                                                |

## Keyboard interactions

| Key                     | Behavior                         |
| ----------------------- | -------------------------------- |
| Tab                     | Move focus into the toggle       |
| Shift+Tab               | Move focus backwards             |
| Enter / Space on toggle | Flip `toggled`; `onToggle` fires |
| Tab again               | Exit the toggle                  |

No custom keyboard handlers — all behaviour is native `<button>` semantics.

## Focus management

- **State changes do NOT shift focus.** Toggling a setting keeps focus on the toggle so the user can verify the new state and continue.
- **Disabled toggles are skipped in Tab order** (Carbon adds `aria-disabled="true"` and intercepts click).

## Screen reader behavior

| AT              | Behavior                                                   |
| --------------- | ---------------------------------------------------------- |
| NVDA            | "Connect on startup, switch, off." Press Space → "on".     |
| JAWS            | Same pattern with "switch, off / on" announcement          |
| VoiceOver (Mac) | "Connect on startup, switch button, off."                  |
| TalkBack        | Same pattern; toggle state announced as "switch, off / on" |

## Why `labelText` is REQUIRED (not optional)

Same rationale as `<Checkbox>`'s `labelText` and `<PanelStatus>`'s `title`: a toggle with no label is silent to AT users. Compile-time enforcement (TypeScript REQUIRED prop) prevents the violation. Use `hideLabel` if visually unwanted — the label still lives in the a11y tree.

## Consumer obligations

| Owner        | Responsibility                                                                                                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carbon       | `role="switch"`, `aria-checked`, `aria-labelledby`, focus ring, keyboard activation                                                                                                                       |
| Chassis      | TypeScript-enforced `labelText`, Svelte 5 callback bridge, prop forwarding                                                                                                                                |
| **Consumer** | Pass DESCRIPTIVE `labelText` (e.g. `'Connect on startup'` not `'Toggle'`); flip `toggled` reactively when underlying state changes; for icon-only contexts use `hideLabel` rather than dropping the label |

## Common a11y pitfalls

1. **Generic `labelText`** (`'Toggle'`, `'Switch'`) — useless to AT users. Use action-verb labels.
2. **Sibling `<label>` wrapping** (bits-ui legacy pattern) — creates double-label DOM. Drop the wrapper; rely on Carbon's built-in label.
3. **Forgetting to flip `toggled`** — controlled toggle without a setter leaves the state out of sync with the visual.
4. **`hideLabel` without context** — hiding the only label leaves AT users with no clue what the toggle does. Pair `hideLabel` with surrounding context (e.g. a section heading the toggle belongs to).
5. **Toggling something destructive** — switches imply "takes effect immediately". For confirm-required actions use a button + dialog instead.

## Verification (Phase 8.7 canary keyboard map)

For the TakServerForm canary:

- [ ] Tab key from outside lands focus on the toggle.
- [ ] AT announces "Connect on startup, switch, off / on".
- [ ] Space flips `toggled` AND fires `onToggle(true|false)`.
- [ ] Enter does the same as Space.
- [ ] Tab exits the toggle to the next form field.
- [ ] axe-core scan with `wcag2a/wcag2aa/wcag21a/wcag21aa` returns `violations: []` for the form.
