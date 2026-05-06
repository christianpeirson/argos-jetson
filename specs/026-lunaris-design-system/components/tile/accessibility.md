# Tile — Accessibility

**Status:** Phase 9.1 — implementation prep
**Last updated:** 2026-05-04
**Carbon mirror:** `docs/carbon-website/src/pages/components/Tile/accessibility.mdx`
**Carbon sources:**

- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/Tile.svelte>
- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/ClickableTile.svelte>

---

## What Carbon provides for free

Per Carbon Tile accessibility patterns (Tile.svelte + ClickableTile.svelte source confirms):

### Semantic structure

#### `<Tile>` (non-interactive)

- Renders a plain `<div role="presentation">` (or no role — semantic-only div). Tile content drives accessibility — the tile itself is invisible to AT.
- Inner heading levels (`<h2>`, `<h3>`) drive document outline.
- Inner interactive elements (`<button>`, `<a>`) provide focus stops.

#### `<ClickableTile>`

- When `href` is set: renders an `<a href>` whose entire content is the click target. Native link semantics — AT announces "link, [accessible name]".
- When no `href`: renders a `<button>` whose entire content is the click target. Native button semantics — AT announces "button, [accessible name]".
- The accessible name is computed from the inner text content (visible heading + text). For richer names, pass an `aria-label` as the second slot or wrap the visible text in a heading.

### ARIA wiring (verified in Carbon source)

- **`<Tile>`** — no ARIA attributes set. Tile is a transparent container.
- **`<ClickableTile href>`** — renders `<a>` with `href`; `target` and `rel` forwarded.
- **`<ClickableTile>`** (no href) — renders `<button type="button">`; `aria-pressed` NOT set (it's not a toggle); `aria-disabled` set when `disabled={true}`.
- **`<ClickableTile disabled>`** — renders `aria-disabled="true"` and `tabindex="-1"`; `pointer-events: none`. AT announces "link, [name], dimmed" or "button, [name], dimmed".
- **Chevron icon** — `aria-hidden="true"`; the chevron is decorative, the link text is the accessible name.

### Keyboard interaction

#### `<Tile>`

- Not focusable. Tab order skips the tile container; inner interactive elements receive focus per their natural Tab order.

#### `<ClickableTile>`

- **Tab / Shift+Tab** — moves focus to/from the tile.
- **Enter** — activates the link (`<a>`) or button (`<button>`).
- **Space** — activates only when rendered as `<button>` (no `href`); does NOT activate when rendered as `<a>` (Space scrolls the page in browser-native `<a>` behavior).
- **Focus visible** — Carbon's `focus-outline('outline')` mixin renders 2 px outline INSET (not outside). Lunaris maps `$focus` → `var(--accent)`.

### Color contrast (Carbon's audit floor)

Carbon's stock theme passes WCAG 2.1 AA. Lunaris token overrides MUST preserve those ratios.

| Pair                      | Min contrast (AA) | Lunaris target                                     | Status                                                               |
| ------------------------- | ----------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Tile bg vs page bg        | 3:1 (graphical)   | `var(--card)` (#1A) on `var(--background)` (#11)   | ≈ 1.3:1 ⚠ — **Lunaris adds 1 px border to compensate**              |
| Tile border vs page bg    | 3:1 (graphical)   | `var(--border)` (#2E) on `var(--background)` (#11) | ≈ 2.0:1 ⚠ — **falls short; rely on focus ring + content contrast**  |
| Tile content text on tile | 4.5:1             | `var(--ink)` on `var(--card)`                      | ≈ 13.4:1 ✓                                                           |
| Hover bg on page          | 3:1 (graphical)   | `var(--card-hover)` on `var(--background)`         | ≈ 1.5:1 ⚠ — **only-clickable surfaces; AT announces "link/button"** |
| Focus outline             | 3:1 (graphical)   | `var(--accent)` on `var(--card)`                   | ≈ 6.8:1 ✓                                                            |
| Chevron (active hover)    | 3:1 (graphical)   | `var(--accent)` on `var(--card-hover)`             | ≈ 7.0:1 ✓                                                            |
| Chevron (default)         | 3:1 (graphical)   | `var(--ink-3)` on `var(--card)`                    | ≈ 4.2:1 ✓                                                            |

**Two amber flags**: tile-bg vs page-bg and hover-bg vs page-bg. These are Argos-wide deviations from the strict 3:1 graphical floor for non-text UI components. Mitigations:

1. **The 1 px `var(--border)` border** is the primary visual separator (Lunaris addition). 2.0:1 is below floor; falls back to text contrast (≥ 12:1 for tile content) which provides the perceptual cue.
2. **Hover state** is reinforced by cursor-pointer + chevron-color brighten (≥ 4:1 contrast change) — color is not the sole signal.
3. **Focus state** is the AA-compliant signal for keyboard users (6.8:1).

Documented as Phase 7 audit deviation. Acceptable per WCAG 1.4.11 SC reasoning ("UI components" includes only those that "are required to identify a user interface component" — the tile bg is NOT the identifier; the border + content + focus ring are).

---

## Argos-specific a11y considerations

### Tap target compliance (WCAG 2.2 SC 2.5.8)

Tiles are large containers; tap target is the entire tile area. Always above the 24 × 24 px floor.

| Surface                   | Min size       | WCAG 2.5.8 (24 px) | WCAG 2.5.5 (44 px AAA) |
| ------------------------- | -------------- | ------------------ | ---------------------- |
| Mission Control stat tile | ≈ 200 × 96 px  | ✓ pass             | ✓ pass                 |
| AGENTS session card       | ≈ 280 × 140 px | ✓ pass             | ✓ pass                 |
| Workflows category card   | ≈ 240 × 120 px | ✓ pass             | ✓ pass                 |

### Accessible name source

`<ClickableTile>` accessible name is derived from inner text content. For tiles with rich content (icons + multiple text lines), the AT-spoken name concatenates all text in DOM order. Patterns:

- **Stat tile** (non-clickable): N/A — `<Tile>` is not announced.
- **Session card** (clickable): "[session.name], [status], PID [pid], last tick [time]". This is verbose but informative.
- **Category card** (clickable): "[CategoryIcon decorative], [title], [count] items". The icon is `aria-hidden="true"`.

If a session card name is too verbose, override via `<ClickableTile aria-label="Session foo, status active">` on the chassis (the chassis forwards `aria-label` to the underlying `<a>` / `<button>`).

### Disabled state announcement

`<ClickableTile disabled>` renders `aria-disabled="true"`. AT announces "link/button, [name], dimmed". User cannot Tab to it. If the tile contains a critical message ("agent has crashed — click to view"), do NOT use `disabled`; instead render a regular `<ClickableTile>` with content describing the error.

### Nested interactive elements

A common Lunaris anti-pattern is nesting `<button>` or `<a>` inside `<ClickableTile>`. The outer `<a>` / `<button>` is the AT-recognized interactive element; nesting another inside causes:

- AT announces both elements (confusing).
- Click on inner element triggers BOTH the inner and outer handler (Carbon does not stop propagation).
- HTML5 forbids `<button>` inside `<button>` and `<a>` inside `<a>`.

Migration rule (9.1f, 9.1g): if a clickable tile needs a secondary action (e.g., "delete" button on a session card), render the primary tile as a non-clickable `<Tile>` and place TWO buttons inside (`<Button>` for primary nav + `<Button kind="ghost">` for secondary action). Trade-off: lose the chevron affordance.

### Focus order in tile grids

When tiles are arranged in a CSS grid, the DOM order drives Tab order, not visual position. For a 4-tile horizontal row:

- DOM order: tile1, tile2, tile3, tile4.
- Visual order (LTR): tile1 → tile2 → tile3 → tile4.
- Tab order: tile1 → tile2 → tile3 → tile4. ✓

For a 2×2 grid where DOM is row-major (tile1, tile2 / tile3, tile4):

- Visual order: top-left → top-right → bottom-left → bottom-right.
- Tab order: matches visual.

If `flex-direction: row-reverse` or `grid-auto-flow: column` are used, Tab order may diverge from visual. Mission Control + Workflows use default grid flow — no mismatch.

---

## Verification checklist (Phase 9.1)

| Check                                          | Tool                                  | Pass criterion                                                                                                               |
| ---------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| WCAG 2.1 AA on canary route                    | `@axe-core/playwright` (`AxeBuilder`) | `violations: []` with `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` tags (border-contrast deviation logged separately) |
| `<Tile>` has no role / aria-\* attributes      | Playwright DOM audit                  | Outer `<div>` has no a11y attributes                                                                                         |
| `<ClickableTile href>` renders `<a href>`      | Playwright DOM audit                  | Element is `<a>` with `href` set                                                                                             |
| `<ClickableTile>` (no href) renders `<button>` | Playwright DOM audit                  | Element is `<button type="button">`                                                                                          |
| Tab order visits clickable tiles only          | Playwright keyboard nav               | Stat tiles skipped; session cards + category cards each get one stop                                                         |
| Enter activates ClickableTile                  | Playwright keyboard test              | `await page.keyboard.press('Enter')` triggers `onClick` / nav                                                                |
| Space activates ClickableTile (button mode)    | Playwright keyboard test              | `await page.keyboard.press(' ')` triggers `onClick` for non-href tiles                                                       |
| Focus ring visible                             | manual + Playwright `:focus` check    | 2 px inset outline visible on every clickable tile                                                                           |
| Hover state visible                            | manual visual check                   | Background + border + chevron all change on hover                                                                            |
| Disabled tile has aria-disabled                | Playwright DOM audit                  | `aria-disabled="true"` + `tabindex="-1"`                                                                                     |
| Chevron is decorative                          | Playwright DOM audit                  | Chevron icon has `aria-hidden="true"`                                                                                        |
| Color contrast (focus, content, chevron)       | chrome-devtools MCP + axe             | Focus ≥ 3:1, content ≥ 4.5:1, chevron ≥ 3:1                                                                                  |

Phase 7-style audit re-run for the migrated tiles in 9.1e-9.1g.

---

## Authority citations

- Carbon Tile a11y mdx: `docs/carbon-website/src/pages/components/Tile/accessibility.mdx`
- Carbon Tile SCSS: `docs/carbon-design-system/packages/styles/scss/components/tile/_tile.scss`
- Carbon Svelte sources:
    - <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/Tile.svelte>
    - <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tile/ClickableTile.svelte>
- WCAG 2.1: <https://www.w3.org/TR/WCAG21/>
- WCAG 2.2 SC 2.5.8 Target Size (Minimum): <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- WCAG 1.4.11 Non-text Contrast: <https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html>
- ARIA Authoring Practices for link: <https://www.w3.org/WAI/ARIA/apg/patterns/link/>
- ARIA Authoring Practices for button: <https://www.w3.org/WAI/ARIA/apg/patterns/button/>
- axe-core rule reference: <https://dequeuniversity.com/rules/axe/4.9/>
