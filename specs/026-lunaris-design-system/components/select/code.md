# Select — Code

The `<Select>` chassis wrapper at `src/lib/components/chassis/forms/Select.svelte` is a thin Svelte-5-runes adapter over Carbon's Svelte-4 Select primitive.

## Rationale for the wrapper layer

Carbon ships `carbon-components-svelte@0.107.0`, which is **still Svelte 4 internally** — uses `export let`, `createEventDispatcher`, `$$restProps`. Argos consumer code is Svelte 5 with runes. The wrapper's job:

1. Accept Svelte-5-rune-style typed props via `$props()`.
2. Forward to Carbon's Svelte-4 props/events.
3. Bridge Carbon's `dispatch("update", value)` to a Svelte-5 callback prop `onChange?(value)`.
4. Apply Lunaris naming conventions (`value` not `selected`, `'sm' | 'md' | 'lg'` not `'sm' | 'xl'`).

## Public API

```ts
interface Props {
	/** Selected option value. Two-way bindable. */
	value?: string | number;
	/** Visible label above the select. Required. */
	labelText: string;
	/** Helper text below the field. */
	helperText?: string;
	/** Mark field invalid; renders red border + icon. */
	invalid?: boolean;
	/** Error text shown when invalid is true. */
	invalidText?: string;
	/** Mark field as warn; renders amber border + icon. */
	warn?: boolean;
	/** Warning text shown when warn is true. */
	warnText?: string;
	/** Disable the field. */
	disabled?: boolean;
	/** Mark field as required (browser validation gate). */
	required?: boolean;
	/** Visually hide the label (a11y label still announced). */
	hideLabel?: boolean;
	/** Don't render any label at all (a11y hazard — supply aria-label externally). */
	noLabel?: boolean;
	/** Inline label/input layout instead of stacked. */
	inline?: boolean;
	/** Argos-density size token. Maps to Carbon sm/undefined/xl. */
	size?: 'sm' | 'md' | 'lg';
	/** Form name attribute. */
	name?: string;
	/** Element id. Auto-generated if omitted. */
	id?: string;
	/** Extra class name forwarded to Carbon's outer div. */
	class?: string;
	/** Callback fired on selection change. Mirrors NumberInput.onChange pattern. */
	onChange?: (value: string | number | undefined) => void;
	/** SelectItem children — pass <SelectItem> elements imported from carbon-components-svelte. */
	children?: import('svelte').Snippet;
}
```

## Internal forwarding pattern

```svelte
<CarbonSelect
	selected={value}
	on:update={(e) => {
		value = e.detail;
		onChange?.(e.detail);
	}}
	...
>
	{@render children?.()}
</CarbonSelect>
```

**Why controlled-with-callback (not `bind:selected={value}`)** — Svelte 5's `$bindable()` chain through a Svelte-4 `bind:` is an interop edge case; mid-2025 there were silent-drop reports when the inner component renames the prop. The controlled-with-callback shape is the more robust pattern that 4 of the 11 Argos consumer sites already use natively. Cost: one extra reactive update per change. Worth the safety.

## Slot/children contract

The wrapper exposes the Carbon Select slot via the `children` snippet rune. Consumers pass `<SelectItem>` (or `<SelectItemGroup>`) children imported directly from `carbon-components-svelte`:

```svelte
<Select labelText="Severity" bind:value={severity}>
	<SelectItem value="" text="Any" />
	<SelectItem value="critical" text="Critical" />
	<SelectItem value="warning" text="Warning" />
</Select>
```

Carbon's `<SelectItem>` uses `getContext("carbon:Select")` to coordinate with its parent — the wrapper doesn't break that chain because rendered children sit inside `<CarbonSelect>` markup.

## What the wrapper does NOT expose

- `ref` (Carbon's `bind:ref` to the underlying `<select>`) — no Argos site needs imperative DOM reach today; add when first needed.
- `light` (Carbon's light-theme variant) — Argos is dark-only per Lunaris spec.
- Direct `on:focus`, `on:blur`, `on:click` event forwarding — add when first needed; consumers can `class="..."` and `id="..."` to wire CSS state instead.

## File budget

The wrapper is target ≤80 LOC including JSDoc (NumberInput is 102 LOC and includes more props because numeric formatting needs `formatOptions`/`stepStartValue` which Select doesn't have).

## Tests

No Vitest tests in PR-A — Carbon's own test suite covers the underlying primitive. The Argos-side smoke is:

1. `npm run build` clean (vite SSR compile catches any prop-type mismatch).
2. Chrome-devtools MCP visual diff (PR-A spec.md visual diff procedure).
3. Manual TAB/ENTER/ESC keyboard trace (a11y — see `accessibility.md`).

When a failing migration in tier-2 (PR-B) reveals a unit-test gap, add a Vitest spec then.
