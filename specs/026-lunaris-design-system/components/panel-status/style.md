# PanelStatus — Style

PanelStatus is **NOT a Carbon wrapper** — it is a bespoke Argos design-system primitive that EXTENDS the existing `PanelEmptyState` pattern with a state machine. There is no Carbon source to cite; the chassis IS the design source of truth.

## Source-of-truth files

| File | Role |
|---|---|
| `src/lib/components/chassis/PanelStatus.svelte` | Implementation (~135 LOC) — the single source of truth for visual treatment |
| `src/lib/components/ui/PanelEmptyState.svelte` | Predecessor (soft-deprecated) — design lineage; PanelStatus matches its visual treatment for backward consistency |

## Anatomy

```html
<div
	class="panel-status panel-status--{state}"
	role="status"
	aria-live="polite"
	aria-busy={state === 'loading'}
>
	<!-- Optional icon OR intrinsic spinner for state="loading" -->
	{#if icon}
		<div class="panel-status__icon" aria-hidden="true">{@render icon()}</div>
	{:else if state === 'loading'}
		<div class="panel-status__spinner" aria-hidden="true"></div>
	{/if}

	<p class="panel-status__title">{title}</p>

	{#if detail}
		<p class="panel-status__detail">{detail}</p>
	{/if}

	{#if action}
		<div class="panel-status__action">{@render action()}</div>
	{:else if showRetryButton}
		<button type="button" class="panel-status__retry" onclick={onRetry}>
			{retryLabel}
		</button>
	{/if}
</div>
```

## Sizing + spacing

| Element | Value | Rationale |
|---|---|---|
| Container padding | `24px 16px` | Matches PanelEmptyState (chassis design lineage) |
| Container min-height | `120px` | Ensures visual presence on tall panels |
| Container gap | `8px` | Vertical rhythm between icon → title → detail → action |
| Icon slot | `28×28px` | Matches PanelEmptyState |
| Spinner | `24×24px` with 2px border | Matches existing bespoke spinner sizing across SDRppView/WiresharkView/SparrowView |
| Title font | `12px / 500 / Geist` | Matches PanelEmptyState |
| Detail font | `11px / 1.45 / Geist` (max-width 32ch) | Matches PanelEmptyState; max-width prevents long detail strings from spanning full panel width |
| Retry button | `padding: 6px 16px / 11px Geist / uppercase / letter-spacing: 0.08em` | Matches Argos's existing `.retry-btn` Fira-Code-uppercase pattern but uses Geist for chrome consistency |

## Color tokens

PanelStatus uses Argos's existing CSS custom property tokens — NO `@carbon/styles` integration since this isn't a Carbon wrapper.

| State | Title color | Spinner color | Retry button |
|---|---|---|---|
| `loading` | `var(--foreground-muted, var(--foreground))` | `var(--muted-foreground)` border-top on `var(--border)` ring | n/a |
| `error` | `var(--destructive, #ff5c33)` | n/a | Standard chrome |
| `empty` | `var(--foreground-muted, var(--foreground))` | n/a | n/a |
| `disconnected` | `var(--destructive, #ff5c33)` | n/a | Standard chrome |
| `disabled` | `var(--muted-foreground)` | n/a | n/a |

Detail text always uses `var(--muted-foreground)` regardless of state — keeps the visual hierarchy (title carries state semantics, detail is supporting info).

## Spinner animation

```css
.panel-status__spinner {
	border: 2px solid var(--border);
	border-top-color: var(--muted-foreground);
	border-radius: 50%;
	animation: panel-status-spin 1s linear infinite;
}

@keyframes panel-status-spin {
	to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
	.panel-status__spinner {
		animation: none;
	}
}
```

**Note**: animation namespace is `panel-status-spin` (not generic `spin`) to avoid collisions with consumer files that might define their own `@keyframes spin`. The pre-migration sites all had local `@keyframes spin` definitions.

## Reduced-motion compliance

`@media (prefers-reduced-motion: reduce)` block stops the spinner — static circle when motion-reduction is requested. Title + detail + retry button still render. Loading state remains semantically correct (`aria-busy="true"`) even without animation.

## Lunaris theme alignment

PanelStatus uses Argos's Lunaris token vocabulary directly (no Carbon overlay since it's not a Carbon wrapper):

- **Surfaces**: inherits parent panel's background; no own background fill (visually transparent)
- **Borders**: no borders by default; consumer wraps in a card if needed
- **Typography**: Geist (chrome font per CLAUDE.md typography rules — title/detail are UI chrome, not data)
- **Accent for retry button**: defers to `var(--ring, var(--foreground))` for `:focus-visible` — matches all other interactive elements

## Visual diff vs pre-migration sites

The 5 migrated sites (WiresharkView, SDRppView, SparrowView, webtak-vnc-viewer, ReportsView) had subtly different bespoke chrome:

| Site | Pre-migration spinner | Pre-migration retry button | Post-migration |
|---|---|---|---|
| WiresharkView | `.spinner` 24×24, `--primary` color, 0.8s spin | `.retry-btn` Fira Code 11px, `--primary` color | All bespoke chrome replaced with chassis tokens |
| SDRppView | Same as Wireshark | Same as Wireshark | Replaced |
| SparrowView | `.spinner` 28×28, `--primary` color, 0.9s spin | `.retry-btn` Fira Code 10px, padding 6px 16px | Replaced (subtle size/font shift acceptable) |
| webtak-vnc-viewer | `.spinner` 28×28, 16px margin-bottom | n/a (no retry buttons) | Replaced |
| ReportsView | n/a | `.btn` w/ `<RefreshCw>` icon + text | Preserved via `action` snippet |

Visual diff procedure: chrome-devtools MCP `take_screenshot` of each panel in each state pre/post. Drift expected (chassis chrome vs bespoke); accept as new baseline unless drift breaks visual identity.

## What this chassis adds (vs predecessor PanelEmptyState)

- **State-machine `state` prop** with 5 values vs PanelEmptyState's implicit "empty-only" semantic
- **Intrinsic spinner** for `state="loading"` — PanelEmptyState had no loading semantics
- **Retry button** when `(state === 'error' || state === 'disconnected') && onRetry !== undefined` — PanelEmptyState pushed all action handling to consumer-provided snippets
- **`onRetry` shorthand prop** for the common case — saves consumers from writing `{#snippet action()}<button>RETRY</button>{/snippet}` boilerplate
- **`detail` prop separate from `title`** — clear visual hierarchy enforcement (PanelEmptyState had `description` already, this is API-compatible)
- **`aria-busy={state === 'loading'}`** — accessibility expressly tied to state
