# PanelStatus — Usage

**Status:** Phase 8.4 — chassis + 4 canary migrations live
**Last updated:** 2026-05-04
**Implementation file:** `src/lib/components/chassis/PanelStatus.svelte`
**Predecessor:** `src/lib/components/ui/PanelEmptyState.svelte` (soft-deprecated; PanelStatus subsumes via `state="empty"`)

---

## When to use

PanelStatus renders a **full-tile centered status display** for panels/views in non-content states. Use when:

- A panel/view's main content is **unavailable** because it's loading, errored, empty, disconnected, or disabled.
- The display should be **centered + multi-line** (title + detail + optional action), not a header-inline indicator.
- The state is **operator-actionable** OR informational (retry, restart, "configure first", etc.).

PanelStatus is the THIRD loading-state primitive in the Argos chassis — see `loading/usage.md` and `inline-loading/usage.md` for the spinner-only variants. PanelStatus is for **full-tile state displays**, not inline loading.

| Primitive         | Phase   | Visual                                              | When                                                          |
| ----------------- | ------- | --------------------------------------------------- | ------------------------------------------------------------- |
| `<Loading>`       | 6       | Centered spinner with overlay                       | Full-page modal-style loading                                 |
| `<InlineLoading>` | 6       | Spinner + text on one line                          | Inline progress next to a button or label                     |
| `<SkeletonText>`  | 8.3     | Animated text-shaped placeholders                   | Reserving layout space for text content                       |
| `<PanelStatus>`   | **8.4** | Full-tile centered title + detail + optional action | Panel/view in loading/error/empty/disconnected/disabled state |

## When NOT to use

The Phase 8.4 source audit identified **5 sites that look like PanelStatus candidates but are actually wrong-primitive matches**. Documented here so future sessions don't re-attempt:

| Site                                          | Pattern                                                                                         | Why NOT PanelStatus                                                                                                | Right primitive                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `screens/SystemsScreen.svelte:132-139`        | Inline header indicator: `<span class="stat mono"><Dot kind="..." /> LOADING…</span>`           | Header context, not full-tile. PanelStatus's 32-padding centered tile would be visually disastrous in a header bar | Stays bespoke (`<Dot>` + inline label is correct primitive for header-row status)             |
| `dashboard/TerminalErrorOverlay.svelte`       | Centered overlay with embedded code-block (`<code class="error-cmd">`) for diagnostic output    | Code-block detail is exotic shape — would force `detailSlot` snippet API expansion                                 | Stays bespoke; revisit if ≥3 sites need code-block detail (then add `detailSlot` snippet API) |
| `dashboard/views/WebTAKView.svelte:172-191`   | Status card with "Change URL" button (NOT retry — semantically a state reset)                   | Migrating with `onRetry` would be misleading naming. `action` snippet works but adds boilerplate vs custom button. | Stays bespoke OR use `<PanelStatus>` with `action` snippet (judgment call)                    |
| `routes/dashboard/mk2/agents/+page.svelte:30` | TBD placeholder for future PR7 (Agents implementation)                                          | Premature — no real agent UI exists yet                                                                            | Wait for PR7's actual UI before deciding                                                      |
| `chassis/WeatherPanel.svelte:60-71`           | 4 single-line `<div class="wx-empty mono">` messages (DISABLED, FAILED, NO METAR, DISCONNECTED) | Single-line compact format vs PanelStatus's multi-line padded tile — visual regression risk                        | Stays bespoke; revisit if WeatherPanel UX shifts to multi-line                                |

## Argos surface inventory (Phase 8.4 scope — chassis + 4 sites)

| File                                                                 | Lines    | States migrated                                                      | PR         |
| -------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- | ---------- |
| `src/lib/components/dashboard/views/WiresharkView.svelte`            | ~157-185 | checking/starting → loading; stopped → disconnected; disabled; error | **Canary** |
| `src/lib/components/dashboard/views/SDRppView.svelte`                | ~113-128 | checking → loading; stopped → disabled; error                        | Sweep      |
| `src/lib/components/dashboard/views/SparrowView.svelte`              | ~81-96   | checking → loading; stopped → disabled; error                        | Sweep      |
| `src/lib/components/dashboard/views/webtak/webtak-vnc-viewer.svelte` | ~137-160 | connecting → loading; error; disconnected                            | Sweep      |
| `src/lib/components/dashboard/views/ReportsView.svelte`              | ~370-378 | error (with `action` snippet for icon-decorated retry)               | Sweep      |

## Quick start

```svelte
<script lang="ts">
	import PanelStatus from '$lib/components/chassis/PanelStatus.svelte';
</script>

<!-- Loading state with spinner -->
<PanelStatus state="loading" title="CONNECTING..." />

<!-- Error state with retry button -->
<PanelStatus state="error" title="CONNECTION FAILED" detail={errorMsg} onRetry={reconnect} />

<!-- Disconnected state with custom retry label -->
<PanelStatus
	state="disconnected"
	title="WIRESHARK UNAVAILABLE"
	detail="Service not running"
	onRetry={reconnect}
	retryLabel="START CAPTURE"
/>

<!-- Disabled state (no retry, just info) -->
<PanelStatus
	state="disabled"
	title="SDR++ UNAVAILABLE"
	detail="Start SDR++ from the tool card first."
/>

<!-- Empty state (subsumes PanelEmptyState) -->
<PanelStatus state="empty" title="No reports" detail="No reports have been generated yet." />

<!-- Custom action snippet (for icon-decorated buttons or non-retry actions) -->
<PanelStatus state="error" title="ERROR LOADING REPORTS" detail={error}>
	{#snippet action()}
		<button class="btn" onclick={fetchReports}>
			<RefreshCw size={12} />
			<span>RETRY</span>
		</button>
	{/snippet}
</PanelStatus>
```

## State semantics

| State          | Spinner         | Default retry button      | Typical usage                                                        |
| -------------- | --------------- | ------------------------- | -------------------------------------------------------------------- |
| `loading`      | YES (intrinsic) | No                        | Service is starting / data is fetching                               |
| `error`        | No              | Yes (if `onRetry` passed) | Operation failed, manual retry available                             |
| `empty`        | No              | No                        | Loaded successfully but no data to show                              |
| `disconnected` | No              | Yes (if `onRetry` passed) | Was connected, lost connection, can re-establish                     |
| `disabled`     | No              | No                        | Feature turned off; needs external action (start service, configure) |

## Soft-deprecation of PanelEmptyState

`<PanelStatus state="empty">` subsumes `<PanelEmptyState>`. Existing PanelEmptyState callers (8 files) keep working but new empty-state surfaces should use PanelStatus. Future Phase 8.X may migrate the existing PanelEmptyState callers and delete the predecessor. For now, both coexist.

## See also

- `style.md` — Lunaris token mapping (icon color, retry button chrome, spinner timing)
- `code.md` — Full Props interface, snippet APIs, derived prop logic
- `accessibility.md` — `role="status"` + `aria-live` + `aria-busy` semantics
- `loading/usage.md` — sibling: spinner-only full-page loading
- `inline-loading/usage.md` — sibling: inline spinner + text
