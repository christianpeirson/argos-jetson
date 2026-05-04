# Accordion — Code

**Status:** Phase 9.1 chassis in progress
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/disclosure/Accordion.svelte`
**Carbon component:** `<Accordion>` + `<AccordionItem>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/Accordion.svelte>

---

## Argos `Accordion` adapter API

The Argos `Accordion` is a Svelte 5 (runes) wrapper that delegates to Carbon's `<Accordion>`. It exists to (1) keep call-sites idiomatic, (2) make `<AccordionItem>`'s `open` `$bindable()`, (3) standardise the change callback into a typed signature, (4) provide a `class`-forwarding seam for Lunaris-bespoke skins (nav-active emphasis, tactical density).

```ts
// Outer <Accordion> wrapper props
interface AccordionProps {
	size?: 'sm' | 'xl' | undefined;          // undefined = default 40px
	align?: 'start' | 'end';                 // default 'end' (Carbon default)
	disabled?: boolean;                       // disable all items
	skeleton?: boolean;                       // render <AccordionSkeleton>
	id?: string;
	class?: string;                           // forwards to outer <ul>
	children?: Snippet;
}

// Inner <AccordionItem> wrapper props
interface AccordionItemProps {
	title?: string;                           // visible heading text (or use `title` slot)
	open?: boolean;                           // bindable via $bindable() — default false
	disabled?: boolean;
	iconDescription?: string;                 // chevron AT description; default "Expand/Collapse"
	id?: string;
	class?: string;                           // forwards to <li> for active-item emphasis
	onToggle?: (open: boolean) => void;       // typed callback — replaces Carbon's CustomEvent<{ open }>
	children?: Snippet;                       // body content
	titleSlot?: Snippet;                      // rich title (icon + label) when string title is too thin
}
```

**Rationale**:

- `open` is `$bindable()` so consumers `bind:open` to track per-item expand state. Default false.
- `onToggle(open)` callback receives a plain boolean — `event.detail.open` already unwrapped.
- `class` on `<Accordion>` forwards to the outer `<ul>`; on `<AccordionItem>` forwards to the `<li>`. Lunaris-bespoke skins (`tactical`, `active`) attach via consumer-provided class names.
- `titleSlot` is a snippet escape-hatch — when the title needs an icon-prefix (e.g. Workflows category icon), pass a snippet instead of a string.
- Carbon's `<Accordion>` does NOT ship single-select coordination; if a surface needs single-select-only behavior, the consumer manages it via `bind:open` per item with side-effect close-others logic. Wrapper does not enforce.

---

## Sub-component re-exports

```ts
// src/lib/components/chassis/disclosure/index.ts
export { default as Accordion } from './Accordion.svelte';
export { default as AccordionItem } from './AccordionItem.svelte';
export { AccordionSkeleton } from 'carbon-components-svelte';
```

The `<AccordionItem>` is wrapped (because `open` needs `$bindable()` + `onToggle` typing). `<AccordionSkeleton>` is re-exported as-is.

---

## Consumer pattern

### Before (raw HTML, Workflows panel)

```svelte
<div class="cat-list">
	{#each categories as cat}
		<div class="cat" class:active={cat.id === activeCat}>
			<button
				class="cat-head"
				aria-expanded={openCats.includes(cat.id)}
				aria-controls="cat-body-{cat.id}"
				onclick={() => toggleCat(cat.id)}
			>
				<ChevronRight class="cat-chevron" />
				{cat.label}
			</button>
			{#if openCats.includes(cat.id)}
				<div id="cat-body-{cat.id}" class="cat-body">
					{#each cat.workflows as wf}
						<WorkflowRow {wf} />
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
```

### After (Carbon-wrapped)

```svelte
<script lang="ts">
	import { Accordion, AccordionItem } from '$lib/components/chassis/disclosure';
	import WorkflowRow from './WorkflowRow.svelte';

	let { categories, activeCat } = $props<{ categories: WorkflowCat[]; activeCat: string }>();

	// Map of categoryId → open state, all start collapsed except the active one
	const openMap = $state<Record<string, boolean>>(
		Object.fromEntries(categories.map((c) => [c.id, c.id === activeCat])),
	);
</script>

<Accordion size="sm" align="start" class="tactical">
	{#each categories as cat (cat.id)}
		<AccordionItem
			title={cat.label}
			bind:open={openMap[cat.id]}
			class={cat.id === activeCat ? 'active' : ''}
		>
			{#each cat.workflows as wf (wf.id)}
				<WorkflowRow {wf} />
			{/each}
		</AccordionItem>
	{/each}
</Accordion>
```

The hand-rolled `aria-expanded` + `aria-controls` + chevron animation goes away — Carbon owns all of it. The active-category leading-border emphasis preserves via `class="active"` (the `class` prop forwards to the `<li>`, which the Lunaris theme overlay targets).

### Single-select coordination (rare)

If a surface needs *only one item open at a time*, the consumer wires the close-others logic:

```svelte
<script lang="ts">
	let openId = $state<string | null>(null);
</script>

<Accordion>
	{#each items as it (it.id)}
		<AccordionItem
			title={it.label}
			open={openId === it.id}
			onToggle={(o) => (openId = o ? it.id : null)}
		>
			{it.body}
		</AccordionItem>
	{/each}
</Accordion>
```

Here `bind:open` is replaced with `open=` + `onToggle`. The wrapper does not auto-coordinate.

### Title with icon (Tools flyout)

```svelte
<script lang="ts">
	import { Accordion, AccordionItem } from '$lib/components/chassis/disclosure';
	import { Radio, Wifi, Bluetooth } from 'carbon-icons-svelte';
</script>

<Accordion size="sm" align="start" class="tactical">
	<AccordionItem bind:open={openSdr}>
		{#snippet titleSlot()}
			<Radio size={16} /> SDR TOOLS
		{/snippet}
		<!-- … sdr tool list … -->
	</AccordionItem>
	<AccordionItem bind:open={openWifi}>
		{#snippet titleSlot()}
			<Wifi size={16} /> WIFI TOOLS
		{/snippet}
		<!-- … wifi tool list … -->
	</AccordionItem>
</Accordion>
```

The `titleSlot` snippet replaces the `title` string when richer markup is needed.

---

## Direct Carbon `<Accordion>` use

For surfaces needing Carbon-specific features the adapter does not expose (custom slot composition, deep ref access, `<AccordionSkeleton>` directly):

```svelte
<script lang="ts">
	import { Accordion, AccordionItem } from 'carbon-components-svelte';
</script>

<Accordion>
	<AccordionItem title="Section 1">Content 1</AccordionItem>
	<AccordionItem title="Section 2">Content 2</AccordionItem>
</Accordion>
```

Lunaris tokens flow through automatically.

---

## State + interaction semantics

- **Controlled per-item open** — adapter uses `$bindable()` on `<AccordionItem.open>`; parent owns canonical state.
- **Multi-select default** — Carbon's default; Argos's wrapper does not change it.
- **Single-select** — opt-in via consumer-managed `open=` + `onToggle` wiring (see snippet above).
- **Disabled item** — heading visually muted, click + Space + Enter no-op, AT announces "disabled".
- **Disabled accordion (whole)** — propagates `disabled={true}` to all child items.
- **Skeleton mode** — `<AccordionSkeleton>` ships separately; not currently used in Phase 9.1.
- **Reduced motion** — Carbon's chevron-rotate + padding-transition respect `prefers-reduced-motion: reduce` via the motion-mixin token layer.

---

## Migration consumer call-sites (Phase 9.1 scope)

Per audit on 2026-05-04:

| File                                                              | Site description                       | Variant                |
| ----------------------------------------------------------------- | -------------------------------------- | ---------------------- |
| `src/lib/components/dashboard/panels/WorkflowsPanel.svelte`       | category groups (RECON / GSM-SDR / …)  | sm + start + tactical  |
| `src/lib/components/dashboard/overlays/ToolsFlyout.svelte`        | tool sub-categories                    | sm + start + tactical  |
| `src/lib/components/dashboard/views/ReportsView.svelte`           | mission report sections                | default + end          |
| `src/lib/components/mk2/Tweaks.svelte`                            | advanced settings sections             | default + end          |

Total: ~4 sites. Migration order: Workflows panel first (highest visibility, biggest payoff) → Tools flyout → Tweaks → ReportsView.

---

## What we don't migrate yet

- **`<AccordionSkeleton>`** — surfaces are synchronous; reserved.
- **Drag-reorder accordion items** — would need a different primitive.
- **Async lazy-load body content** — Carbon does not own; consumer can lazy-render via `{#if open}` if a body is heavy.
- **Nested accordions > 2 levels** — Tools flyout's 2 levels is the deepest; AT-verified manually. 3+ levels deferred until requested.

---

## Authority citations

- Carbon Svelte source (v0.107.0): <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/Accordion.svelte>
- Carbon Svelte `<AccordionItem>` source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/AccordionItem.svelte>
- Carbon Svelte type defs: `node_modules/carbon-components-svelte/types/Accordion/Accordion.svelte.d.ts`
- Carbon SCSS source: `docs/carbon-design-system/packages/styles/scss/components/accordion/_accordion.scss`
- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-accordion--default>
- Argos current bespoke (canary): `src/lib/components/dashboard/panels/WorkflowsPanel.svelte`
- Adapter pattern reference: Phase 5 `Tabs.svelte` + spec `tabs/code.md`
