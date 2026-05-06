# Loading — Code

The `<Loading>` chassis wrapper at `src/lib/components/chassis/forms/Loading.svelte` is a thin Svelte-5-runes adapter over Carbon's Svelte-4 Loading primitive.

## Rationale for the wrapper layer

Carbon ships `carbon-components-svelte@0.107.0` with internal Svelte 4 syntax (`export let`). Argos consumer code is Svelte 5 with runes. The wrapper job is minimal here:

1. Accept Svelte-5-rune-style typed props via `$props()`.
2. Forward to Carbon's Svelte-4 props.
3. Default `description` to `'Loading'` (capitalized) for Argos UX consistency.

Loading has NO events and NO slots — passthrough is trivial.

## Public API — Props

| Prop          | Type                  | Default     | Description                                                                               |
| ------------- | --------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `small`       | `boolean`             | `false`     | Use the compact spinner variant (~24px) instead of large (~44px).                         |
| `active`      | `boolean`             | `true`      | Whether the spinner animates. `false` shows the stopped state with `aria-live="off"`.     |
| `withOverlay` | `boolean`             | `true`      | Render with a semi-transparent backdrop blocking interaction. `false` for inline spinner. |
| `description` | `string`              | `'Loading'` | SVG `<title>` text — screen-reader announcement, not visible.                             |
| `class`       | `string \| undefined` | `undefined` | Extra class forwarded to Carbon's outer wrapper.                                          |

## Public API — Callback props

None. Loading is purely presentational; Carbon dispatches no events.

## Slots / children

None.

## Carbon → chassis API mapping

| Carbon prop   | Chassis prop                                                |
| ------------- | ----------------------------------------------------------- |
| `small`       | `small`                                                     |
| `active`      | `active`                                                    |
| `withOverlay` | `withOverlay`                                               |
| `description` | `description` (default `'Loading'` vs Carbon's `'loading'`) |

## Paste-ready snippets

### Default — full-page overlay spinner

```svelte
<script lang="ts">
	import Loading from '$lib/components/chassis/forms/Loading.svelte';
	let busy = $state(true);
</script>

{#if busy}
	<Loading description="Loading dashboard…" />
{/if}
```

### Inline spinner — no overlay, large size

```svelte
<Loading withOverlay={false} description="Refreshing reports…" />
```

### Small inline spinner

```svelte
<Loading withOverlay={false} small description="Saving…" />
```

### Stopped state (animation paused)

```svelte
<Loading active={false} description="Paused" />
```

## What the wrapper does NOT expose

- Carbon's `$$restProps` spread on the root `<div>`. Pass extra HTML attributes via `class` only; if a future need arises (e.g., custom `data-*`), add an explicit prop.
- No event forwarding — Carbon Loading doesn't dispatch any events.

## File budget

The wrapper is 22 LOC. Tiny — Loading is the smallest chassis component in spec-026 so far.

## Tests

No dedicated tests in Phase 6 (chassis ships with zero migrated consumers; Carbon's own behavior is tested upstream). When the first Argos consumer adopts Loading, add an integration test under `tests/integration/`.
