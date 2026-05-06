# Tabs — Code

This document is the consumer-facing API reference for the chassis `Tabs.svelte` and `TabsSkeleton.svelte` wrappers. Implementation lives at `src/lib/components/chassis/forms/Tabs.svelte` and `src/lib/components/chassis/forms/TabsSkeleton.svelte`.

## TabDef interface

Exported from `chassis/forms/Tabs.svelte:3-12` (module script):

```ts
export interface TabDef {
	id: string; // stable identifier; consumer references via selectedId
	label: string; // visible label text (also used as Carbon Tab.label fallback)
	badge?: string | number; // optional inline count/marker rendered after label
	hasItems?: boolean; // true → applies lunaris-has-items class (warning paint when inactive)
	disabled?: boolean; // true → Carbon greys + skips arrow-key navigation
	icon?: Component; // optional Svelte 5 Component (Carbon Tab icon slot)
	secondaryLabel?: string; // optional sub-label rendered beneath label (container variant)
}
```

The `id` field is the load-bearing addition vs Carbon's positional indexing. **Use stable string ids** (`'ble'`, `'bt'`, `'wifi-ap'`) — never array indexes — so callers survive tab list reordering without breaking `selectedId` binding.

## Chassis props

| Prop              | Type                       | Default               | Notes                                                                  |
| ----------------- | -------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `tabs`            | `TabDef[]`                 | required              | Order = render order                                                   |
| `selectedId`      | `string` (`$bindable`)     | `tabs[0]?.id ?? ''`   | Two-way bindable; preselects first tab if not set                      |
| `type`            | `'default' \| 'container'` | `'default'`           | Visual variant (see `style.md`)                                        |
| `autoWidth`       | `boolean`                  | `false`               | Tabs size to label; recommended for variable-length labels             |
| `fullWidth`       | `boolean`                  | `false`               | Tabs distribute evenly across width                                    |
| `iconDescription` | `string`                   | `'Show menu options'` | Forwarded to Carbon overflow-menu when tabs overflow horizontally      |
| `class`           | `string \| undefined`      | `undefined`           | Forwarded to root `bx--tabs` element                                   |
| `onChange`        | `(id: string) => void`     | `undefined`           | Fires after `selectedId` updates (post-state-change, not pre-validate) |

## TabsSkeleton props

| Prop    | Type                       | Default     | Notes                                              |
| ------- | -------------------------- | ----------- | -------------------------------------------------- |
| `count` | `number`                   | `4`         | Number of placeholder tabs to render               |
| `type`  | `'default' \| 'container'` | `'default'` | Match the variant of the real `<Tabs>` it replaces |
| `class` | `string \| undefined`      | `undefined` | Forwarded to root                                  |

Pure passthrough to `CarbonTabsSkeleton` — see `chassis/forms/TabsSkeleton.svelte:13`.

## Slots

**The chassis intentionally exposes no slots.** Tab labels are driven entirely from `TabDef.label` + the optional badge/icon. The caller manages content based on `selectedId` (headless-tabs pattern below).

## Carbon → chassis API mapping

| Carbon API                                                    | Chassis equivalent                                                   |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `<Tabs selected={number} on:change={e: CustomEvent<number>}>` | `<Tabs {tabs} bind:selectedId={string} onChange={(id) => ...}>`      |
| `<Tab label="X" disabled icon={...} secondaryLabel="Y">`      | Pass `{ id, label, disabled, icon, secondaryLabel }` in `tabs` array |
| `<svelte:fragment slot="content">` per Tab                    | Caller renders content based on `selectedId` (no slot)               |
| `<TabContent>...</TabContent>` companion component            | NOT used by chassis (omitted intentionally)                          |

The `selected` ↔ `selectedId` translation lives at `chassis/forms/Tabs.svelte:40` (`$derived` index lookup) + `chassis/forms/Tabs.svelte:42-48` (`handleChange` callback bridge).

## Headless content pattern

Carbon's `<TabContent>` keeps every panel mounted in the DOM with `hidden` toggling. For Argos panels (maps with WebGL contexts, spectrum canvases, live SSE streams), keeping unmounted ones around wastes RAM and keeps GPU contexts alive. The chassis omits the slot so callers can choose:

- **Mount-on-select** (recommended for heavy panels):

    ```svelte
    {#if selectedId === 'ble'}
    	<BlePanel />
    {:else if selectedId === 'bt'}
    	<BtPanel />
    {/if}
    ```

- **Always-mounted** (for cheap panels where remount cost > memory cost):

    ```svelte
    <div hidden={selectedId !== 'ble'}><BlePanel /></div>
    <div hidden={selectedId !== 'bt'}><BtPanel /></div>
    ```

Choose per surface. DeviceSubTabs uses mount-on-select because each device class panel runs its own subscription.

## Examples

### 1. Basic usage with id-keyed tabs

```svelte
<script lang="ts">
	import Tabs, { type TabDef } from '$lib/components/chassis/forms/Tabs.svelte';
	let selectedId = $state('overview');
	const tabs: TabDef[] = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'details', label: 'Details' },
		{ id: 'logs', label: 'Logs' }
	];
</script>

<Tabs {tabs} bind:selectedId />
{#if selectedId === 'overview'}<OverviewView />{:else if selectedId === 'details'}<DetailsView
	/>{:else}<LogsView />{/if}
```

### 2. With badges (DeviceSubTabs pattern — count badges)

```svelte
<script lang="ts">
	import Tabs, { type TabDef } from '$lib/components/chassis/forms/Tabs.svelte';
	let selectedId = $state('ble');
	let bleCount = $derived(devices.ble.length);
	let btCount = $derived(devices.bt.length);
	const tabs: TabDef[] = $derived([
		{ id: 'ble', label: 'BLE', badge: bleCount },
		{ id: 'bt', label: 'BT Classic', badge: btCount },
		{ id: 'wifi-ap', label: 'Wi-Fi APs', badge: devices.wifiAp.length }
	]);
</script>

<Tabs {tabs} bind:selectedId />
```

### 3. With hasItems warning state

```svelte
<script lang="ts">
	const tabs: TabDef[] = $derived([
		{ id: 'live', label: 'Live', badge: live.length },
		{ id: 'stale', label: 'Stale', badge: stale.length, hasItems: stale.length > 0 }
	]);
</script>

<Tabs {tabs} bind:selectedId />
```

The "stale" tab label paints in `var(--warning)` while inactive (warning prompt to user); switching to it restores the accent underline.

### 4. With disabled tabs

```svelte
<script lang="ts">
	let { hasGsmHardware }: Props = $props();
	const tabs: TabDef[] = $derived([
		{ id: 'wifi', label: 'Wi-Fi' },
		{ id: 'gsm', label: 'GSM', disabled: !hasGsmHardware }
	]);
</script>

<Tabs {tabs} bind:selectedId />
```

Disabled tabs are visually dimmed AND skipped by arrow-key navigation (Carbon's `Tab.svelte:96-106` handler).

### 5. With container variant + secondaryLabel

```svelte
<Tabs
	tabs={[
		{ id: 'sweep', label: 'Sweep', secondaryLabel: 'Wide-band scan' },
		{ id: 'waterfall', label: 'Waterfall', secondaryLabel: 'Time vs freq' }
	]}
	bind:selectedId
	type="container"
	autoWidth
/>
```

Container variant renders a filled tab strip; `secondaryLabel` adds a sub-line beneath each label.

### 6. With TabsSkeleton loading state

```svelte
<script lang="ts">
	import Tabs, { type TabDef } from '$lib/components/chassis/forms/Tabs.svelte';
	import TabsSkeleton from '$lib/components/chassis/forms/TabsSkeleton.svelte';
	let { tabs, isLoading }: { tabs: TabDef[]; isLoading: boolean } = $props();
	let selectedId = $state('');
</script>

{#if isLoading}
	<TabsSkeleton count={3} />
{:else}
	<Tabs {tabs} bind:selectedId />
{/if}
```

Render the skeleton until the tab definitions are known. Match the `count` to the expected tab count to avoid layout shift on hydrate.
