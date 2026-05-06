# ToastNotification — Code

The `<ToastNotification>` chassis wrapper at `src/lib/components/chassis/forms/ToastNotification.svelte` is a thin Svelte-5-runes adapter over Carbon's Svelte-4 ToastNotification primitive, plus a region container at `src/lib/components/chassis/ToastRegion.svelte` and an orchestration store at `src/lib/stores/toast.svelte.ts`.

## Rationale for the wrapper layer

Carbon ships `carbon-components-svelte@0.107.0`, which is **still Svelte 4 internally** — uses `export let`, `createEventDispatcher`, `$$restProps`. Argos consumer code is Svelte 5 with runes. The wrapper:

1. Accepts Svelte-5-rune-style typed props via `$props()`.
2. Bridges Carbon's `dispatch("close", { timeout })` to a Svelte-5 callback prop `onClose(fromTimeout)`.
3. Auto-derives `role` from `kind` (alert vs status — see accessibility.md).
4. Defaults `statusIconDescription` so `kind`-based icon text is never empty.

## Public API — `<ToastNotification>` component

| Prop                     | Type                                                                            | Default                | Description                                                     |
| ------------------------ | ------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------- |
| `open`                   | `boolean` (bindable)                                                            | `true`                 | Toast visibility. Two-way bindable.                             |
| `kind`                   | `'error' \| 'info' \| 'info-square' \| 'success' \| 'warning' \| 'warning-alt'` | `'error'`              | Status kind. Drives left-bar color + icon glyph + default role. |
| `title`                  | `string`                                                                        | `''`                   | Headline text (rendered as `<h3>`).                             |
| `subtitle`               | `string`                                                                        | `''`                   | Secondary text below title.                                     |
| `caption`                | `string`                                                                        | `''`                   | Tertiary text (e.g. timestamp). Smallest type.                  |
| `lowContrast`            | `boolean`                                                                       | `false`                | Swap dark inverse surface for low-contrast layer.               |
| `timeout`                | `number` (ms)                                                                   | `0`                    | Auto-dismiss after N ms. `0` = sticky (manual close only).      |
| `role`                   | `string`                                                                        | derived from `kind`    | Override the auto-derived ARIA role.                            |
| `hideCloseButton`        | `boolean`                                                                       | `false`                | Hide the close (×) button.                                      |
| `fullWidth`              | `boolean`                                                                       | `false`                | Stretch to 100% of parent width.                                |
| `statusIconDescription`  | `string`                                                                        | `` `${kind} icon` ``   | Alt-text for the status icon (a11y).                            |
| `closeButtonDescription` | `string`                                                                        | `'Close notification'` | aria-label for the close button.                                |
| `class`                  | `string`                                                                        | `undefined`            | Extra class forwarded to Carbon's outer div.                    |

## Events / callback props

Chassis uses Svelte-5 callback props that bridge Carbon's Svelte-4 event dispatcher.

| Callback prop | Args                     | Maps to Carbon event                 | Notes                                           |
| ------------- | ------------------------ | ------------------------------------ | ----------------------------------------------- |
| `onClose`     | `(fromTimeout: boolean)` | `on:close` `{ detail: { timeout } }` | `fromTimeout=true` when auto-dismissed by timer |

## Slots

Carbon ToastNotification exposes one default slot for additional body content beyond title/subtitle/caption. The wrapper does NOT currently forward a `children` snippet — title/subtitle/caption cover all PR-A use cases. Add a `children?: Snippet` if a tier-2 site needs richer content.

## Carbon → chassis API mapping

| Carbon API                               | Chassis equivalent               | Notes                               |
| ---------------------------------------- | -------------------------------- | ----------------------------------- |
| `bind:open`                              | `bind:open` (preserved)          | Same shape                          |
| `on:close={(e) => ... e.detail.timeout}` | `onClose={(fromTimeout) => ...}` | Detail flattened                    |
| `notificationType`                       | not exposed                      | Lunaris uses only the toast pattern |

## Toast STORE API — `$lib/stores/toast.svelte`

The `toast` store at `src/lib/stores/toast.svelte.ts` is the canonical entry point. Components should NOT mount `<ToastNotification>` directly — they call the store, and `<ToastRegion>` renders.

```ts
import { toast } from '$lib/stores/toast.svelte';

toast.error('Failed to save', { subtitle: 'Check your connection', timeout: 5000 });
toast.success('Saved', { subtitle: 'Configuration applied' });
toast.info('GPS lock acquired');
toast.warning('HackRF temperature elevated', { caption: '63°C — throttling soon' });

const id = toast.error('Long-running issue', { timeout: 0 });
toast.dismiss(id); // imperative dismiss
```

| Method                        | Returns       | Notes                                      |
| ----------------------------- | ------------- | ------------------------------------------ |
| `toast.error(title, opts?)`   | `string` (id) | `kind="error"` → `role="alert"`            |
| `toast.success(title, opts?)` | `string`      | `kind="success"` → `role="status"`         |
| `toast.info(title, opts?)`    | `string`      | `kind="info"` → `role="status"`            |
| `toast.warning(title, opts?)` | `string`      | `kind="warning"` → `role="alert"`          |
| `toast.dismiss(id)`           | `void`        | Imperative removal (no-op if id not found) |

`ToastOpts = { subtitle?, caption?, timeout? }`. Default timeout `4000` ms (`toast.svelte.ts:18`).

## ToastRegion placement pattern

Mount `<ToastRegion />` exactly once at the root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
	import ToastRegion from '$lib/components/chassis/ToastRegion.svelte';
</script>

<slot />
<ToastRegion />
```

Region position is fixed (`bottom: 1rem; right: 1rem; z-index: 9000` — `ToastRegion.svelte:23-31`). Multiple mounts cause duplicate renders; the store is module-level singleton state.

## Paste-ready snippets

### Basic — direct component (rare)

```svelte
<script lang="ts">
	import ToastNotification from '$lib/components/chassis/forms/ToastNotification.svelte';
	let open = $state(true);
</script>

<ToastNotification
	bind:open
	kind="error"
	title="Save failed"
	subtitle="Could not write to /etc/argos.conf"
/>
```

### With caption (timestamps)

```svelte
<ToastNotification
	kind="info"
	title="Sweep complete"
	subtitle="Captured 142 signals across 700–900 MHz"
	caption={new Date().toLocaleTimeString()}
	timeout={6000}
/>
```

### Full-width inside a side panel

```svelte
<ToastNotification
	kind="warning"
	title="GPS lock lost"
	subtitle="Falling back to last known position"
	fullWidth
	hideCloseButton
/>
```

### Store-driven (canonical)

```ts
import { toast } from '$lib/stores/toast.svelte';
toast.error('HackRF disconnected', { subtitle: 'USB device removed' });
```

## What the wrapper does NOT expose

- Carbon's default `<slot />` — title/subtitle/caption suffice for PR-A.
- `notificationType` (Carbon's distinction between toast and inline) — Lunaris uses inline notifications via a separate wrapper to be added in a later sub-phase.

## File budget

The wrapper is 61 LOC (`forms/ToastNotification.svelte`). Region is 36 LOC. Store is 51 LOC. All within the 80-LOC chassis budget per file.

## Tests

No Vitest tests in PR-A — Carbon covers the underlying primitive. Argos-side smoke:

1. `npm run build` clean.
2. Chrome-devtools MCP visual diff (style.md procedure).
3. Manual focus / dismiss / timeout trace (a11y — see accessibility.md).
