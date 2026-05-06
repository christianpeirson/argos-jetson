# Loading — Usage

**Status:** Phase 6 — chassis shipped (no consumer migrations in Phase 6)
**Last updated:** 2026-04-30
**Implementation files:** `src/lib/components/chassis/forms/Loading.svelte`
**Carbon component:** `<Loading>` from `carbon-components-svelte` v0.107.0+

---

## When to use

Block-level spinner indicating an in-flight operation that prevents user interaction with a region or the whole page. Use when:

- A long-running fetch / mutation is in flight and the result populates a panel or replaces a route view.
- The operation is one-shot (status doesn't transition through `finished` / `error` states for the user to read — that's `<InlineLoading>`'s job).
- You need an OVERLAY (semi-transparent backdrop blocking interaction with stale content) OR a small inline spinner without text.

## When NOT to use

- **Status messages with state transitions** (active → finished → error) → use `<InlineLoading>`.
- **Multi-row content placeholders** (skeleton rows that mimic the loading table/list shape) → use Carbon `<SkeletonText>` (chassis wrapper not yet shipped — future SkeletonText sub-phase).
- **Full-tile panel-status screens** (spinner + title + detail + retry button) → use future `<PanelStatus>` chassis (Phase 4 follow-up sub-phase A).
- **Progress with known percentage** → use Carbon `<ProgressBar>` (not yet wrapped).

## Argos surface inventory

Phase 6 ships the chassis wrapper. **No consumer migrations in this PR** — the existing "overlay-style" loading patterns in Argos all fit the deferred PanelStatus chassis (Phase 4 follow-up sub-phase A) or the future SkeletonText chassis. `Loading.svelte` is available for ad-hoc consumer needs going forward; the wrapper costs ~22 LOC and unblocks immediate adoption when a real overlay-spinner use case lands.

| File                | Site count | Variant | Migration PR |
| ------------------- | ---------- | ------- | ------------ |
| _(none in Phase 6)_ | 0          | n/a     | n/a          |

### Deferred to future sub-phases

| File                                                                        | Reason                                                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/lib/components/dashboard/views/ReportsView.svelte:364` (grid-skeleton) | Multi-row content placeholder — wrong shape for `<Loading>`'s spinner. Future `SkeletonText` chassis. |
| `src/routes/dashboard/mk2/agents/+page.svelte:30`                           | Full-tile panel-status placeholder. Future `PanelStatus` chassis (Phase 4 follow-up sub-phase A).     |
| `src/lib/components/chassis/WeatherPanel.svelte` non-loading state branches | Same panel-status pattern. Same target.                                                               |
