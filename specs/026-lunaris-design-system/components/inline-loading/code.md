# InlineLoading — Code

The `<InlineLoading>` chassis wrapper at `src/lib/components/chassis/forms/InlineLoading.svelte` is a thin Svelte-5-runes adapter over Carbon's Svelte-4 InlineLoading primitive.

## Rationale for the wrapper layer

Carbon ships `carbon-components-svelte@0.107.0` with internal Svelte 4 syntax (`export let`, `createEventDispatcher`). Argos consumer code is Svelte 5 with runes. The wrapper job:

1. Accept Svelte-5-rune-style typed props via `$props()`.
2. Forward `status / description / iconDescription / successDelay` to Carbon's Svelte-4 props.
3. Bridge Carbon's `dispatch("success")` event to a Svelte-5 callback prop `onSuccess?()`.
4. Export the `Status` enum as a type alias for caller convenience.

## Public API — Props

| Prop              | Type                                              | Default     | Description                                                                                                                                     |
| ----------------- | ------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`          | `'active' \| 'inactive' \| 'finished' \| 'error'` | `'active'`  | Visual state of the indicator. Drives icon + animation + announcements.                                                                         |
| `description`     | `string \| undefined`                             | `undefined` | Visible text shown next to the icon. Omit for icon-only.                                                                                        |
| `iconDescription` | `string \| undefined`                             | `undefined` | Title text for the SVG icon (screen-reader fallback when `description` is omitted). Defaults to `status` for `'error'` and `'finished'` states. |
| `successDelay`    | `number`                                          | `1500`      | Milliseconds after `status` transitions to `'finished'` before `onSuccess()` fires.                                                             |
| `class`           | `string \| undefined`                             | `undefined` | Extra class forwarded to the root `<div>`.                                                                                                      |

## Public API — Callback props

Chassis uses Svelte 5 callback props that bridge Carbon's Svelte 4 `createEventDispatcher` events.

| Callback prop | Carbon source event                                                      | Argument | Description                                                                                              |
| ------------- | ------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `onSuccess`   | `dispatch("success")` (after `successDelay` ms when `status='finished'`) | none     | Fires AFTER the success delay completes — use to dismiss the loading region or chain a follow-up action. |

## Slots / children

None. Description is a string prop, not a slot.

## Carbon → chassis API mapping

| Carbon prop / event | Chassis prop / callback |
| ------------------- | ----------------------- |
| `status`            | `status`                |
| `description`       | `description`           |
| `iconDescription`   | `iconDescription`       |
| `successDelay`      | `successDelay`          |
| `on:success`        | `onSuccess: () => void` |

## Paste-ready snippets

### Default — active spinner with description

```svelte
<script lang="ts">
	import InlineLoading from '$lib/components/chassis/forms/InlineLoading.svelte';
</script>

<InlineLoading description="Loading…" />
```

### Inline status next to a button (state machine)

```svelte
<script lang="ts">
	import InlineLoading from '$lib/components/chassis/forms/InlineLoading.svelte';

	type SaveState = 'idle' | 'active' | 'finished' | 'error';
	let saveState = $state<SaveState>('idle');

	async function save(): Promise<void> {
		saveState = 'active';
		try {
			await fetch('/api/preset', { method: 'POST' });
			saveState = 'finished';
		} catch {
			saveState = 'error';
		}
	}
</script>

<button onclick={save}>Save</button>
{#if saveState !== 'idle'}
	<InlineLoading
		status={saveState}
		description={saveState === 'finished'
			? 'Saved.'
			: saveState === 'error'
				? 'Save failed.'
				: 'Saving…'}
		onSuccess={() => (saveState = 'idle')}
	/>
{/if}
```

### Loading-state branch (Argos `WeatherPanel` pattern)

```svelte
{:else if loading}
	<div class="wx-loading mono">
		<InlineLoading description="FETCHING METAR…" />
	</div>
```

### Description-less (spinner only)

```svelte
<InlineLoading iconDescription="Saving" />
```

## What the wrapper does NOT expose

- Carbon's `on:click`, `on:mouseover`, `on:mouseenter`, `on:mouseleave` event forwarding (Carbon source line 54-57). InlineLoading is non-interactive in Argos use cases; if a future site needs hover handlers, add them as callback props.
- `$$restProps` spread. Use `class` for ad-hoc styling.

## File budget

Wrapper is 33 LOC. Small — most of the surface is the Carbon `on:success` → `onSuccess` callback bridge.

## Tests

No dedicated tests in Phase 6 (existing `tests/integration/` covers the migrated consumer sites end-to-end; Carbon's own InlineLoading behavior is tested upstream). Future state-machine consumers (e.g., a save-with-feedback button) should add a test case for the `active → finished → onSuccess` transition timing.
