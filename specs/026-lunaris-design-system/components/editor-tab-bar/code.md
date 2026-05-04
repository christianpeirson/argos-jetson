# EditorTabBar — Code

The `<EditorTabBar>` chassis at `src/lib/components/chassis/EditorTabBar.svelte` is a **bespoke Argos design-system primitive** — NOT a Carbon wrapper. It implements the WAI-ARIA APG **Toolbar** pattern (`https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/`) with horizontal roving-tabindex over alternating `role="tab"` + close buttons.

## Rationale for a bespoke chassis (not a Carbon wrapper)

Carbon's `<Tabs>` ships `<a role="tab">` anchors with no slot for nested interactives — by W3C ARIA APG design (`role="tab"` forbids interactive descendants). The pre-migration `TerminalTabBar` violated APG by nesting a close `<button>` inside `role="tab"`. There is no Carbon primitive that legally supports per-tab close affordance.

Industry practice (VS Code editor tabs, Chrome browser tabs) uses a **toolbar composite**: each tab and its close-X are SIBLING buttons inside `role="toolbar"`. EditorTabBar follows that pattern.

This is the SECOND bespoke chassis primitive in spec-026 (after `PanelStatus`, Phase 8.4).

## Public API — `<EditorTabBar>` component

```typescript
import type { Snippet } from 'svelte';

export interface EditorTab {
	id: string;             // stable across renders
	title: string;
	icon?: Snippet;
}

interface Props {
	tabs: EditorTab[];
	activeId: string;
	onActivate: (id: string) => void;
	onClose?: (id: string) => void;
	ariaLabel?: string;     // default 'Editor tabs'
	trailing?: Snippet;     // hosted at end of the toolbar
	class?: string;
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `tabs` | `EditorTab[]` | **REQUIRED** | Ordered list of tabs. `id` MUST be stable across renders |
| `activeId` | `string` | **REQUIRED** | The `id` of the currently selected tab. Drives `aria-selected` + initial roving cursor |
| `onActivate` | `(id: string) => void` | **REQUIRED** | Fired on click / Enter / Space on a tab |
| `onClose` | `(id: string) => void` | `undefined` | Fired on click / Enter / Space on a close button. Omit to suppress close affordance entirely (tabs render without close-X) |
| `ariaLabel` | `string` | `'Editor tabs'` | Accessible name for the toolbar |
| `trailing` | `Snippet` | `undefined` | Trailing slot for "+ new" button / dropdown. Renders AFTER all tabs |
| `class` | `string` | `undefined` | Extra class on outer `<div>` |

## Module-level type export

```svelte
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	export interface EditorTab { id: string; title: string; icon?: Snippet; }
</script>
```

Consumers import the `EditorTab` type:

```svelte
<script lang="ts">
	import EditorTabBar, { type EditorTab } from '$lib/components/chassis/EditorTabBar.svelte';

	const tabs = $derived<EditorTab[]>(
		$terminalSessions.map((s) => ({ id: s.id, title: s.title }))
	);
</script>
```

## Roving-tabindex algorithm

The chassis maintains a `cursorIdx: number` ($state) referencing the currently focused item in the flat ordered list `[tab0, close0, tab1, close1, …]`. Trailing-snippet content is NOT in the roving list (Tab-reachable, not arrow-reachable — per APG Toolbar's "multi-stop toolbar" allowance).

| Key | Effect |
|---|---|
| ArrowRight | `cursorIdx = (cursorIdx + 1) % len` |
| ArrowLeft | `cursorIdx = (cursorIdx - 1 + len) % len` |
| Home | `cursorIdx = 0` |
| End | `cursorIdx = len - 1` |
| Enter / Space | If item is a tab → `onActivate(id)`; if close → `onClose?.(id)` |
| Tab | Native — exits the toolbar |

`tabindex` is `0` only on the item at `cursorIdx`; all others are `-1`. After arrow movement, an `$effect` calls `.focus()` on the new item via `bind:this` element refs.

## Focus restoration after close

When a tab is closed, the consumer removes it from `tabs`. The chassis re-derives `cursorIdx` via:

```typescript
$effect(() => {
	const max = items.length - 1;
	if (cursorIdx > max) cursorIdx = Math.max(0, max);
});
```

The next item slides into focus. If the active tab is closed, the consumer is responsible for picking a new `activeId` (typical: previous tab in DOM order).

## Snippets

The chassis exposes TWO snippets:

- `tabs[i].icon` — per-tab icon (optional). Rendered as a sibling `<span aria-hidden="true">` inside the tab `<button>`.
- `trailing` — appended after all tabs. Use for "+ new" button, dropdown, or status indicator. Trailing-snippet contents are Tab-reachable but NOT arrow-reachable (per APG multi-stop toolbar).

## Carbon → chassis API mapping

N/A — this chassis does not wrap a Carbon primitive. It IS the design source of truth.

## Paste-ready snippets

### Minimal (no close, no trailing)

```svelte
<EditorTabBar
	tabs={[{ id: '1', title: 'Tab one' }, { id: '2', title: 'Tab two' }]}
	activeId={'1'}
	onActivate={(id) => console.log('activate', id)}
/>
```

### Terminal-panel pattern (close + trailing dropdown)

```svelte
<script lang="ts">
	import EditorTabBar, { type EditorTab } from '$lib/components/chassis/EditorTabBar.svelte';
	import {
		setActiveSession,
		terminalPanelState,
		terminalSessions
	} from '$lib/stores/dashboard/terminal-store';

	let { availableShells, showShellDropdown, onCreateSession, onCloseSession, onToggleShellDropdown } = $props();

	const tabs = $derived<EditorTab[]>(
		$terminalSessions.map((s) => ({ id: s.id, title: s.title }))
	);

	function activate(id: string) { setActiveSession(id); }
	function close(id: string) { onCloseSession(new MouseEvent('click'), id); }
</script>

<EditorTabBar
	{tabs}
	activeId={$terminalPanelState.activeTabId}
	onActivate={activate}
	onClose={close}
	ariaLabel="Terminal sessions"
>
	{#snippet trailing()}
		<button class="add-btn" aria-label="New terminal" onclick={onToggleShellDropdown}>+</button>
		{#if showShellDropdown}
			<div class="dropdown-menu">
				{#each availableShells as shell}
					<button class="dropdown-item" onclick={() => onCreateSession(shell.path)}>{shell.name}</button>
				{/each}
			</div>
		{/if}
	{/snippet}
</EditorTabBar>
```

## What the chassis does NOT expose

- Drag-to-reorder tabs (deferred — would require `@dnd-kit` integration; not needed for terminal panel).
- Overflow scrolling for >N tabs (deferred — terminal panel currently caps at ~8 sessions; horizontal scroll handled by parent CSS overflow).
- Per-tab disabled state (deferred — no consumer needs it).

## File budget

The chassis is ~140 LOC (`chassis/EditorTabBar.svelte`) including styles. Includes ~30 LOC of roving-tabindex helpers (extract to `editor-tab-bar-focus.ts` if it grows; for v1 keep co-located). Architecture rule: ≤300 LOC/file, ≤50 LOC/function. Tabindex math + key dispatch each ≤20 LOC.

## Tests

Vitest unit tests in `editor-tab-bar.test.ts` cover:

1. `role="toolbar"` + `aria-label` + `aria-orientation="horizontal"` rendered correctly.
2. Active tab `tabindex=0`; all others `tabindex=-1`.
3. ArrowRight from active tab focuses sibling close button (then next tab).
4. ArrowLeft/Right wrap; Home/End jump.
5. Enter/Space on tab fires `onActivate(id)` only.
6. Enter/Space on close fires `onClose(id)` only.
7. `closest('[role="tab"]')` of close buttons returns null — NO nested interactive.
8. `trailing` snippet renders + is Tab-reachable.

E2E (axe via Playwright) extends `tests/e2e/accessibility.spec.ts` with 3-session terminal scan asserting `violations: []` at WCAG 2.1 AA.
