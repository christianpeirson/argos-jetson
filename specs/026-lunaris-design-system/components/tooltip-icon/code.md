# TooltipIcon — Code

The `<TooltipIcon>` chassis wrapper at `src/lib/components/chassis/forms/TooltipIcon.svelte` is a thin Svelte-5-runes adapter over Carbon's Svelte-4 TooltipIcon primitive.

## Note: which TooltipIcon primitive this wraps

This chassis wraps Carbon's `<TooltipIcon>` — the **icon-button hover-tooltip pattern**. It augments an existing icon button (the `icon` prop IS the trigger) with hover/focus-revealed text via `aria-describedby`. Use it where you previously had:

```html
<button title="Refresh"><RefreshIcon /></button>
```

For **info-icon trigger + popover body patterns** (e.g. multi-line BlueDragon scanner-status descriptions), Carbon's `<Tooltip>` is the right primitive — wrapped in chassis `<Tooltip>` since Phase 4 PR-A. The two are NOT interchangeable; ARIA wiring differs (`aria-describedby` here vs `aria-haspopup`+`aria-expanded` for the popover variant).

## Rationale for the wrapper layer

Carbon ships `carbon-components-svelte@0.107.0`, which is **still Svelte 4 internally** — uses `export let`, `createEventDispatcher`, `$$restProps`. Argos consumer code is Svelte 5 with runes. The wrapper:

1. Accepts Svelte-5-rune-style typed props via `$props()`.
2. Marks `tooltipText` and `icon` as **REQUIRED** in the Props interface — Carbon's source has them as defaultable, but accepting either default would yield an unlabeled icon button (WCAG 4.1.2 fail). Compile-time enforcement > runtime hope.
3. Bridges Carbon's `dispatch("open" | "close" | "click" | ...)` event dispatcher to Svelte-5 callback props `onClick` / `onOpen` / `onClose`.
4. Defaults `align='center'` per Carbon source (NOT `'start'` — that's chassis `<Tooltip>`'s convention; different primitive, different default).

## Public API — `<TooltipIcon>` component

| Prop           | Type                                     | Default        | Description                                                                                                                              |
| -------------- | ---------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `tooltipText`  | `string`                                 | **REQUIRED**   | Hover-revealed text. Becomes `aria-describedby` content. NOT optional — no safe default for accessibility.                               |
| `icon`         | `Component` (svelte)                     | **REQUIRED**   | Icon component to render inside the trigger. The icon IS the trigger. Lucide (`@lucide/svelte`) preferred; carbon-icons-svelte accepted. |
| `size`         | `16 \| 20 \| 24 \| 32`                   | `16`           | Icon size in px. Carbon supports any number; chassis narrows to the standard scale to discourage off-grid sizes.                         |
| `direction`    | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'`     | Popover placement relative to trigger.                                                                                                   |
| `align`        | `'start' \| 'center' \| 'end'`           | `'center'`     | Alignment of popover edge to trigger. Matches Carbon source default.                                                                     |
| `enterDelayMs` | `number`                                 | `100`          | Delay before tooltip opens on hover/focus.                                                                                               |
| `leaveDelayMs` | `number`                                 | `300`          | Delay before tooltip closes after hover/focus ends.                                                                                      |
| `disabled`     | `boolean`                                | `false`        | Disable all interactions. Trigger button receives `disabled` attribute.                                                                  |
| `open`         | `boolean` (bindable)                     | `false`        | Tooltip visibility. Two-way bindable for imperative control.                                                                             |
| `id`           | `string`                                 | auto-generated | DOM id for the wrapper span (auto-id `ccs-{random}` if omitted).                                                                         |
| `class`        | `string`                                 | `undefined`    | Extra class forwarded to Carbon's outer wrapper `<div class="bx--tooltip--icon">`.                                                       |

## Events / callback props

Chassis uses Svelte-5 callback props that bridge Carbon's Svelte-4 event dispatcher.

| Callback prop | Args                  | Maps to Carbon event | Notes                                                                  |
| ------------- | --------------------- | -------------------- | ---------------------------------------------------------------------- |
| `onClick`     | `(event: MouseEvent)` | `on:click`           | Fires on trigger button click — the action handler for the icon button |
| `onOpen`      | `()`                  | `on:open`            | Fires when popover opens (hover/focus/click)                           |
| `onClose`     | `()`                  | `on:close`           | Fires when popover closes (blur/escape/leave)                          |

Carbon also dispatches `mouseover`, `mouseenter`, `mouseleave`, `focus`, `blur` on the trigger button. The chassis doesn't forward these explicitly — add named callback props if a future surface needs them.

## Slots

The chassis does NOT expose slot forwarding. Carbon's TooltipIcon supports a `<slot name="tooltipText">` for rich body content as an alternative to the `tooltipText` prop, but Phase 8.1 use cases all fit single-string text. If a future surface needs rich body content (e.g. inline `<code>` for measurements), add named-slot snippet forwarding to the wrapper.

The icon is passed via the `icon` prop, NOT a slot — Carbon's source uses `<svelte:component this={icon}>` which requires a Component reference, not slot content.

## Carbon → chassis API mapping

| Carbon API                             | Chassis equivalent      | Notes                                                                       |
| -------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| `bind:open`                            | `bind:open` (preserved) | Same shape — `$bindable`                                                    |
| `on:click={(e) => ...}`                | `onClick={(e) => ...}`  | Callback prop. Most-used event                                              |
| `on:open={() => ...}`                  | `onOpen={() => ...}`    | Callback prop                                                               |
| `on:close={() => ...}`                 | `onClose={() => ...}`   | Callback prop                                                               |
| `<svelte:fragment slot="tooltipText">` | not exposed             | Use `tooltipText` prop (string only)                                        |
| `bind:ref`                             | not exposed             | Add when first needed                                                       |
| `portalTooltip={true}`                 | not exposed             | Auto-detected via `getContext("carbon:Modal")` — explicit override deferred |

## Paste-ready snippets

### Basic (toolbar action button)

```svelte
<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import TooltipIcon from '$lib/components/chassis/forms/TooltipIcon.svelte';
</script>

<TooltipIcon tooltipText="Clear chat" icon={Trash2} onClick={onClear} />
```

This is the AgentChatToolbar canary pattern — exact match.

### Custom direction + align (top-aligned for trigger near scrollable bottom)

```svelte
<TooltipIcon
	tooltipText="Refresh status"
	icon={RefreshCw}
	direction="top"
	align="center"
	onClick={refresh}
/>
```

### Disabled state

```svelte
<TooltipIcon
	tooltipText="Save (disabled — no changes)"
	icon={Save}
	disabled={!hasChanges}
	onClick={save}
/>
```

When `disabled={true}`, the trigger button becomes non-interactive but the tooltip still appears on hover (Carbon behaviour) — useful to explain WHY the action is unavailable.

### Conditional icon (deferred Phase 8.1 pattern, candidate for future chassis Button)

```svelte
<script lang="ts">
	import { Send, Loader2 } from '@lucide/svelte';
	import TooltipIcon from '$lib/components/chassis/forms/TooltipIcon.svelte';

	let { isStreaming } = $props();
	const sendIcon = $derived(isStreaming ? Loader2 : Send);
</script>

<TooltipIcon
	tooltipText={isStreaming ? 'Sending...' : 'Send message'}
	icon={sendIcon}
	disabled={isStreaming}
	onClick={sendMessage}
/>
```

This pattern was scoped out of Phase 8.1 (AgentChatPanel send button is a primary-action branded button — wrong primitive class for TooltipIcon). Documented here for the future chassis `<Button kind="primary">` migration.

### Two-way bindable open state

```svelte
<script lang="ts">
	let isOpen = $state(false);
</script>

<TooltipIcon
	bind:open={isOpen}
	tooltipText="More info"
	icon={Info}
	onOpen={() => console.log('opened')}
	onClose={() => console.log('closed')}
/>

<button onclick={() => (isOpen = !isOpen)}>Toggle externally</button>
```

## Live canary reference

The Phase 8.1 canary is `src/lib/components/dashboard/AgentChatToolbar.svelte` — wraps the `Clear chat` toolbar action button. Pattern: subtle 28×28 transparent-background icon button → Carbon TooltipIcon with default chrome (Lunaris theme overlay). The bespoke `.toolbar-btn` CSS rule was DELETED as part of the migration (Phase 8.1 net delta: +5 lines imports + 1 line TooltipIcon −15 lines bespoke button block −18 lines bespoke CSS = −27 LOC for AgentChatToolbar).

## What the wrapper does NOT expose

- **Named slot for `tooltipText`** — `tooltipText` prop covers all Phase 8.1 use cases; add slot if rich content needed.
- **`portalTooltip` explicit prop** — auto-detected via `<Modal>` context; explicit override deferred until first need.
- **`ref` (HTMLButtonElement export)** — add when first imperative-DOM use case appears.
- **Direct exposure of the `activeTooltipIcon` warm-handoff store** — Carbon manages internally; chassis stays out of the way.

## File budget

The wrapper is ~38 LOC (`forms/TooltipIcon.svelte`), within the 80-LOC chassis budget. Smaller than chassis `<Tooltip>` (60 LOC) because TooltipIcon has fewer props (no `triggerText`, no `hideIcon`, no `tabindex` plumbing — the icon button is its own trigger).

## Tests

No Vitest tests in Phase 8.1 — Carbon covers the underlying primitive. Argos-side smoke:

1. `npm run build` clean.
2. ESLint clean on the chassis + canary.
3. Chrome-devtools MCP visual diff via `mcp__chrome-devtools__hover` on the AgentChatToolbar canary.
4. Manual TAB / focus / Esc trace (a11y — see accessibility.md).
