# Text Input — Accessibility

**Status:** Phase 3 canary in progress
**Last updated:** 2026-04-29
**Carbon mirror:** `docs/carbon-website/src/pages/components/text-input/accessibility.mdx`

---

## What Carbon provides for free

Per Carbon TextInput accessibility patterns (`TextInput.svelte` source confirms):

### Semantic structure

- Renders a real `<label for={id}>` paired with `<input id={id}>` — implicit `<label>`-with-input pattern is NOT used; explicit pairing is the WCAG-preferred form.
- `id` defaults to `ccs-${random}` so consumers cannot accidentally produce duplicate `id`s. Adapter passes through optional `id` for cases where consumer needs a stable hook.
- `<label>` is rendered with `bx--label` class; `hideLabel` adds `bx--visually-hidden` (CSS-only hide; screen readers still announce).

### ARIA wiring (verified in Carbon source lines 179-212)

- **`aria-invalid`** set to `true` when `invalid && !readonly`.
- **`aria-describedby`** points to `helper-${id}` / `error-${id}` / `warn-${id}` depending on state — Carbon switches the linked element based on which message is currently visible. Screen reader announces the associated message after the field name.
- **`required`** sets the HTML attribute; browser/AT auto-announces "required".
- **`disabled`** — HTML attribute; AT auto-announces "disabled" + browser removes from tab order.
- **`readonly`** — keeps focus in tab order, AT announces "read only", Carbon adds the `EditOff` visual icon.

### Keyboard interaction

- **Tab / Shift+Tab** — standard browser tab order. No custom trap.
- **Enter inside form** — submits the enclosing `<form>` (Carbon doesn't intercept).
- **Escape** — no Carbon-defined behavior; surrounding modal/flyout chrome handles dismissal.
- **Focus visible** — Carbon's `focus-outline('outline')` mixin renders 2px outline outside the bottom border. Lunaris maps `$focus` → `var(--accent)` (theme overlay).

### Color contrast (Carbon's audit floor)

Carbon's stock theme passes WCAG 2.1 AA. Lunaris token overrides MUST preserve those ratios.

| Pair                                                | Min contrast (AA) | Lunaris target                                          | Status                                   |
| --------------------------------------------------- | ----------------- | ------------------------------------------------------- | ---------------------------------------- |
| Input text (`$text-primary`) on `$field` background | 4.5:1             | `var(--ink)` (oklch 94%) on `var(--bg-2)` (oklch 17%)   | ≈ 14.6:1 ✓ exceeds AAA                   |
| Placeholder (`$text-placeholder`) on `$field`       | 4.5:1             | `var(--ink-4)` (oklch 42%) on `var(--bg-2)` (oklch 17%) | ≈ 3.9:1 ⚠ below AA — **verify in PR3a** |
| Label text on page background                       | 4.5:1             | `var(--ink-2)` (oklch 88%) on `var(--bg)` (oklch 13%)   | ≈ 13.0:1 ✓                               |
| Helper text on page background                      | 4.5:1             | `var(--ink-3)` (oklch 64%) on `var(--bg)`               | ≈ 6.4:1 ✓                                |
| Bottom border (`$border-strong`)                    | 3:1 (graphical)   | `var(--line)` (oklch 34%) on `var(--bg-2)` (oklch 17%)  | ≈ 2.7:1 ⚠ below 3:1 — **verify**        |
| Focus outline (`$focus`)                            | 3:1 (graphical)   | `var(--accent)` ≈ 7.4:1 vs both `--bg` and `--bg-2`     | ✓                                        |
| Invalid state border (`$support-error`)             | 3:1 (graphical)   | `var(--mk2-red)` (#FF5C33) on `var(--bg-2)`             | ≈ 4.8:1 ✓                                |

**Two amber flags** (placeholder, bottom border). Verification step in PR3a: render GpServerForm in chrome-devtools MCP, sample computed colors, compute ratio. If below threshold, escalate to a tokens.md update before PR3a merge.

---

## Argos-specific a11y considerations

### Tap target compliance (WCAG 2.2 SC 2.5.8 + WCAG 2.1 SC 2.5.5)

WCAG 2.2 introduced SC 2.5.8 "Target Size (Minimum)" at the AA conformance level requiring interactive targets ≥ 24×24 CSS pixels. (WCAG 2.1's SC 2.5.5 "Target Size" sets the stricter ≥ 44×44 threshold but only at the AAA level.)

Carbon's `md` size = 40px height — passes 2.5.8 (AA) but not 2.5.5 (AAA). `sm` size = 32px — passes 2.5.8. `xs` density (24px) — exactly at the 2.5.8 threshold, marginal pass. The Argos `data-density="compact"` overlay reaches 28px — passes 2.5.8. None pass 2.5.5 (AAA) without explicit Argos extension; document deviation in Phase 7 audit.

### Label requirement enforcement

Bespoke Argos inputs allowed wrapping the input in a `<label>` element with text content (the GpServerForm pattern). Carbon's `<TextInput>` requires `labelText` prop — wrapping with a parent `<label>` causes label nesting issues for screen readers (multiple "label" announcements).

**Migration rule**: when migrating, REMOVE the parent `<label class="...">` wrapper and pass the text via Carbon's `labelText` prop. The adapter enforces this by making `labelText` required.

### Autocomplete + autofill

Carbon doesn't pre-set `autocomplete` — consumer must specify per-field. The adapter passes `autocomplete` through to Carbon's rest props. Argos guidance:

- Username field: `autocomplete="username"`
- Email field: `autocomplete="email"`
- One-time codes: `autocomplete="one-time-code"`
- Hostnames / portals / freq / MGRS / callsign etc.: `autocomplete="off"` (Argos-specific data not in browser autofill vocabulary)

### Error message timing

Carbon's `aria-describedby` switches between `helper-${id}` and `error-${id}` synchronously when `invalid` flips. Screen readers announce the error on the next focus event or when AT polls the description. For real-time validation (typed character triggers `invalid: true`), the change is announced immediately on next AT cycle — usually within 50ms.

Argos validation in form contexts (GpServerForm, future TAK-enroll, etc.) should debounce client-side validation by ≥250ms to avoid AT-announcement thrash on each keystroke.

### Read-only vs disabled semantics

Argos has historically used disabled-styling for read-only display fields (e.g. "Operator ID" populated server-side). This is wrong per WCAG — disabled removes the field from tab order, hiding the value from sight-impaired users navigating by keyboard. Carbon's `readonly` prop is the correct path: keeps tab order, AT announces "read only", value remains discoverable.

**Migration note for PR3b/PR3c**: audit existing bespoke disabled inputs that are actually read-only display, switch to `readonly`.

---

## Argos extensions to verify (PR3a)

### `data-density` attribute responsiveness

`data-density="comfy|default|compact"` switches input height via CSS custom properties. Carbon's TextInput uses CSS height tokens. Theme overlay must:

1. Map `--cds-text-input-height-sm/md/xl` to Lunaris density tokens.
2. Confirm runtime density switch updates rendered input height.
3. Verify focus ring scales / stays visible at all densities.

PR3a verify: chrome-devtools MCP probe each density on the GpServerForm portal field. Measure `getComputedStyle(input).height`. Pass criterion: matches Lunaris `--row-h` for current density ±2px.

### `data-accent` color switching

`data-accent="amber|green|cyan|magenta"` switches `var(--accent)` at runtime. Carbon TextInput's `$focus` token derives from `$focus-inverse` mappings. Switching accent should re-render the focus ring color on the next focus event. Verify in PR3a via chrome-devtools.

### Browser autofill highlight

Some browsers (Chromium-based) draw a yellow/blue autofill background that overrides `$field`. Lunaris dark theme will look broken under autofill. Mitigation: `:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px var(--bg-2) inset; -webkit-text-fill-color: var(--ink); }` in `lunaris-carbon-theme.scss` if observed in chrome-devtools verification.

---

## Verification checklist (PR3a + Phase 7)

| Check                                | Tool                                  | Pass criterion                                                                 |
| ------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------ |
| WCAG 2.1 AA on GpServerForm route    | `@axe-core/playwright` (`AxeBuilder`) | `violations: []` with `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` tags |
| Label association                    | Playwright `<input>` aria audit       | All inputs have linked `<label for>` or `aria-label`                           |
| Tab order                            | Playwright keyboard nav               | Tab moves portal → username → password → submit-button                         |
| Focus ring visible                   | manual + Playwright `:focus` check    | 2px outline visible at all densities + accents                                 |
| Invalid state announce               | manual NVDA / VoiceOver               | `aria-invalid` + `aria-describedby` invalidText announced                      |
| Color contrast (placeholder, border) | chrome-devtools MCP + axe             | Placeholder ≥ 4.5:1, border ≥ 3:1                                              |
| Density responsiveness               | chrome-devtools MCP                   | Computed height matches `--row-h` for current density                          |
| Accent color switching               | chrome-devtools MCP                   | Focus ring changes color on `data-accent` switch                               |
| Autofill chrome overlay              | chrome-devtools MCP                   | No yellow/blue autofill bg overrides Lunaris colors                            |

Phase 7 includes the full WCAG 2.1 AA audit including all migrated form fields.

---

## Authority citations

- Carbon TextInput a11y mdx: `docs/carbon-website/src/pages/components/text-input/accessibility.mdx`
- Carbon TextInput SCSS: `docs/carbon-design-system/packages/styles/scss/components/text-input/_text-input.scss`
- Carbon Svelte source: `node_modules/carbon-components-svelte/src/TextInput/TextInput.svelte`
- WCAG 2.1: <https://www.w3.org/TR/WCAG21/>
- WCAG 2.5.5 tap target size: <https://www.w3.org/WAI/WCAG21/Understanding/target-size.html>
- ARIA Authoring Practices for input fields: <https://www.w3.org/WAI/ARIA/apg/patterns/>
- axe-core rule reference: <https://dequeuniversity.com/rules/axe/4.9/>
