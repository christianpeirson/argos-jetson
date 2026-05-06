# ProgressBar — Usage

**Status:** Phase 9.1 prep
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/feedback/ProgressBar.svelte`
**Carbon component:** `<ProgressBar>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ProgressBar/ProgressBar.svelte>

---

## When to use

A horizontal bar that visualizes a known-bounded numeric value over a known maximum. Two common uses:

- **Determinate metric display** (Mission Control CPU TOTAL / MEM TOTAL) — `value` is current %, `max` is 100.
- **Determinate task progress** (file upload / report generation) — `value` advances toward `max` as the task completes.
- **Indeterminate task progress** — `value` undefined; bar shows an animated indeterminate sweep (use sparingly; prefer `<InlineLoading>` for short tasks).

## When NOT to use

- **Boolean on/off state** → use `<Toggle>` or status `<Tag>`.
- **Multi-segment chart** → use `<Meter>` (Carbon Meter is separate; deferred) or a bespoke chart.
- **Long-running indeterminate task** with no max — `<ProgressBar>` indeterminate works but `<Loading>` (full-page spinner) or `<InlineLoading>` (inline text + spinner) reads better for ambiguous-duration tasks.
- **Real-time metric that updates >5×/sec** — `<ProgressBar>` re-renders on every update; in tight loops use a custom `<canvas>` bar.

## Carbon vs bespoke distinction

Per Carbon `progress-bar/usage.mdx`:

- **Determinate** — `value` and `max` both set; bar fills proportionally.
- **Indeterminate** — `value={undefined}`; bar animates a sweeping pulse.
- **`status` axis**:
    - `'active'` (default) — accent-colored fill; in-progress.
    - `'finished'` — success-colored fill; task complete.
    - `'error'` — red-colored fill + error icon; task failed.
- **`size` axis**:
    - `'sm'` (4 px) — compact; for stat-tile rows.
    - `'md'` (8 px) — default; for mission-critical metrics.
- **`kind` axis** (layout):
    - `'inline'` — label and bar on the same line; bar takes remaining inline space.
    - `'indented'` — label + helper text indented above the bar (for forms).
    - `'big'` — full-width bar with caption above.

## Argos surface inventory (provisional)

Bespoke `<div class="progress-bar">` sites that Phase 9.1 retires:

| Surface                            | File                                                           | Current pattern                 | Variant                       |
| ---------------------------------- | -------------------------------------------------------------- | ------------------------------- | ----------------------------- |
| Mission Control CPU TOTAL          | `src/lib/components/dashboard/views/MissionControlView.svelte` | bespoke `.bar > .fill` div pair | `kind="inline"` `size="sm"`   |
| Mission Control MEM TOTAL          | `src/lib/components/dashboard/views/MissionControlView.svelte` | bespoke `.bar > .fill` div pair | `kind="inline"` `size="sm"`   |
| Future: report generation progress | (deferred)                                                     | n/a                             | `kind="indented"` `size="md"` |
| Future: file upload                | (deferred)                                                     | n/a                             | `kind="indented"` `size="md"` |

Total bespoke progress-bar call sites in Phase 9.1: 2 (the Mission Control CPU + MEM bars).

## Anatomy (per Carbon source)

From `_progress-bar.scss`:

1. **`.bx--progress-bar`** — outermost container.
2. **`.bx--progress-bar__label`** (optional) — text label above the track.
3. **`.bx--progress-bar__track`** — the empty bar background; full inline-size; height per `size`.
4. **`.bx--progress-bar__bar`** — the filled portion; inline-size = `(value / max) * 100%`.
5. **`.bx--progress-bar__helper-text`** (optional) — caption below the track (e.g., "12 of 100 MB").
6. **Status icon** — when `status="finished"` or `status="error"`, a small icon renders inline with the label.

Indeterminate variant: bar animates a 30%-wide pulse from start → end → start at 1.5 s cycle.

## States to handle

- **Active (default)**: accent-colored fill at `value/max %`.
- **Finished**: full-width green fill + checkmark icon.
- **Error**: red fill at `value/max %` + error icon + `--mk2-red` text.
- **Indeterminate**: animated sweep; `value` and `max` ignored.
- **Disabled**: not natively supported by Carbon ProgressBar — no use case; if needed, hide the bar entirely.

## Spacing rhythm

Carbon's default ProgressBar adds:

- 4 px gap between label and track.
- 4 px gap between track and helper text.
- 0 px gap to surrounding content (caller controls).

In the Mission Control stat tile, the bar is the bottom element with 8 px gap from the value above.

## Common pitfalls

- **`value > max`** → Carbon clamps to `max`; bar shows full. No error thrown. Validate input upstream.
- **`value < 0`** → Carbon clamps to 0. No error.
- **NaN or undefined `value` with `max` set** → bar renders as indeterminate (animated sweep). Set `value={0}` for "not started yet" state.
- **Updating `value` >5×/sec** → DOM thrash; use `requestAnimationFrame` throttling in caller, or a custom canvas bar.
- **Mixing `status="active"` with `value === max`** → bar visually full but Carbon does not auto-switch to `finished`. Caller must set `status="finished"` when task done.
- **Helper text used for live numeric value** (e.g., "47% — 3.2 GB / 6.8 GB") → updates with `value`; consider `aria-atomic="true"` on the helper region for AT to re-announce.
- **`kind="inline"` inside narrow container** → label truncates with ellipsis. Use `kind="indented"` if label is long.

## Out of scope for Phase 9.1

- **`<ProgressIndicator>`** — multi-step process indicator (separate Carbon component); not used in Argos.
- **Custom colors per surface** — Lunaris locks the 3-status palette; no per-surface color override.
- **Animated value transitions** — Carbon does not animate `value` changes; jumps are instant. CSS `transition: inline-size` opt-in via `class` if smooth animation desired.

## Authority citations

- Carbon Svelte component: <https://svelte.carbondesignsystem.com/?path=/docs/components-progressbar--default>
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ProgressBar/ProgressBar.svelte>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/progress-bar/_progress-bar.scss`
- Carbon usage mdx: `docs/carbon-website/src/pages/components/ProgressBar/usage.mdx`
- Argos bespoke surfaces: see "Surface inventory" table above (2 primary sites in Phase 9.1)
