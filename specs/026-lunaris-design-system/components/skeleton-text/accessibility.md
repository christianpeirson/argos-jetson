# SkeletonText — Accessibility

Carbon SkeletonText is a **purely visual placeholder** — it has no inherent accessibility semantics. The skeleton bars are `<p>` elements with no text content; screen readers treat them as silent. The accessibility responsibility lives ENTIRELY in the **wrapper that surrounds the skeleton** with `aria-busy` + `aria-label` (or equivalent).

## WCAG criteria covered

| SC | Criterion | How the wrapper + consumer satisfy it |
|---|---|---|
| **1.4.11** (AA) | Non-text Contrast | Skeleton bar token mapping: `$skeleton-background` (`var(--bg-2)`) on parent surface (≥3:1 against adjacent color — non-text UI component contrast) |
| **2.3.3** (AAA) | Animation from Interactions | Carbon SCSS includes `@media (prefers-reduced-motion: reduce) { animation: none; }` — pulse stops, static bars shown |
| **4.1.3** (AA) | Status Messages | `aria-busy="true"` on the wrapper announces "loading" to AT without focus shift |

## ARIA wiring done by Carbon

**Carbon does NOT add any ARIA to SkeletonText itself.** The component is intentionally silent — it produces `<p class="bx--skeleton__text">` elements with no `role`, no `aria-*`, no text content. Screen readers skip these (empty `<p>` with no text = nothing to announce).

This is by design: Carbon's a11y model says **the loading semantics belong to the region containing the skeleton**, not to the skeleton itself. A skeleton that announces "loading text bar" to AT users would be visual-design noise leaking into AT.

## ARIA wiring required from the consumer (NOT optional)

Every SkeletonText consumer MUST wrap the skeleton in a region with loading semantics. Standard pattern:

```svelte
{#if loading}
	<div aria-busy="true" aria-label="Loading reports">
		<SkeletonText paragraph lines={3} />
	</div>
{:else}
	<!-- real content -->
{/if}
```

Required wrapper attrs:

| Attr | Purpose |
|---|---|
| `aria-busy="true"` | Tells AT "this region is updating" — AT may pause re-announcement of stale content |
| `aria-label` (or `aria-labelledby`) | Names the loading region — "Loading reports" / "Loading user list" / etc. |

Optional but recommended:

| Attr | Purpose |
|---|---|
| `role="status"` | Marks region as live; AT announces label on appearance + content on completion |
| `aria-live="polite"` | Tells AT to announce changes when idle (default for `role="status"`) |

For the ReportsView canary, the existing `<div class="grid-skeleton" aria-busy="true" aria-label="Loading reports">` wrapper meets the minimum baseline. Phase 7 a11y audit may upgrade with `role="status"` if AT testing reveals announcement timing issues.

## Why the chassis enforces NOTHING here

Unlike chassis `<TooltipIcon>` (which makes `tooltipText` REQUIRED), chassis `<SkeletonText>` does NOT require an `ariaLabel` prop. Reason: the loading semantics belong to the **region**, not the **skeleton**. A `SkeletonText` rendered without a wrapper is still valid in some contexts (e.g. inside a `<table aria-busy="true">` cell, where the table itself owns the loading semantics).

Forcing the chassis to require an `ariaLabel` would either:

- Render an extra wrapper `<div>` with the label (DOM noise; breaks consumers who put SkeletonText inside table cells / list items)
- OR add `aria-label` to the `<p>` itself (wrong — `<p>` doesn't accept aria-label semantics consistently across AT)

Better: trust consumers to provide the wrapper, document the pattern in `usage.md` and here.

## Consumer obligations

| Owner | Responsibility |
|---|---|
| Carbon | Render silent `<p class="bx--skeleton__text">` bars with deterministic widths; pulse animation with reduced-motion support |
| Chassis | Forward props; intentionally drop event listeners (skeletons are non-interactive) |
| **Consumer** | Wrap SkeletonText in a region with `aria-busy="true"` + `aria-label` (or `role="status"` + `aria-labelledby`); flip wrapper attrs OFF when loading completes |

## Keyboard interactions

NONE. SkeletonText is non-focusable, non-interactive. TAB skips over it. This is correct — placeholder bars should not be in the keyboard navigation flow.

## Focus management

NONE. SkeletonText has no focusable elements. When loading completes and real content replaces the skeleton, the consumer is responsible for focus management (typically: keep focus where it was, OR move to an announcement region if user-action triggered the load).

## Screen reader behavior

| AT | Behavior |
|---|---|
| NVDA | On `<div aria-busy="true" aria-label="Loading reports">` enter: "Loading reports busy". Re-announces "Loading reports" if `aria-busy` stays `true` for >5 s. On `aria-busy="false"` flip + content swap: announces new content per region's `aria-live` setting (default polite) |
| JAWS | Similar to NVDA. Some versions silently honour `aria-busy` (no announcement); rely on `role="status"` for explicit announcement |
| VoiceOver (Mac) | On region enter: "Loading reports". On `aria-busy` flip: announces content change |
| TalkBack | Similar; reads `aria-label` on focus, announces content on completion |

**Caveat**: AT behaviour around `aria-busy` is INCONSISTENT across versions and screen readers. For critical loading states, prefer `role="status"` + `aria-live="polite"` + actual text content (e.g. `<p>Loading reports...</p>` next to the skeleton).

## Reduced-motion compliance

Carbon SCSS:

```scss
@media (prefers-reduced-motion: reduce) {
	.bx--skeleton__text {
		animation: none;
	}
}
```

Effect: when `prefers-reduced-motion: reduce` is set (OS-level setting on macOS/iOS/Android, browser setting on others), pulse animation stops; bars render as static low-opacity placeholders. Still reads as "something is loading" visually — just without the pulse.

The chassis adds nothing here — Carbon SCSS handles it.

## Common a11y pitfalls

1. **Skeleton without wrapper region** → AT users get no signal that content is loading. Always wrap in `<div aria-busy="true" aria-label="...">`.
2. **`aria-busy` left on after load completes** → AT keeps thinking the region is loading. Always flip `aria-busy={loading}` reactively.
3. **Skeleton replacing focusable content** → if a button is loading, the user's keyboard focus might land on the skeleton (which is non-focusable) and get lost. Pattern: keep the button rendered with `disabled={loading}` instead of swapping to a skeleton.
4. **Mismatched skeleton shape** → 3-line skeleton showing while a 10-row table is actually loading misleads AT users about the size of the eventual content. Match skeleton lines to expected content size.
5. **Long-lived skeleton with no progress signal** → if loading takes >5 s, supplement with `<InlineLoading>` (text + spinner) so AT users know it's still progressing. Pure skeletons are silent.

## Verification (Phase 8.3 canary)

For the ReportsView canary (`src/lib/components/dashboard/views/ReportsView.svelte`):

- [ ] Wrapper still emits `aria-busy="true"` + `aria-label="Loading reports"` (verify via DOM inspection).
- [ ] Wrapper attrs flip OFF (or wrapper unmounts) when `loading={false}`.
- [ ] AT (NVDA / VoiceOver / TalkBack) announces "Loading reports busy" when entering the region during load.
- [ ] AT announces real content when load completes (default polite live region behaviour).
- [ ] `prefers-reduced-motion: reduce` (set OS-level + retest) → pulse animation stops, static bars visible.
- [ ] TAB navigation skips the skeleton — no focusable elements inside.

## Phase 7 audit alignment

Phase 7 (a11y audit + dead-code cleanup) re-tests every loading-state surface against axe-core + manual NVDA/VoiceOver/TalkBack smoke. SkeletonText canary inherits the wrapper's `aria-busy` discipline; defects file against the consumer's wrapper, not the chassis.
