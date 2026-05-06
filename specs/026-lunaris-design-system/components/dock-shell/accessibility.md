# DockShell — Accessibility

`<DockShell>` is a **layout shell** that positions two consumer-provided panels. It owns no interactive controls itself; the dock-mode switch is a consumer-side affordance (button row inside the secondary panel header).

## ARIA pattern

No ARIA role applied to the shell root. The shell renders semantic regions for primary and secondary content:

```html
<div class="dock-shell-root" data-dock="right">
  <section class="dock-primary" aria-label={primaryLabel ?? 'Primary panel'}>
    <!-- consumer primary snippet -->
  </section>
  <section class="dock-secondary" aria-label={secondaryLabel ?? 'Secondary panel'}>
    <!-- consumer secondary snippet -->
  </section>
</div>
```

The shell exposes optional `primaryLabel` / `secondaryLabel` props for consumers to set landmark labels (used by screen reader landmark navigation). Defaults are generic; consumers should set descriptive labels (e.g., `'TMUX session grid'` and `'Workflows panel'`) for AGENTS.

If the secondary panel is `dock === 'hidden'`, its `<section>` is not rendered (rather than `display: none`) — landmark navigation should not surface a hidden region.

## DOM structure

```html
<div class="dock-shell-root" data-dock="right">
	<section class="dock-primary" aria-label="...">
		<!-- primary -->
	</section>
	<section class="dock-secondary" aria-label="...">
		<!-- secondary -->
	</section>
</div>
```

Both `<section>` elements are landmark roles. Screen reader landmark navigation (NVDA `D`, JAWS `R`, VoiceOver rotor) lists them with their `aria-label`.

## Visual contrast

The shell only contributes a `--mk2-line` (#2E2E2E) divider between panels:

| Element      | Token                  | Background           | Ratio | Status                                                         |
| ------------ | ---------------------- | -------------------- | ----- | -------------------------------------------------------------- |
| Divider line | `--mk2-line` (#2E2E2E) | `--mk2-bg` (#0A0A0A) | 1.6:1 | Non-text contrast (WCAG 1.4.11 requires 3:1 for UI components) |

The 1px divider is **decorative**, not a UI component — it does not convey state and cannot be interacted with. WCAG 1.4.11 (Non-text Contrast) does not apply to purely decorative borders. If future feedback considers the divider too subtle, bump to `--mk2-line-2` for a 3:1+ ratio.

## Keyboard navigation

The shell is **not focusable** and produces no tab stops. Keyboard navigation flows naturally through the focusable content of `primary` and `secondary` panels (consumer-managed).

Tab order:

1. All focusable elements in `primary` (in DOM order)
2. All focusable elements in `secondary` (in DOM order)

This is determined by DOM order, not visual dock-side. For most dock modes (right / bottom) DOM order matches visual order. For `dock === 'left'` or `dock === 'top'`, DOM order is `primary` → `secondary` while visual order is `secondary` → `primary`.

This deliberate choice keeps tab order **stable across dock changes** — the user's mental model of "tab through TMUX, then tab into Workflows" doesn't break when they switch dock side. Visual reflow does not reorder focus.

## Screen reader behavior

Landmark navigation lists both panels with their `aria-label`. Reading order is DOM order (primary first), not visual order. Same rationale as tab order — the SR experience is stable across dock changes.

If a consumer needs the secondary panel to read first (e.g., a toolbar that should be discovered before content), they can pass the dock-controls panel as `primary` and the content as `secondary`. The chassis is dock-side-agnostic.

## Color independence

The shell conveys no information through color alone. The dock side is a layout property only — its current value is communicated to assistive tech via the `aria-pressed` state on the dock-control buttons in the consumer's secondary panel header (NOT the shell itself).

## WCAG 2.1 AA criteria

| Criterion                    | Status           | Notes                                                      |
| ---------------------------- | ---------------- | ---------------------------------------------------------- |
| 1.3.1 Info and Relationships | PASS             | Both panels exposed as labeled landmarks                   |
| 1.4.3 Contrast (Minimum)     | N/A              | Shell is layout only; no text                              |
| 1.4.10 Reflow                | PASS             | All dock modes work in narrow viewports; CSS grid handles  |
| 1.4.11 Non-text Contrast     | N/A (decorative) | Divider is decorative, not UI component                    |
| 2.1.1 Keyboard               | PASS             | No keyboard traps; tab flows through content               |
| 2.4.1 Bypass Blocks          | PASS             | Both panels are landmarks                                  |
| 2.4.6 Headings and Labels    | PASS             | Consumer provides `aria-label` per panel                   |
| 4.1.2 Name, Role, Value      | PASS             | `<section>` + `aria-label` provides name; role is landmark |

## Dock-control buttons (consumer responsibility)

The dock-mode chip buttons (◧ ⬒ ⬓ ◨ ×) live inside `secondary` (per design archive `WorkflowsPanel`). They are consumer's responsibility to make accessible:

- Each chip should be a `<button>` with `aria-pressed={dock === chipMode}`.
- Each chip should have a discernible accessible name — `aria-label="Dock left"`, `aria-label="Hide panel"` etc.
- Visual symbols (◧ ⬒ ⬓ ◨ ×) are decorative; the `aria-label` provides the accessible name.
- The chip button group should optionally be wrapped with `role="group"` and `aria-label="Dock controls"` for SR landmark navigation.

`<DockShell>` ships the layout. The dock UI is a consumer concern.

## Reduced motion

The shell does not animate dock changes in v1. No `prefers-reduced-motion` opt-out needed.

## Testing

Visual diff against design archive in 9.3 AGENTS work. Add a Playwright test asserting:

1. Tab order is stable across dock-mode changes.
2. Both panels are reachable via landmark navigation when not hidden.
3. Setting `dock === 'hidden'` removes the secondary landmark.
