# Separator — Code

The `<Separator>` chassis at `src/lib/components/chassis/forms/Separator.svelte` is a **bespoke Argos design-system primitive** — NOT a Carbon wrapper. Carbon Design System has no Separator primitive; this is the THIRD bespoke chassis in spec-026 after `<PanelStatus>` (Phase 8.4) and `<EditorTabBar>` (Phase 8.6).

## Rationale for a bespoke chassis (not a Carbon wrapper)

Carbon ships no Separator primitive. The visual treatment is trivial (1px line in `var(--border)`), so a 25-LOC bespoke chassis is cheaper than any indirection. WAI-ARIA APG Separator pattern (https://www.w3.org/WAI/ARIA/apg/patterns/separator/) is the canonical a11y wiring; the chassis implements it directly.

## Public API — `<Separator>` component

```typescript
interface Props {
	orientation?: 'horizontal' | 'vertical';
	class?: string;
}
```

| Prop          | Type                         | Default        | Description                                            |
| ------------- | ---------------------------- | -------------- | ------------------------------------------------------ |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Drives `aria-orientation` and the CSS sizing variant   |
| `class`       | `string`                     | `undefined`    | Extra class on the outer `<div>` for one-off overrides |

## Internal wiring

```svelte
<script lang="ts">
	interface Props {
		orientation?: 'horizontal' | 'vertical';
		class?: string;
	}
	let { orientation = 'horizontal', class: extraClass = '' }: Props = $props();
</script>

<div
	role="separator"
	aria-orientation={orientation}
	class="separator separator--{orientation} {extraClass}"
></div>

<style>
	.separator {
		background: var(--border);
		flex-shrink: 0;
	}
	.separator--horizontal {
		height: 1px;
		width: 100%;
	}
	.separator--vertical {
		width: 1px;
		height: 100%;
	}
</style>
```

## Carbon → chassis API mapping

N/A — no Carbon primitive to map from.

## Paste-ready snippets

### Horizontal (default)

```svelte
<Separator />
```

### Vertical (inside a flex parent)

```svelte
<div class="flex h-8 items-center gap-2">
	<span>Left</span>
	<Separator orientation="vertical" />
	<span>Right</span>
</div>
```

### Custom override class

```svelte
<Separator class="my-strong-divider" />

<style>
	:global(.my-strong-divider) {
		background: var(--foreground);
	}
</style>
```

## What the chassis does NOT expose

- Variant prop (e.g. `decorative={true}`) — every separator IS semantic. For purely decorative lines, use a plain `<div>` (do NOT use the chassis).
- Length / thickness props — the chassis is intentionally minimal. For one-off needs use the `class` prop.
- Spacing props — separator margin is the consumer's responsibility (parent flexbox `gap` is the typical pattern).

## File budget

The chassis is ~25 LOC including styles. Architecture rule: ≤ 300 LOC/file, ≤ 50 LOC/function. No functions in the script — entirely declarative.

## Tests

No dedicated unit tests — the chassis has no logic. Verification:

1. `mcp__plugin_svelte_svelte__svelte-autofixer` returns `issues: []`.
2. Manual smoke on `GpConfigView` and `TakConfigView` — separators visible between sections, axe scan clean.
3. `tests/e2e/accessibility.spec.ts` axe sweeps cover the consumer routes (no new test required — separator a11y is one assertion within the existing route scans).
