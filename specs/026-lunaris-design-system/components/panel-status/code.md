# PanelStatus — Code

The `<PanelStatus>` chassis at `src/lib/components/chassis/PanelStatus.svelte` is a **bespoke Argos design-system primitive** — NOT a Carbon wrapper. It extends the `PanelEmptyState` pattern with a 5-value state machine.

## Rationale for a bespoke chassis (not a Carbon wrapper)

Carbon Design System has no equivalent "full-tile state display" primitive. Carbon's `<InlineNotification>` is a 60px banner (wrong shape). Carbon's `<Loading>` is spinner-only (no title/detail). Carbon's `<Tile>` + custom content would work but adds 4 layers of wrapping.

PanelStatus is the FIRST genuinely-bespoke chassis primitive in spec-026 (every prior chassis wrapped a Carbon primitive). This sets a precedent: when Carbon doesn't ship the right primitive AND Argos has 4+ consumer sites needing the pattern, build a bespoke chassis. Don't force-fit a Carbon primitive that's the wrong shape.

## Public API — `<PanelStatus>` component

```typescript
type PanelStatusState = 'loading' | 'error' | 'empty' | 'disconnected' | 'disabled';

interface Props {
	state: PanelStatusState;       // REQUIRED
	title: string;                  // REQUIRED
	detail?: string;
	icon?: Snippet;
	onRetry?: () => void;
	retryLabel?: string;            // Default: 'RETRY'
	action?: Snippet;
	class?: string;
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `state` | `PanelStatusState` | **REQUIRED** | One of 5 state-machine values. Drives spinner, color, retry-button visibility |
| `title` | `string` | **REQUIRED** | Short uppercase label (e.g. `'CONNECTING...'`, `'ERROR LOADING REPORTS'`) |
| `detail` | `string` | `undefined` | Supporting explanation. Hidden if omitted. Max width 32ch |
| `icon` | `Snippet` | `undefined` | Custom icon OVERRIDES intrinsic spinner. Useful for `state="error"` with a warning glyph |
| `onRetry` | `() => void` | `undefined` | Click handler for retry button. Button only renders if `state === 'error' \|\| 'disconnected'` AND `action` is NOT passed |
| `retryLabel` | `string` | `'RETRY'` | Button text. Override for context-specific labels like `'START CAPTURE'`, `'RECONNECT'` |
| `action` | `Snippet` | `undefined` | Custom action area. OVERRIDES `onRetry` button. Use for icon-decorated buttons or non-retry actions |
| `class` | `string` | `undefined` | Extra class on outer `<div>` |

## Module-level type export

```svelte
<script lang="ts" module>
	export type PanelStatusState = 'loading' | 'error' | 'empty' | 'disconnected' | 'disabled';
</script>
```

The `state` type is exported via `<script module>` (Svelte 5 module-script) so consumers can type their own state machines:

```svelte
<script lang="ts">
	import type { PanelStatusState } from '$lib/components/chassis/PanelStatus.svelte';

	let panelState = $state<PanelStatusState>('loading');
</script>
```

## Derived prop logic

```typescript
const showRetryButton = $derived(
	!action && (state === 'error' || state === 'disconnected') && onRetry !== undefined
);
```

The `showRetryButton` derived guards against rendering both the snippet AND the button. If consumer provides `action` snippet, it always wins — even if `onRetry` is also passed.

## Snippets

The chassis exposes ONE snippet: `action`. Use it when:

- The retry button needs an icon (per ReportsView pattern)
- The action is NOT a retry (per WebTAKView's "Change URL" — DEFERRED in 8.4 but documented)
- Multiple buttons are needed (e.g. "RETRY" + "CANCEL")

When `action` snippet is provided, it OVERRIDES the `onRetry` button — even if `onRetry` is also passed. Consumers can pass `onRetry` AND `action` together to handle the retry logic in the snippet's own button while preserving semantic meaning, but the chassis won't render two buttons.

## Carbon → chassis API mapping

N/A — this chassis does not wrap a Carbon primitive. It IS the design source of truth.

## Paste-ready snippets

### Loading state (intrinsic spinner)

```svelte
<PanelStatus state="loading" title="CONNECTING..." />
```

### Loading with detail

```svelte
<PanelStatus
	state="loading"
	title="STARTING BROWSER SESSION"
	detail="Connecting to remote Chromium via noVNC…"
/>
```

### Error with default retry button

```svelte
<PanelStatus
	state="error"
	title="CONNECTION FAILED"
	detail={errorMsg || 'Unknown error'}
	onRetry={reconnect}
/>
```

### Disconnected with custom retry label

```svelte
<PanelStatus
	state="disconnected"
	title="WIRESHARK UNAVAILABLE"
	detail={errorMsg || 'Service not running'}
	onRetry={reconnect}
	retryLabel="START CAPTURE"
/>
```

### Disabled (no retry, info-only)

```svelte
<PanelStatus
	state="disabled"
	title="SDR++ UNAVAILABLE"
	detail="Start SDR++ from the tool card first."
/>
```

### Empty (subsumes PanelEmptyState)

```svelte
<PanelStatus state="empty" title="No reports" detail="No reports have been generated yet." />
```

### Custom action snippet (icon-decorated button)

```svelte
<script lang="ts">
	import { RefreshCw } from '@lucide/svelte';
	import PanelStatus from '$lib/components/chassis/PanelStatus.svelte';
</script>

<PanelStatus state="error" title="ERROR LOADING REPORTS" detail={error}>
	{#snippet action()}
		<button class="btn" type="button" onclick={() => void fetchReports()}>
			<RefreshCw size={12} />
			<span>RETRY</span>
		</button>
	{/snippet}
</PanelStatus>
```

This is the ReportsView canary pattern — preserves the existing icon-decorated retry button by passing it via `action` snippet instead of using the simpler `onRetry` shorthand.

### Custom icon override (non-loading state)

```svelte
<script lang="ts">
	import { ShieldAlert } from '@lucide/svelte';
	import PanelStatus from '$lib/components/chassis/PanelStatus.svelte';
</script>

<PanelStatus state="error" title="ACCESS DENIED" detail="Insufficient permissions">
	{#snippet icon()}
		<ShieldAlert size={28} />
	{/snippet}
</PanelStatus>
```

## What the chassis does NOT expose

- **Direct CSS class hooks** beyond `class` prop — internals (`.panel-status__title`, `.panel-status__detail`, etc.) are NOT public API
- **Custom transition/animation API** — adds complexity for marginal benefit
- **Multi-snippet support beyond `icon` and `action`** — keeps API tight; expand only if real consumer needs surface

## File budget

The chassis is ~135 LOC (`chassis/PanelStatus.svelte`) including styles. Larger than form chassis primitives (Loading 22 LOC, Tooltip 60 LOC) because it's a bespoke design-system primitive carrying its own visual treatment, not a thin Carbon passthrough.

## Tests

No Vitest tests in Phase 8.4 — manual visual smoke covers the canaries. Argos-side smoke per migrated site:

1. `npm run build` clean.
2. ESLint clean on chassis + 5 migrated sites.
3. Chrome-devtools MCP visual diff: capture each migrated site in each state, compare pre/post.
4. AT smoke: `role="status"` + `aria-live="polite"` announce state correctly. `aria-busy="true"` toggles on loading.

Future Phase 8.X may add Vitest tests for the state-machine derivation logic (`showRetryButton` derived, snippet-vs-onRetry precedence).
