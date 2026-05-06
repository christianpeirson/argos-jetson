# SkeletonText — Code

The `<SkeletonText>` chassis wrapper at `src/lib/components/chassis/forms/SkeletonText.svelte` is a thin Svelte-5-runes passthrough adapter over Carbon's Svelte-4 SkeletonText primitive.

## Rationale for the wrapper layer

Carbon ships `carbon-components-svelte@0.107.0`, still Svelte 4 internally — uses `export let`, `$$restProps`. Argos consumer code is Svelte 5 with runes. The wrapper:

1. Accepts Svelte-5-rune-style typed props via `$props()`.
2. Forwards all 4 props to Carbon (`lines`, `paragraph`, `heading`, `width`).
3. Forwards `class` to Carbon's outer wrapper (which in `paragraph` mode is a `<div>`, in single-line mode is a `<p>`).
4. Does NOT forward Carbon's DOM event passthroughs (`on:click`, `on:mouseover`, etc.) — SkeletonText is a static loading placeholder; events on it are an anti-pattern (skeletons shouldn't be interactive).

## Public API — `<SkeletonText>` component

| Prop        | Type      | Default     | Description                                                           |
| ----------- | --------- | ----------- | --------------------------------------------------------------------- |
| `lines`     | `number`  | `3`         | Number of lines (only used when `paragraph={true}`)                   |
| `paragraph` | `boolean` | `false`     | Multi-line paragraph variant. `false` = single line                   |
| `heading`   | `boolean` | `false`     | Heading-size variant. Adds `bx--skeleton__heading` class — taller bar |
| `width`     | `string`  | `'100%'`    | Bar width as CSS percent or px (e.g. `'80%'`, `'200px'`)              |
| `class`     | `string`  | `undefined` | Extra class forwarded to Carbon's outer wrapper                       |

**Note on Carbon prop name**: Carbon uses `lines` (not `lineCount`). The umbrella plan's reference to `lineCount` was incorrect — corrected at execution time per source.

## Events

The chassis exposes NO callback props. Carbon SkeletonText forwards `on:click`, `on:mouseover`, `on:mouseenter`, `on:mouseleave` from the outer wrapper, but skeletons are static placeholders — interactive skeletons are a UX anti-pattern (operator clicks something that looks loading-like, gets unexpected behaviour). Phase 8.3 chassis intentionally drops these forwards.

If a future surface needs an interactive skeleton (e.g. clickable "still loading? click to retry" pattern), refactor to use `<InlineLoading>` or `<PanelStatus>` instead.

## Slots

The chassis does NOT expose any slot — Carbon SkeletonText has no slots in its source. It's a self-contained placeholder primitive.

## Carbon → chassis API mapping

| Carbon API                      | Chassis equivalent | Notes                                                                 |
| ------------------------------- | ------------------ | --------------------------------------------------------------------- |
| `lines`                         | `lines`            | Same name — Phase 8.3 corrected from umbrella plan's `lineCount` typo |
| `paragraph`                     | `paragraph`        | Same                                                                  |
| `heading`                       | `heading`          | Same                                                                  |
| `width`                         | `width`            | Same                                                                  |
| `class`                         | `class`            | Same — forwarded via `$$restProps` in Carbon source                   |
| `on:click`, `on:mouseover`, ... | NOT exposed        | Skeleton interactivity is anti-pattern                                |

## Paste-ready snippets

### Default 3-line paragraph (the canary pattern)

```svelte
<script lang="ts">
	import SkeletonText from '$lib/components/chassis/forms/SkeletonText.svelte';
</script>

<div aria-busy="true" aria-label="Loading reports">
	<SkeletonText paragraph lines={3} />
</div>
```

This is the ReportsView canary — exact match.

### Single-line skeleton at fixed width

```svelte
<SkeletonText width="200px" />
```

Useful for placeholder while a single value (status string, identifier) loads.

### Heading skeleton

```svelte
<SkeletonText heading width="60%" />
```

Taller bar (24 px) for placeholding section titles.

### 5-line skeleton at percent width

```svelte
<SkeletonText paragraph lines={5} width="80%" />
```

Useful for placeholding longer text blocks (e.g. report excerpt, log line preview).

## Live canary reference

The Phase 8.3 canary is `src/lib/components/dashboard/views/ReportsView.svelte` — replaces 3 bespoke `<div class="skeleton-row">` divs (the loading-state placeholder for the reports table) with a single `<SkeletonText paragraph lines={3} />`. The bespoke `.skeleton-row` CSS rule + `@keyframes pulse` declaration were deleted as dead code (~12 LOC). Net Phase 8.3 file delta for ReportsView: ~−12 LOC.

## Width-randomization semantics

Carbon's source uses a hardcoded array `RANDOM = [0.973, 0.153, 0.567]` to deterministically vary line widths in paragraph mode. The formula:

```js
const min = widthPx ? widthNum - 75 : 0;
const max = widthPx ? widthNum : 75;
const rand = `${Math.floor(RANDOM[i % 3] * (max - min + 1)) + min}px`;
return widthPx ? rand : `calc(${width} - ${rand})`;
```

For `paragraph lines={3} width="100%"` (the canary):

- Line 0: `calc(100% - ${Math.floor(0.973 * 76)}px)` = `calc(100% - 73px)`
- Line 1: `calc(100% - ${Math.floor(0.153 * 76)}px)` = `calc(100% - 11px)`
- Line 2: `calc(100% - ${Math.floor(0.567 * 76)}px)` = `calc(100% - 43px)`

Result: 3 visually-varied lines (one short, one near-full, one mid) with no `Math.random()` call — SSR-stable. For `lines > 3`, the index wraps modulo 3, so line 3 = line 0's width, etc.

## What the wrapper does NOT expose

- **DOM event forwards** (`on:click`, etc.) — interactive skeletons are anti-pattern (see Events section).
- **Reactive `width` updates** — Carbon's `widthNum` / `widthPx` are `$:` reactive, but Phase 8.3 use cases pass static widths. Reactive width works at the Carbon level if needed.
- **Custom RANDOM seed** — Carbon's hardcoded array is fine for Argos.

## File budget

The wrapper is ~21 LOC (`forms/SkeletonText.svelte`), well within the 80-LOC chassis budget. Smaller than chassis `<Tooltip>` (60 LOC) or `<TooltipIcon>` (38 LOC) because SkeletonText is a pure passthrough — no event bridging, no `$bindable`, no callback props.

## Tests

No Vitest tests in Phase 8.3 — Carbon covers the underlying primitive. Argos-side smoke:

1. `npm run build` clean.
2. ESLint clean on the chassis + canary.
3. Chrome-devtools MCP visual diff via `take_screenshot` of ReportsView in loading state.
4. AT smoke test: `aria-busy` + `aria-label` properly announced on screen-readers (NVDA, VoiceOver, TalkBack).
