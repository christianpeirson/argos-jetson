# Modal — Code

The `<Modal>` chassis wrapper at `src/lib/components/chassis/forms/Modal.svelte` is a thin Svelte-5-runes adapter over Carbon's Svelte-4 Modal primitive.

## Rationale for the wrapper layer

Carbon ships `carbon-components-svelte@0.107.0`, which is **still Svelte 4 internally** — uses `export let`, `createEventDispatcher`, `$$restProps`. Argos consumer code is Svelte 5 with runes. The wrapper's job:

1. Accept Svelte-5-rune-style typed props via `$props()`.
2. Forward to Carbon's Svelte-4 props/events.
3. Bridge Carbon's `dispatch("close", { trigger })`, `dispatch("submit")`, `dispatch("click:button--secondary", { text })` to Svelte-5 callback props (`onClose`, `onSubmit`, `onClickSecondary`).
4. Apply Lunaris naming conventions (`'sm' | 'md' | 'lg'` density tokens; consumer-friendly callback prop names).

## Public API — Props

| Prop                         | Type                                  | Default                        | Description                                                                 |
| ---------------------------- | ------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `open`                       | `boolean`                             | `false` (`$bindable`)          | Controlled visibility. Two-way bindable.                                    |
| `size`                       | `'sm' \| 'md' \| 'lg'`                | `'md'`                         | Container width. Maps to Carbon `sm \| undefined \| lg`.                    |
| `modalHeading`               | `string \| undefined`                 | undefined                      | Primary dialog title (`<h3>`).                                              |
| `modalLabel`                 | `string \| undefined`                 | undefined                      | Eyebrow above heading (`<h2>`).                                             |
| `modalAriaLabel`             | `string \| undefined`                 | undefined                      | Screen-reader label fallback when no visible heading exists.                |
| `iconDescription`            | `string`                              | `'Close the modal'`            | aria-label for the close-X button.                                          |
| `passiveModal`               | `boolean`                             | `false`                        | Hide footer button row entirely.                                            |
| `danger`                     | `boolean`                             | `false`                        | Render primary button in danger red.                                        |
| `alert`                      | `boolean`                             | `false`                        | Use `role="alertdialog"` for urgent attention.                              |
| `hasForm`                    | `boolean`                             | `false`                        | Apply form-rhythm padding to body.                                          |
| `hasScrollingContent`        | `boolean`                             | `false`                        | Make body keyboard-scrollable (tabindex 0).                                 |
| `primaryButtonText`          | `string`                              | `''`                           | Primary CTA label. Empty string hides primary button.                       |
| `primaryButtonDisabled`      | `boolean`                             | `false`                        | Disable primary button (form-validation gate).                              |
| `secondaryButtonText`        | `string`                              | `''`                           | Single secondary button label (mutually exclusive with `secondaryButtons`). |
| `secondaryButtons`           | `[{text:string},{text:string}] \| []` | `[]`                           | Two-secondary-button overload. Length must be exactly 2 to activate.        |
| `selectorPrimaryFocus`       | `string`                              | `'[data-modal-primary-focus]'` | CSS selector for the element to focus on open.                              |
| `preventCloseOnClickOutside` | `boolean`                             | `false`                        | Suppress outside-click dismissal (force explicit choice).                   |
| `shouldSubmitOnEnter`        | `boolean`                             | `true`                         | Submit form on Enter inside modal.                                          |
| `id`                         | `string \| undefined`                 | undefined                      | Container DOM id.                                                           |
| `class`                      | `string \| undefined`                 | undefined                      | Extra class forwarded to Carbon's outer wrapper.                            |

## Public API — Callback props

Chassis uses Svelte 5 callback props that bridge Carbon's Svelte 4 `createEventDispatcher` events.

| Callback prop      | Carbon source event                             | Argument                                            | Description                                                          |
| ------------------ | ----------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| `onClose`          | `dispatch("close", { trigger })`                | `'escape-key' \| 'outside-click' \| 'close-button'` | Fired on dismissal. Argument identifies dismissal source.            |
| `onSubmit`         | `dispatch("submit")`                            | none                                                | Fired on primary button click OR Enter (when `shouldSubmitOnEnter`). |
| `onClickSecondary` | `dispatch("click:button--secondary", { text })` | `text?: string` (the button label that was clicked) | Fired on either secondary button. Use `text` to disambiguate.        |

## Slots / children

| Slot       | Type                   | Description                                                                                |
| ---------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `children` | `Snippet \| undefined` | Body content rendered inside `bx--modal-content`. Use Svelte 5 snippet `{@render}` syntax. |

## Carbon → chassis API mapping

| Carbon prop / event                  | Chassis prop / callback                              |
| ------------------------------------ | ---------------------------------------------------- |
| `bind:open`                          | `bind:open` (forwarded directly via `$bindable`)     |
| `size: 'xs' \| 'sm' \| 'md' \| 'lg'` | `size: 'sm' \| 'md' \| 'lg'` (no xs; md = undefined) |
| `on:close`                           | `onClose: (trigger) => void`                         |
| `on:submit`                          | `onSubmit: () => void`                               |
| `on:click:button--secondary`         | `onClickSecondary: (text?) => void`                  |
| Default slot                         | `children` snippet                                   |

## Paste-ready snippets

### Basic confirmation modal

```svelte
<script lang="ts">
	import { Modal } from '$lib/components/chassis/forms';

	let open = $state(false);

	function handleSubmit() {
		// perform action
		open = false;
	}
</script>

<button onclick={() => (open = true)}>Delete signal</button>

<Modal
	bind:open
	modalHeading="Delete signal"
	primaryButtonText="Delete"
	secondaryButtonText="Cancel"
	danger
	onSubmit={handleSubmit}
	onClose={() => (open = false)}
>
	<p>This will permanently remove the captured signal. This action cannot be undone.</p>
</Modal>
```

### Modal with form

```svelte
<Modal
	bind:open
	modalHeading="Add target frequency"
	primaryButtonText="Save"
	secondaryButtonText="Cancel"
	hasForm
	onSubmit={save}
	onClose={() => (open = false)}
>
	<form>
		<TextInput labelText="Center frequency (MHz)" data-modal-primary-focus />
		<NumberInput labelText="Bandwidth (kHz)" min={1} max={20000} />
	</form>
</Modal>
```

### Modal with two secondary buttons

```svelte
<Modal
	bind:open
	modalHeading="Unsaved changes"
	primaryButtonText="Save and exit"
	secondaryButtons={[{ text: 'Discard' }, { text: 'Cancel' }]}
	onSubmit={saveAndExit}
	onClickSecondary={(text) => (text === 'Discard' ? exitWithoutSaving() : (open = false))}
/>
```

## What the wrapper does NOT expose

- `ref` to the underlying container — no Argos site needs imperative DOM reach today.
- `light` (Carbon's light-theme variant) — Argos is dark-only per Lunaris spec.
- `selectorsFloatingMenus` — only matters when nesting Carbon menus inside the modal; defer until a consumer needs it.

## File budget

The wrapper is 124 LOC including JSDoc. Above the 80 LOC target because the two-secondary-button branching duplicates the entire `<CarbonModal>` markup as a TypeScript discriminant — refactoring into a shared snippet would obscure the type narrowing and is not worth the complexity.

## Tests

No Vitest tests in PR-A canary — Carbon's own test suite covers the underlying primitive. Argos-side smoke:

1. `npm run build` clean (vite SSR compile catches prop-type mismatch).
2. Chrome-devtools MCP visual diff (visual diff procedure in `style.md`).
3. Manual TAB / ENTER / ESC keyboard trace (`accessibility.md`).
