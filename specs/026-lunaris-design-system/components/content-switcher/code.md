# ContentSwitcher — Code

**Status:** Phase 9.1 chassis in progress
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/navigation/ContentSwitcher.svelte`
**Carbon component:** `<ContentSwitcher>` + `<Switch>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ContentSwitcher/ContentSwitcher.svelte>

---

## Argos `ContentSwitcher` adapter API

The Argos `ContentSwitcher` is a Svelte 5 (runes) wrapper that delegates to Carbon's `<ContentSwitcher>`. It exists to (1) keep call-sites idiomatic (callback prop, not event dispatcher), (2) make `selectedIndex` `$bindable()`, (3) standardise the `onChange` callback signature, (4) provide a `class`-forwarding seam for Lunaris-bespoke skins.

```ts
interface Props {
	selectedIndex?: number; // bindable via $bindable() — default 0
	size?: 'sm' | 'xl' | undefined; // undefined = Carbon default (32 px)
	light?: boolean;
	disabled?: boolean;
	selectiveMode?: 'automatic' | 'manual'; // automatic = arrow keys auto-commit; manual requires Enter/Space
	id?: string; // optional — Carbon defaults to `ccs-${random}`
	class?: string; // forwards to Carbon outer div for Lunaris skins
	onChange?: (detail: { index: number; text: string }) => void;
	children?: Snippet; // <Switch> nodes
}
```

**Rationale**:

- `selectedIndex` is `$bindable()` so consumers `bind:selectedIndex` exactly like a `<select>`'s `bind:value`. Migration is one-line.
- `onChange` callback receives `{ index, text }` already-unwrapped from Carbon's `CustomEvent<{ index, text }>`. Consumers don't touch `event.detail`.
- `selectiveMode` defaults to `"automatic"` (Carbon default) — arrow keys swap the active segment in-place and emit `change`. Use `"manual"` only when commit-on-Enter is required (e.g. when a slow side-effect fires on change and arrow-key scrubbing would thrash).
- `class` forwards to Carbon's outermost `bx--content-switcher` div so panels can override per-instance styling.
- No event dispatcher — `onChange` callback is the only side-effect path.

---

## Argos `Switch` (segment) re-export

The Carbon `<Switch>` component is re-exported as-is — no wrapper needed. Carbon `<Switch>` API is small enough (`text`, `iconDescription`, `disabled`, `id`) that wrapping adds no value. Consumers import it from `chassis/navigation`:

```ts
// src/lib/components/chassis/navigation/index.ts
export { default as ContentSwitcher } from './ContentSwitcher.svelte';
export { Switch } from 'carbon-components-svelte';
```

---

## Consumer pattern

### Before (raw HTML, AGENTS filter)

```svelte
<div class="seg-group" role="tablist" aria-label="Agent filter">
	{#each ['ALL', 'ACTIVE', 'IDLE', 'DEAD'] as label, i}
		<button
			class="seg"
			role="tab"
			aria-pressed={agentFilter === label.toLowerCase()}
			onclick={() => (agentFilter = label.toLowerCase())}
		>
			{label}
		</button>
	{/each}
</div>
```

### After (Carbon-wrapped)

```svelte
<script lang="ts">
	import { ContentSwitcher, Switch } from '$lib/components/chassis/navigation';

	let agentFilterIndex = $state(0);
	const filters = ['all', 'active', 'idle', 'dead'] as const;
	const agentFilter = $derived(filters[agentFilterIndex]);
</script>

<ContentSwitcher
	bind:selectedIndex={agentFilterIndex}
	onChange={({ index }) => console.debug('agents.filter.change', filters[index])}
>
	<Switch text="ALL" />
	<Switch text="ACTIVE" />
	<Switch text="IDLE" />
	<Switch text="DEAD" />
</ContentSwitcher>
```

The hand-rolled `role="tablist"` / `aria-pressed` ARIA goes away — Carbon emits the correct `role="tab"` + `aria-selected` automatically. Index is the canonical state; derived label gives the consumer back the string form for downstream logic.

### Before (SPECTRUM mode `<select>` mis-pattern)

```svelte
<select bind:value={spectrumMode} class="mode-select">
	<option value="peak">PEAK</option>
	<option value="avg">AVG</option>
	<option value="live">LIVE</option>
</select>
```

### After (Carbon-wrapped, sm size)

```svelte
<script lang="ts">
	import { ContentSwitcher, Switch } from '$lib/components/chassis/navigation';

	const modes = ['peak', 'avg', 'live'] as const;
	let modeIndex = $state(0);
	const spectrumMode = $derived(modes[modeIndex]);
</script>

<ContentSwitcher size="sm" bind:selectedIndex={modeIndex}>
	<Switch text="PEAK" />
	<Switch text="AVG" />
	<Switch text="LIVE" />
</ContentSwitcher>
```

The select-as-toggle anti-pattern is replaced with a real segmented control. `size="sm"` keeps the 24-px height that matches the existing SpectrumControls density.

### Icon-only (AGENTS view-mode)

```svelte
<script lang="ts">
	import { ContentSwitcher, Switch } from '$lib/components/chassis/navigation';
	import { Grid_4, List, ColumnDelete } from 'carbon-icons-svelte';

	let viewModeIndex = $state(0);
</script>

<ContentSwitcher bind:selectedIndex={viewModeIndex}>
	<Switch iconDescription="Grid view"><Grid_4 size={16} /></Switch>
	<Switch iconDescription="List view"><List size={16} /></Switch>
	<Switch iconDescription="Split view"><ColumnDelete size={16} /></Switch>
</ContentSwitcher>
```

`iconDescription` becomes the accessible name; Carbon hides it visually but exposes to AT.

---

## Direct Carbon `<ContentSwitcher>` use

For surfaces needing Carbon-specific features the adapter does not expose (custom slot composition with non-Switch children, advanced `selectionRef` access for testing):

```svelte
<script lang="ts">
	import { ContentSwitcher, Switch } from 'carbon-components-svelte';
</script>

<ContentSwitcher selectedIndex={0} on:change={(e) => console.log(e.detail)}>
	<Switch text="One" />
	<Switch text="Two" />
</ContentSwitcher>
```

Lunaris tokens flow through automatically — the wrapper is a thin convenience layer, not a styling layer.

---

## State + interaction semantics

- **Controlled value** — adapter uses `$bindable()`; parent owns the canonical `selectedIndex`.
- **Arrow-key navigation** — Carbon ships `automatic` mode by default; left/right arrows swap and commit. `manual` mode requires Enter/Space to commit.
- **Tab order** — single tab-stop for the whole switcher; arrow keys move within. AT announces "tablist, [N] tabs, [current] selected".
- **Disabled (whole)** — passes through; all segments lose hover and click; AT announces "disabled".
- **Disabled (per-segment)** — `<Switch disabled>` muted style + skip in arrow-key cycle.
- **No invalid state** — Carbon does not expose per-switcher validation. If a switcher's selection invalidates an enclosing form, render the error at the form-level, not on the switcher.

---

## Migration consumer call-sites (Phase 9.1 scope)

Per audit on 2026-05-04:

| File                                                              | Line | Site description                                            | Size    |
| ----------------------------------------------------------------- | ---- | ----------------------------------------------------------- | ------- |
| `src/lib/components/dashboard/views/AgentsView.svelte`            | TBD  | filter tabs (ALL / ACTIVE / IDLE / DEAD)                    | default |
| `src/lib/components/dashboard/views/AgentsView.svelte`            | TBD  | view-mode toggle (GRID / LIST / SPLIT) icon-only            | default |
| `src/lib/components/dashboard/panels/SpectrumControls.svelte`     | TBD  | mode toggle (PEAK / AVG / LIVE)                             | sm      |
| `src/lib/components/dashboard/panels/FilterBar.svelte`            | TBD  | quick-filter chips                                          | sm      |
| `src/lib/components/dashboard/views/ReportsView.svelte`           | TBD  | export-format (PDF / CSV / JSON)                            | default |

Total: ~5-7 sites. Migration order: SPECTRUM mode first (highest visibility, simplest mapping) → AGENTS filter → AGENTS view-mode (icon-only validation) → FilterBar → ReportsView.

---

## What we don't migrate yet

- **`<ContentSwitcherSkeleton>`** — Carbon ships a skeleton; no Argos surface needs async-loaded segmented controls today.
- **Non-`<Switch>` children inside `<ContentSwitcher>`** — Carbon allows custom child components matching the `<Switch>` interface; Argos has no such custom segment pattern.
- **Inline mode switching with optimistic UI** — none of the PR sites need the optimistic / rollback dance; index swap is synchronous.

---

## Authority citations

- Carbon Svelte source (v0.107.0): <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ContentSwitcher/ContentSwitcher.svelte>
- Carbon Svelte `<Switch>` source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ContentSwitcher/Switch.svelte>
- Carbon Svelte type defs: `node_modules/carbon-components-svelte/types/ContentSwitcher/ContentSwitcher.svelte.d.ts`
- Carbon SCSS source: `docs/carbon-design-system/packages/styles/scss/components/content-switcher/_content-switcher.scss`
- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-contentswitcher--default>
- Argos current bespoke (canary): `src/lib/components/dashboard/views/AgentsView.svelte`
- Adapter pattern reference: Phase 5 `Tabs.svelte` + spec `tabs/code.md`
