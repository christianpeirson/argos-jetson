# ProgressBar — Accessibility

**Status:** Phase 9.1 — implementation prep
**Last updated:** 2026-05-04
**Carbon mirror:** `docs/carbon-website/src/pages/components/ProgressBar/accessibility.mdx`
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ProgressBar/ProgressBar.svelte>

---

## What Carbon provides for free

Per Carbon ProgressBar accessibility patterns (ProgressBar.svelte source confirms):

### Semantic structure

- Renders a `<div role="progressbar">` for the track. Native ARIA progressbar role — AT announces "[label], [value]%".
- Label rendered as `<label for={id}>` (or `<span>` when `hideLabel=true`).
- Helper text rendered as `<div id="helper-{id}">`.
- Status icons (checkmark / error) are `<svg aria-hidden="true">` — decorative; the status is announced via the bar's `aria-valuenow` + the label.

### ARIA wiring (verified in Carbon source)

- **`role="progressbar"`** on the track.
- **`aria-valuenow`** = current value (only for determinate; omitted for indeterminate).
- **`aria-valuemin`** = 0.
- **`aria-valuemax`** = `max` (default 100).
- **`aria-valuetext`** — Carbon does NOT set this by default; if a custom string is needed (e.g., "3.2 of 6.8 MB" instead of "47%"), pass via the chassis `helperText` prop OR the parent wraps in `aria-live="polite"` with custom text.
- **`aria-labelledby`** = `label-{id}` (links to the visible label).
- **`aria-describedby`** = `helper-{id}` (links to helper text region).
- **`aria-busy="true"`** is set on the parent container when status is `'active'`; auto-cleared on `'finished'` or `'error'`.
- **No `aria-valuenow` for indeterminate** — Carbon omits it, signaling "duration unknown" to AT. Some screen readers announce "busy, indeterminate".

### Keyboard interaction

- ProgressBar is **not focusable**. Skipped in tab order. No keyboard interaction (it's a status indicator, not a control).

### Color contrast (Carbon's audit floor)

Carbon's stock theme passes WCAG 2.1 AA. Lunaris token overrides MUST preserve those ratios.

| Pair                                  | Min contrast (AA) | Lunaris target                               | Status                                                                                 |
| ------------------------------------- | ----------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Track bg vs page bg                   | 3:1 (graphical)   | `var(--bg-2)` on `var(--background)`         | ≈ 1.5:1 ⚠ — **track is the empty state container; visual primary signal is the FILL** |
| Bar fill (active) vs track            | 3:1 (graphical)   | `var(--accent)` on `var(--bg-2)`             | ≈ 7.4:1 ✓                                                                              |
| Bar fill (finished) vs track          | 3:1 (graphical)   | `var(--mk2-green-fg)` on `var(--bg-2)`       | ≈ 5.8:1 ✓                                                                              |
| Bar fill (error) vs track             | 3:1 (graphical)   | `var(--mk2-red)` on `var(--bg-2)`            | ≈ 5.2:1 ✓                                                                              |
| Label text on page bg                 | 4.5:1             | `var(--ink)` on `var(--background)`          | ≈ 14.6:1 ✓                                                                             |
| Helper text on page bg                | 4.5:1             | `var(--ink-2)` on `var(--background)`        | ≈ 13.0:1 ✓                                                                             |
| Status icon (finished) on label color | 3:1 (graphical)   | `var(--mk2-green-fg)` on `var(--background)` | ≈ 5.7:1 ✓                                                                              |
| Status icon (error) on label color    | 3:1 (graphical)   | `var(--mk2-red)` on `var(--background)`      | ≈ 5.0:1 ✓                                                                              |
| Error text (`invalidText`)            | 4.5:1             | `var(--mk2-red)` on `var(--background)`      | ≈ 5.0:1 ✓                                                                              |

**One amber flag**: track-vs-page-bg contrast (1.5:1) is below the 3:1 graphical floor. This is acceptable per WCAG 1.4.11 reasoning — the track is the "empty container" surface; the load-bearing visual is the FILL bar (which passes 7.4:1 vs the track) and the LABEL text (which passes 14.6:1 vs the page bg). The track itself does not communicate state; the bar fill does. Documented as a Phase 7 audit deviation.

---

## Argos-specific a11y considerations

### Tap target compliance (WCAG 2.2 SC 2.5.8)

ProgressBar is non-interactive — no tap target needed. SC 2.5.8 does not apply.

### Status change announcement

When a determinate ProgressBar's `value` updates rapidly (e.g., file upload incrementing every 100 ms), AT may not re-announce on every change. Default browser/AT behavior:

- **NVDA / JAWS** — re-announce on noticeable change (≥10% delta) or on focus.
- **VoiceOver** — re-announce on focus only (default).

For surfaces where periodic announcement is critical (e.g., long-running report generation), wrap the ProgressBar in a `<div aria-live="polite" aria-atomic="true">` with a derived text:

```svelte
<div aria-live="polite" aria-atomic="true">
	<ProgressBar
		value={bytesUploaded}
		max={totalBytes}
		labelText="Upload"
		helperText="{percentDone}% — {humanBytes(bytesUploaded)} of {humanBytes(totalBytes)}"
	/>
</div>
```

The chassis does NOT add an `aria-live` region by default — that would over-announce on Mission Control's CPU/MEM bars (updated every second). Surface-specific opt-in.

### Indeterminate state announcement

Indeterminate ProgressBar emits no `aria-valuenow`. AT announces "busy, indeterminate" on focus or page load. For the Mission Control case this never applies (always determinate). For future indeterminate surfaces, consider supplementing with a textual "Loading..." `<InlineLoading>` adjacent for clearer feedback.

### Status transition: active → finished

When `status` flips from `active` to `finished`:

- Bar fill color changes from accent → green.
- Checkmark icon appears next to label.
- `aria-busy` flips from `true` to (omitted/false).

AT does NOT auto-announce this transition. If announcement is needed:

```svelte
{#if status === 'finished'}
	<div role="status" aria-live="polite">Upload complete.</div>
{/if}
```

(Render-and-remove a `role="status"` div whose presence triggers AT announcement.)

### Status transition: active → error

When `status` flips to `error` and `invalidText` is set:

- Bar fill turns red.
- Error icon appears next to label.
- `invalidText` renders below helper text in red, with `role="alert"` (chassis adds).

`role="alert"` causes AT to interrupt and announce immediately.

### Reduced motion

Carbon honors `prefers-reduced-motion: reduce` — the indeterminate sweep animation is disabled and a static 30% fill is shown. Users with motion sensitivity see no animation. Argos chassis inherits this for free.

### Color-not-sole-indicator

Lunaris non-negotiable rule: status must be communicated by more than just color. Carbon's ProgressBar already pairs:

- Active: blue fill + (label text "in progress" if caller sets it).
- Finished: green fill + checkmark icon + (caller may flip label to "Complete").
- Error: red fill + error icon + invalidText.

Caller MUST NOT remove the status icons via custom CSS.

---

## Verification checklist (Phase 9.1)

| Check                                           | Tool                                                                | Pass criterion                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| WCAG 2.1 AA on canary route                     | `@axe-core/playwright` (`AxeBuilder`)                               | `violations: []` with `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` tags (track-contrast deviation logged) |
| `role="progressbar"` set on track               | Playwright DOM audit                                                | Element has `role="progressbar"`                                                                                 |
| `aria-valuenow` reflects value                  | Playwright `expect(locator).toHaveAttribute('aria-valuenow', '47')` | matches                                                                                                          |
| `aria-valuemin / valuemax` set                  | Playwright DOM audit                                                | `min=0`, `max=value of max prop`                                                                                 |
| Indeterminate omits `aria-valuenow`             | Playwright DOM audit                                                | attribute absent                                                                                                 |
| `aria-labelledby` linked to visible label       | Playwright DOM audit                                                | label `id` matches                                                                                               |
| `aria-describedby` linked to helper text        | Playwright DOM audit                                                | helper-text `id` matches                                                                                         |
| `aria-busy` flips with status                   | Playwright state-change test                                        | `true` → `false` on `finished`/`error`                                                                           |
| Status icon present (finished/error)            | Playwright DOM audit                                                | `<svg>` adjacent to label                                                                                        |
| `invalidText` has `role="alert"`                | Playwright DOM audit                                                | Argos chassis adds                                                                                               |
| Color contrast (bar fill, label, helper, error) | chrome-devtools MCP + axe                                           | All ≥ 3:1 graphical, ≥ 4.5:1 text                                                                                |
| Reduced motion disables indeterminate sweep     | Playwright `emulateMedia({ reducedMotion: 'reduce' })`              | animation suspended; static fill                                                                                 |
| Live region opt-in for slow tasks               | manual NVDA / VoiceOver test                                        | parent `aria-live="polite"` re-announces                                                                         |
| Color-not-sole-indicator                        | manual visual                                                       | Status icon visible alongside fill color in finished/error                                                       |

Phase 7-style audit re-run for the migrated CPU + MEM bars in 9.1l.

---

## Authority citations

- Carbon ProgressBar a11y mdx: `docs/carbon-website/src/pages/components/ProgressBar/accessibility.mdx`
- Carbon ProgressBar SCSS: `docs/carbon-design-system/packages/styles/scss/components/progress-bar/_progress-bar.scss`
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ProgressBar/ProgressBar.svelte>
- WCAG 2.1: <https://www.w3.org/TR/WCAG21/>
- WCAG 1.4.11 Non-text Contrast: <https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html>
- WCAG 1.4.1 Use of Color: <https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html>
- ARIA Authoring Practices for progressbar: <https://www.w3.org/WAI/ARIA/apg/patterns/meter/> (no dedicated APG pattern; meter pattern is closest)
- ARIA `progressbar` role spec: <https://www.w3.org/TR/wai-aria-1.2/#progressbar>
- axe-core rule reference: <https://dequeuniversity.com/rules/axe/4.9/>
