# SkeletonText — Usage

**Status:** Phase 8.3 — wrapper + 1 canary live
**Last updated:** 2026-05-04
**Implementation file:** `src/lib/components/chassis/forms/SkeletonText.svelte`
**Carbon component:** `<SkeletonText>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** `node_modules/carbon-components-svelte/src/SkeletonText/SkeletonText.svelte`
**GitHub source:** https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/SkeletonText/SkeletonText.svelte

---

## When to use

Carbon's `<SkeletonText>` renders **animated placeholder bars** for text content that is loading. Use when:

- Data-fetch is in flight and the layout needs to **reserve space** for the eventual text content.
- The placeholder should **mimic the shape** of the real content (multi-line paragraph, heading, table row).
- The skeleton is **content-shaped**, not action-shaped — for full-tile loading states with spinner + status text, use `<Loading>` (Phase 6) instead; for spinner-only inline loading, use `<InlineLoading>`.

This is the **third loading-state primitive** in the Argos chassis. Together they cover:

| Primitive         | Phase   | Visual                                  | When                                      |
| ----------------- | ------- | --------------------------------------- | ----------------------------------------- |
| `<Loading>`       | 6       | Centered spinner with overlay           | Full-page or full-tile loading            |
| `<InlineLoading>` | 6       | Spinner + text on one line              | Inline progress next to a button or label |
| `<SkeletonText>`  | **8.3** | Animated horizontal bars mimicking text | Reserving layout space for text content   |

## When NOT to use

- **Reserving space for non-text content** (images, tables, charts) → Carbon ships `<SkeletonPlaceholder>` for blocks of arbitrary shape; chassis wrapper deferred until first need.
- **Full-tile error/loading states with retry button** → use `<PanelStatus>` (Phase 8.4 chassis, in progress).
- **Indeterminate progress** → use `<InlineLoading status="active">` (Phase 6) — the text "Loading..." next to a spinner is more informative than a content skeleton.
- **Static placeholders** (e.g. "Coming soon") → plain text + CSS, no skeleton needed.

## Argos surface inventory (Phase 8.3 scope — 1 canary)

| File                                                    | Line | Why migrate                                                                                                        | PR                   |
| ------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `src/lib/components/dashboard/views/ReportsView.svelte` | ~362 | 3-row `.skeleton-row` placeholder while reports fetch — clean shape match for `<SkeletonText paragraph lines={3}>` | **Phase 8.3 canary** |

The `.skeleton-row` bespoke CSS (~12 LOC including the `@keyframes pulse` rule) was deleted as dead code post-migration. Carbon's pulse animation lives in `@carbon/styles/scss/components/skeleton/_skeleton.scss`.

## Quick start

```svelte
<script lang="ts">
	import SkeletonText from '$lib/components/chassis/forms/SkeletonText.svelte';
</script>

<!-- Default: 3-line paragraph skeleton at full container width -->
<SkeletonText paragraph lines={3} />

<!-- Single line skeleton at fixed width -->
<SkeletonText width="200px" />

<!-- Heading skeleton (taller bar) -->
<SkeletonText heading width="60%" />

<!-- 5-line paragraph at narrower width -->
<SkeletonText paragraph lines={5} width="80%" />
```

## Anatomy decisions

**Paragraph mode** (`paragraph={true}`): Carbon renders one `<div>` containing N `<p class="bx--skeleton__text">` elements, each with deterministically-randomized widths via Carbon's hardcoded `RANDOM = [0.973, 0.153, 0.567]` array. Visually-varied lines without SSR hydration mismatch.

**Single-line mode** (`paragraph={false}`, default): Carbon renders one `<p class="bx--skeleton__text">` at the specified width.

**Heading mode** (`heading={true}`): adds the `bx--skeleton__heading` modifier class — taller bar (24 px vs 14 px) via Carbon SCSS.

**Width parsing**: Carbon supports `width` as `'100%'` (default), any `'NNpx'`, or any `'NN%'`. The parser distinguishes via `.includes('px')`. For `paragraph` mode with `'NNpx'`, Carbon clamps line widths to `width - 75 ≤ x ≤ width` (so each line is between `width-75px` and `width`). For `'NN%'` widths, lines are `calc(NN% - rand_px)`.

## Accessible-loading wrapper pattern

Carbon SkeletonText does NOT auto-add `aria-busy` or `aria-label` for screen readers — those are the consumer's responsibility. The Argos canary keeps the existing wrapper:

```svelte
<div class="grid-skeleton" aria-busy="true" aria-label="Loading reports">
	<SkeletonText paragraph lines={3} />
</div>
```

Wrapper attrs:

- `aria-busy="true"` — tells AT the region is updating; AT may pause re-announcement of stale content.
- `aria-label="Loading reports"` — gives the region a name so AT users know what's loading.

Both attrs flip off (or the whole wrapper is replaced with real content) when `loading={false}`. See `accessibility.md` for the full pattern.

## See also

- `style.md` — Lunaris token overrides for the skeleton bar fill + animation timing
- `code.md` — Full props/events table, width-parsing edge cases, deterministic-randomization explanation
- `accessibility.md` — `aria-busy` wrapper pattern, screen-reader announcement timing, reduced-motion handling
- `loading/usage.md` — sibling primitive (full-tile spinner)
- `inline-loading/usage.md` — sibling primitive (inline spinner + text)
