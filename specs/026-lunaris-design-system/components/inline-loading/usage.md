# InlineLoading — Usage

**Status:** Phase 6 — shipped (2 consumer migrations: SystemInfoCard + WeatherPanel)
**Last updated:** 2026-04-30
**Implementation files:** `src/lib/components/chassis/forms/InlineLoading.svelte`
**Carbon component:** `<InlineLoading>` from `carbon-components-svelte` v0.107.0+

---

## When to use

Inline status indicator that announces "in-progress / done / error" within an existing layout context. Use when:

- An action has started and the user needs ongoing feedback (e.g., "Loading…", "Saving…", "Fetching METAR…").
- The status transitions through `active → finished → error` and the user benefits from seeing each state (with checkmark / X icons).
- The visual fits inline (e.g., next to a button, inside a metric panel, in a status bar) — NOT full-screen.

## When NOT to use

- **Block-level overlay spinner** → use `<Loading withOverlay>` (covers a panel or page during a one-shot fetch).
- **Multi-row content skeleton** → use future `<SkeletonText>` chassis (placeholders mimicking the loaded shape).
- **Full-tile panel state** (centered title + detail + retry button) → use future `<PanelStatus>` chassis (Phase 4 follow-up sub-phase A).
- **Persistent toast confirmation** → use `<ToastNotification>` from Phase 4.

## Argos surface inventory (Phase 6)

| File                                                                 | Site        | Cohort                                                                | Migration PR |
| -------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------- | ------------ |
| `src/lib/components/dashboard/panels/overview/SystemInfoCard.svelte` | line 164    | "Loading..." status text in metric panel while `systemInfo` is `null` | **Phase 6**  |
| `src/lib/components/chassis/WeatherPanel.svelte`                     | lines 62-64 | "FETCHING METAR…" loading-state branch (1 of 5 panel state branches)  | **Phase 6**  |

**Total InlineLoading cohort: 2 files / 2 sites shipped.**

### Deferred (NOT migrated to InlineLoading)

| File                                                                                                                    | Reason                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/components/dashboard/views/ReportsView.svelte:364` (grid-skeleton)                                             | Multi-row content-skeleton (3 `.skeleton-row` divs with CSS animation) — wrong shape for InlineLoading's status-text + small-spinner pattern. Future `SkeletonText` chassis. |
| `src/routes/dashboard/mk2/agents/+page.svelte:30` (placeholder eyebrow + title + body)                                  | Full-tile panel-status placeholder — fits `PanelStatus` chassis (Phase 4 follow-up sub-phase A).                                                                             |
| `src/lib/components/chassis/WeatherPanel.svelte` other state branches (`disabled` / `error` / `empty` / `disconnected`) | Same panel-status pattern — fit `PanelStatus` chassis. Phase 6 migrates ONLY the `loading` branch.                                                                           |

## State machine

InlineLoading's `status` prop drives 4 visual states:

| `status`             | Visual                                                                     | Use case                     |
| -------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `'active'` (default) | Animated small spinner + description                                       | In-flight operation          |
| `'inactive'`         | Stopped spinner + description                                              | Paused or idle (rarely used) |
| `'finished'`         | Green checkmark + description; fires `onSuccess()` after `successDelay` ms | Completed successfully       |
| `'error'`            | Red X + description                                                        | Failed                       |

Phase 6 consumers use only `'active'` (the default — neither SystemInfoCard nor WeatherPanel has a finished/error state for the loading itself).
