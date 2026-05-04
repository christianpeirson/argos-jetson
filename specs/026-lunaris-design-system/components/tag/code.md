# Tag — Code

**Status:** Phase 9.1 — chassis implementation in flight
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/data/Tag.svelte`
**Carbon component:** `<Tag>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tag/Tag.svelte>

---

## Argos `Tag` adapter API

The Argos `Tag` is a Svelte 5 (runes) wrapper that delegates to Carbon's `<Tag>`. It exists to (1) keep call-sites idiomatic with callback props (no Carbon event dispatcher), (2) lock the `kind` enum to the 12 Carbon kinds (TypeScript-enforced), (3) provide a small ergonomic API (`onClose` for filter, `onClick` for interactive).

```ts
type TagKind =
	| 'red'
	| 'magenta'
	| 'purple'
	| 'blue'
	| 'cyan'
	| 'teal'
	| 'green'
	| 'gray'
	| 'cool-gray'
	| 'warm-gray'
	| 'high-contrast'
	| 'outline';

interface Props {
	kind?: TagKind; // default: 'gray'
	size?: 'default' | 'sm'; // default: 'default'
	filter?: boolean; // adds close X
	interactive?: boolean; // renders as <button> for whole tag click
	disabled?: boolean;

	// a11y
	title?: string; // tooltip; falls back per Carbon
	id?: string;

	// Filter close X
	closeButtonProps?: Record<string, unknown>; // forwarded to inner <button>

	// Callbacks
	onClick?: (e: MouseEvent | KeyboardEvent) => void; // interactive only
	onClose?: (e: MouseEvent) => void; // filter only

	// Slots
	icon?: Snippet; // leading icon (16 px / 12 px sm)
	children: Snippet; // label content

	class?: string;
}
```

**Rationale**:

- `kind` is type-locked to Carbon's 12; misuse fails at compile time.
- `interactive` and `filter` are independent — a tag can be both (button for whole-tag click + inner X for close).
- No validation layer (`labelText` / `helperText` / `invalid` / `warn`) — Carbon's `<Tag>` is purely informational and does NOT support form-style feedback. Tags are the form-style feedback for OTHER components (e.g., a Tag inside an `invalidText` block). The chassis intentionally omits these props.
- `onClose` and `onClick` are forwarded as plain callbacks; Carbon's event-dispatcher style is hidden.
- `icon` snippet for leading icons (carbon-icons-svelte preferred, Lucide acceptable).

---

## Consumer pattern

### Before (raw `<span>`, AGENTS status pill)

```svelte
{#if session.status === 'active'}
	<span class="status-pill status-active">ACTIVE</span>
{:else if session.status === 'paused'}
	<span class="status-pill status-paused">PAUSED</span>
{:else if session.status === 'idle'}
	<span class="status-pill status-idle">IDLE</span>
{:else if session.status === 'dead'}
	<span class="status-pill status-dead">DEAD</span>
{/if}
```

### After (Carbon-wrapped)

```svelte
<script lang="ts">
	import Tag from '$lib/components/chassis/data/Tag.svelte';

	const STATUS_KIND: Record<string, TagKind> = {
		active: 'blue',
		paused: 'warm-gray',
		idle: 'cyan',
		dead: 'red'
	};
</script>

<Tag kind={STATUS_KIND[session.status]}>{session.status.toUpperCase()}</Tag>
```

The 4-branch if/else collapses to a single `<Tag>` driven by a status→kind map. The `STATUS_KIND` constant lives in a shared module so AGENTS, SOURCES, and DataTable can import the same mapping (locking the palette per `tokens.md`).

### Filter chip with X (KISMET filter bar)

```svelte
<script lang="ts">
	import Tag from '$lib/components/chassis/data/Tag.svelte';

	let activeFilters = $state<{ key: string; label: string }[]>([
		{ key: 'enc', label: 'WPA2-PSK' },
		{ key: 'channel', label: 'CH 36' }
	]);

	function removeFilter(key: string) {
		activeFilters = activeFilters.filter((f) => f.key !== key);
	}
</script>

{#each activeFilters as f (f.key)}
	<Tag kind="outline" filter onClose={() => removeFilter(f.key)}>{f.label}</Tag>
{/each}
```

### Interactive tag (faceted-filter category click)

```svelte
<Tag kind="blue" interactive onClick={() => toggleCategory('sdr')}>SDR</Tag>
```

### With leading icon (Workflows category)

```svelte
<Tag kind="cool-gray" size="sm">
	{#snippet icon()}<Wifi size={12} />{/snippet}
	NETWORK
</Tag>
```

---

## Direct Carbon `<Tag>` use

For surfaces that need Carbon-specific features (custom CSS via `class` chain, `<TagSkeleton>` for loading states):

```svelte
<script>
	import { Tag, TagSkeleton } from 'carbon-components-svelte';

	let loading = $state(true);
</script>

{#if loading}
	<TagSkeleton size="sm" />
{:else}
	<Tag kind="green" size="sm">HEALTHY</Tag>
{/if}
```

Lunaris tokens flow through automatically.

---

## State + interaction semantics

- **Default (`<Tag>`)** — pure presentation; no hover, no click, no tab-stop.
- **`<Tag interactive>`** — renders as `<button>`; full tag area triggers `onClick`. Keyboard: Enter + Space activate.
- **`<Tag filter>`** — renders as `<span>` with inner `<button>` (X). Inner button is the only interactive element; clicking the X fires `onClose`. Keyboard: Tab focuses the X, Enter/Space activate.
- **`<Tag interactive filter>`** — both whole-tag click AND inner X close. Two tab-stops; user can Tab to whole tag, then Tab to X.
- **`<Tag disabled>`** — for interactive/filter only; `aria-disabled="true"`, removed from tab order, opacity 0.5.

---

## Migration consumer call-sites (Phase 9.1 scope)

### Phase 9.1 chassis introduction — no migrations yet

Phase 9.1 introduces the chassis only. Call-site migrations land in 9.1h-9.1k:

| Phase | File | Sites |
| --- | --- | --- |
| 9.1h | `src/lib/components/dashboard/views/AgentsView.svelte` | status pills (4 kinds × N sessions) |
| 9.1i | `src/lib/components/dashboard/panels/SourcesPanel.svelte` | source-state pills (4 kinds × N sources) |
| 9.1j | `src/lib/components/dashboard/views/WorkflowsView.svelte` | category labels |
| 9.1k | `src/lib/components/dashboard/panels/KismetPanel.svelte` | filter chips (filter variant) |

Each sub-phase is its own atomic commit inside the Phase 9 daily PR.

---

## What we don't migrate yet

- **`<TagSkeleton>`** — no surface needs.
- **Custom kind values** — locked to the 12 Carbon kinds.
- **Wrapping behavior on long labels** — `nowrap + ellipsis` is the default; CSS override deferred.

---

## Authority citations

- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-tag--default>
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tag/Tag.svelte>
- Carbon Svelte type defs: `node_modules/carbon-components-svelte/types/Tag/Tag.svelte.d.ts`
- Carbon SCSS source: `docs/carbon-design-system/packages/styles/scss/components/tag/_tag.scss`
- Argos status palette lockdown: `specs/026-lunaris-design-system/tokens.md`
- Argos current bespoke (canary): `src/lib/components/dashboard/views/AgentsView.svelte`
- Adapter pattern reference: Phase 4 `Toast` + spec `toast-notification/code.md`
