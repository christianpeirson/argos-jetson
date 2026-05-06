# Tooltip — Code

The `<Tooltip>` chassis wrapper at `src/lib/components/chassis/forms/Tooltip.svelte` is a thin Svelte-5-runes adapter over Carbon's Svelte-4 Tooltip primitive.

## Note: which Tooltip primitive this wraps

This chassis wraps Carbon's `<Tooltip>` — the **inline info-icon pattern**. It renders an info-icon trigger followed by a popover body when activated. Use it where you previously had:

```html
<span>Some Label <button aria-label="What is this?">i</button></span>
<!-- and a tooltip body -->
```

For **icon-button hover tooltips** (e.g. migrations of `<button title="Refresh">`, `<button title="Open settings">`), Carbon's `<TooltipIcon>` is the right primitive — it wraps an existing icon button with a hover/focus tooltip. **A future sub-phase will add a chassis `TooltipIcon` wrapper** for that use case; until then, `<button title="X">` patterns remain native.

The live PR-A canary is `src/lib/components/dashboard/panels/BluetoothPanel.svelte` — wraps the BlueDragon scanner status header with a `<Tooltip>` explaining what each indicator means.

## Rationale for the wrapper layer

Carbon ships `carbon-components-svelte@0.107.0`, which is **still Svelte 4 internally** — uses `export let`, `createEventDispatcher`, `$$restProps`. Argos consumer code is Svelte 5 with runes. The wrapper:

1. Accepts Svelte-5-rune-style typed props via `$props()`.
2. Bridges Carbon's `dispatch("open")` / `dispatch("close")` to Svelte-5 callback props `onOpen` / `onClose`.
3. Sets a safe default `iconDescription = 'More information'` (WCAG 2.2 SC 4.1.2 — see accessibility.md and PR-A CR fix commit `74211d8d`).
4. Forwards the `children` snippet to Carbon's default slot.

## Public API — `<Tooltip>` component

| Prop              | Type                                     | Default              | Description                                                          |
| ----------------- | ---------------------------------------- | -------------------- | -------------------------------------------------------------------- |
| `open`            | `boolean` (bindable)                     | `false`              | Tooltip popover visibility. Two-way bindable.                        |
| `direction`       | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'`           | Popover placement relative to trigger.                               |
| `align`           | `'start' \| 'center' \| 'end'`           | `'start'`            | Alignment of popover edge to trigger.                                |
| `hideIcon`        | `boolean`                                | `false`              | Hide the default info icon (use external trigger via `triggerText`). |
| `iconDescription` | `string`                                 | `'More information'` | a11y label for the trigger button (WCAG 4.1.2).                      |
| `triggerText`     | `string`                                 | `''`                 | Visible label rendered next to (or as) the trigger.                  |
| `enterDelayMs`    | `number`                                 | `100`                | Delay before tooltip opens on hover.                                 |
| `leaveDelayMs`    | `number`                                 | `300`                | Delay before tooltip closes after hover ends.                        |
| `tabindex`        | `number \| string`                       | `'0'`                | TAB order index for the trigger button.                              |
| `tooltipId`       | `string`                                 | auto-generated       | DOM id for the popover (used for `aria-describedby`).                |
| `triggerId`       | `string`                                 | auto-generated       | DOM id for the trigger button.                                       |
| `class`           | `string`                                 | `undefined`          | Extra class forwarded to Carbon's outer wrapper.                     |

## Events / callback props

Chassis uses Svelte-5 callback props that bridge Carbon's Svelte-4 event dispatcher.

| Callback prop | Args | Maps to Carbon event | Notes                                         |
| ------------- | ---- | -------------------- | --------------------------------------------- |
| `onOpen`      | `()` | `on:open`            | Fires when popover opens (hover/focus/click)  |
| `onClose`     | `()` | `on:close`           | Fires when popover closes (blur/escape/leave) |

## Slots

| Slot       | Type                | Description                                      |
| ---------- | ------------------- | ------------------------------------------------ |
| `children` | `Snippet` (default) | Tooltip body content. Plain text or rich markup. |

Carbon also exposes named slots `triggerText` and `icon` for trigger customization. The chassis wrapper does NOT forward those — use the `triggerText` and `hideIcon` props instead. If a tier-2 site needs custom trigger markup, add named-slot snippet forwarding in the wrapper.

## Carbon → chassis API mapping

| Carbon API                             | Chassis equivalent       | Notes                                 |
| -------------------------------------- | ------------------------ | ------------------------------------- |
| `bind:open`                            | `bind:open` (preserved)  | Same shape                            |
| `on:open={() => ...}`                  | `onOpen={() => ...}`     | Callback prop                         |
| `on:close={() => ...}`                 | `onClose={() => ...}`    | Callback prop                         |
| `<svelte:fragment slot="triggerText">` | `triggerText="..."` prop | Plain string only in PR-A             |
| `<svelte:fragment slot="icon">`        | not exposed              | Use `hideIcon={true}` + external icon |

## Paste-ready snippets

### Basic (default direction + align)

```svelte
<script lang="ts">
	import Tooltip from '$lib/components/chassis/forms/Tooltip.svelte';
</script>

<Tooltip>Bluetooth scanner samples 2.4 GHz every 250 ms when active.</Tooltip>
```

This renders an info icon; on hover/focus, the tooltip body opens below.

### With visible trigger text

```svelte
<Tooltip triggerText="What is BlueDragon?">
	BlueDragon is the BLE/BT classic scanner stack — wraps `bluetoothctl` plus a custom HCI sniffer.
	See the bluetooth tab for live device captures.
</Tooltip>
```

### Custom direction + align (top, centered)

```svelte
<Tooltip direction="top" align="center" triggerText="HackRF status">
	Green = streaming. Amber = idle. Red = USB device removed.
</Tooltip>
```

### Hidden icon (external trigger)

```svelte
<Tooltip hideIcon iconDescription="Refresh status info" triggerText="Refresh">
	Re-scans Bluetooth + Wi-Fi adapters via `nmcli`. Takes ~2 seconds.
</Tooltip>
```

When `hideIcon={true}`, the `iconDescription` becomes the accessible name of the trigger button — keep it descriptive.

### Two-way bindable open state

```svelte
<script lang="ts">
	let isOpen = $state(false);
</script>

<Tooltip
	bind:open={isOpen}
	onOpen={() => console.log('opened')}
	onClose={() => console.log('closed')}
>
	Bound state.
</Tooltip>

<button onclick={() => (isOpen = !isOpen)}>Toggle externally</button>
```

## Live canary reference

The PR-A canary is `src/lib/components/dashboard/panels/BluetoothPanel.svelte` — wraps the panel-header BlueDragon indicator with a `<Tooltip>` so operators can hover/focus the icon and read what each scanner state means.

## What the wrapper does NOT expose

- Named slots for `triggerText` / `icon` — props cover all PR-A use cases.
- Carbon's `pulse` animation modifier — not used in Argos visual identity.
- Imperative `bind:ref` to the popover — add when first needed.

## File budget

The wrapper is 60 LOC (`forms/Tooltip.svelte`), within the 80-LOC chassis budget.

## Tests

No Vitest tests in PR-A — Carbon covers the underlying primitive. Argos-side smoke:

1. `npm run build` clean.
2. Chrome-devtools MCP visual diff via `mcp__chrome-devtools__hover` on the BluetoothPanel canary.
3. Manual TAB / focus / Esc trace (a11y — see accessibility.md).
