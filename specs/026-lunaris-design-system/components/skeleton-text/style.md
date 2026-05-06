# SkeletonText — Style

This document maps Carbon SkeletonText's visual treatment to Lunaris tokens. Per spec-026 authority precedence (`authorities.md`), **Carbon source SCSS wins** when source disagrees with site docs.

## Carbon source-of-truth files

| File                                                                         | Purpose                                                                                                                     |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `node_modules/carbon-components-svelte/src/SkeletonText/SkeletonText.svelte` | Component template (50 LOC) — class authority (`bx--skeleton__text`, `bx--skeleton__heading`) and width-randomization logic |
| `node_modules/@carbon/styles/scss/components/skeleton/_skeleton.scss`        | SCSS rules + token consumption — pulse animation timing, bar height/spacing, color tokens                                   |

Upstream source mirrored at https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/SkeletonText/SkeletonText.svelte.

## Anatomy

### Paragraph mode (`paragraph={true}`)

```html
<div {...$$restProps} on:click on:mouseover on:mouseenter on:mouseleave>
	<p class="bx--skeleton__text" style:width="rand1px"></p>
	<p class="bx--skeleton__text" style:width="rand2px"></p>
	<p class="bx--skeleton__text" style:width="rand3px"></p>
</div>
```

Where `rand1/rand2/rand3` come from Carbon's deterministic `RANDOM = [0.973, 0.153, 0.567]` array (no `Math.random()` — SSR-safe).

### Single-line mode (`paragraph={false}`)

```html
<p
	class="bx--skeleton__text"
	style:width="100%"
	{...$$restProps}
	on:click
	on:mouseover
	on:mouseenter
	on:mouseleave
></p>
```

### Heading variant (`heading={true}`)

Adds `bx--skeleton__heading` modifier class — taller bar via SCSS.

The Lunaris wrapper introduces no extra DOM — it forwards directly into `CarbonSkeletonText` (`src/lib/components/chassis/forms/SkeletonText.svelte:21`).

## Token mapping (Carbon → Lunaris)

These overrides live (or will live) in `src/lib/styles/lunaris-carbon-theme.scss`. **Token additions are DEFERRED** until visual diff exposes drift — matches Phase 4 PR-A discipline.

| Carbon token           | Lunaris value | Used by                            | Citation                                                 |
| ---------------------- | ------------- | ---------------------------------- | -------------------------------------------------------- |
| `$skeleton-background` | `var(--bg-2)` | Skeleton bar fill base color       | `_skeleton.scss` `.bx--skeleton__text`                   |
| `$skeleton-element`    | `var(--bg-3)` | Skeleton bar pulse-highlight color | `_skeleton.scss` `.bx--skeleton__text::after` (animated) |
| (timing) `1000ms`      | unchanged     | Pulse animation duration           | hardcoded in Carbon SCSS                                 |

## Animation timing

Carbon's pulse animation:

```scss
@keyframes skeleton {
	0% {
		opacity: 0.3;
	}
	50% {
		opacity: 1;
	}
	100% {
		opacity: 0.3;
	}
}

.bx--skeleton__text {
	animation: skeleton 1000ms ease-in-out infinite;
}
```

Argos's previous bespoke `.skeleton-row` rule used `pulse 1.6s ease-in-out infinite` with opacity 0.4 → 0.8 → 0.4. Carbon's faster (1000 ms) and higher-contrast (0.3 → 1 → 0.3) animation reads more clearly as "loading" — accept Carbon's timing as the new baseline.

**Reduced-motion**: Carbon SCSS includes `@media (prefers-reduced-motion: reduce) { animation: none; }` (Carbon a11y SCSS shipped 2023). Static placeholder bars when reduced-motion is on. See `accessibility.md` SC 2.3.3.

## Sizing

| Variant                                               | Bar height           | Source                                              |
| ----------------------------------------------------- | -------------------- | --------------------------------------------------- |
| Default text (`paragraph={false}`, `heading={false}`) | 14 px                | `_skeleton.scss` `.bx--skeleton__text` `height`     |
| Heading (`heading={true}`)                            | 24 px                | `_skeleton.scss` `.bx--skeleton__heading` `height`  |
| Paragraph (`paragraph={true}`) line                   | 14 px each, gap 8 px | inherited from `.bx--skeleton__text` + `<p>` margin |

**Argos comparison**: previous bespoke `.skeleton-row` was `28 px` tall (table-row sized). Carbon's 14 px text-shaped bars are SHORTER but more semantically accurate ("this is text loading" vs "this is a row loading"). Visual diff will catch any consumer that relies on the 28 px height.

## Width semantics

`width` prop accepts:

- **Percentage** (`'100%'` default, `'80%'`, `'60%'`): bar takes that fraction of parent width. For `paragraph` mode, each line randomized within `calc(width - rand_px)`.
- **Pixels** (`'200px'`, `'400px'`): fixed-width bar. For `paragraph` mode, lines clamped to `[width-75px, width]` range.
- **Other CSS units** (em, vw, etc.): not parsed by Carbon's `width.includes('px')` check — falls through to "%" path. Probably works but untested per Carbon source comments.

Default is `'100%'` (full container width) — works for both modes.

## Variant scope (Phase 8.3)

This chassis wraps Carbon's `<SkeletonText>`. For block / image placeholders (e.g. chart-shaped skeletons, image-shaped skeletons), Carbon ships `<SkeletonPlaceholder>` — chassis wrapper deferred until first Argos consumer.

## Visual diff procedure (Phase 8.3)

1. Pre-merge: chrome-devtools MCP `take_screenshot` of `ReportsView` in loading state showing the existing `.skeleton-row` 3-bar placeholder.
2. Apply Phase 8.3 chassis migration.
3. Post-merge: same screenshot showing the new `<SkeletonText paragraph lines={3}>` rendering.
4. Compare: drift expected — Carbon's 14 px bars are shorter than Argos's 28 px, and the pulse animation is faster (1000 ms vs 1600 ms). If the drift is acceptable (more semantically text-shaped, faster perceived feedback), accept as the new baseline. If not, extend `lunaris-carbon-theme.scss` with `--cds-skeleton-*` overrides scoped to Argos surfaces.
