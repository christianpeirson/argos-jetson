# ProgressBar — Style

**Status:** Phase 9.1 — implementation prep
**Last updated:** 2026-05-04
**Authority precedence:** Carbon source SCSS > Carbon site mdx > Lunaris CSS overlay
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ProgressBar/ProgressBar.svelte>

---

## Canonical anatomy citations

From `docs/carbon-design-system/packages/styles/scss/components/progress-bar/_progress-bar.scss`:

```scss
.#{$prefix}--progress-bar__track {
	position: relative;
	inline-size: 100%;
	background-color: $layer-accent;
	overflow: hidden;
}

.#{$prefix}--progress-bar--big .#{$prefix}--progress-bar__track {
	block-size: $spacing-03; // 8px
}

.#{$prefix}--progress-bar--small .#{$prefix}--progress-bar__track {
	block-size: convert.to-rem(4px);
}

.#{$prefix}--progress-bar__bar {
	block-size: 100%;
	background-color: $interactive;
	transition: inline-size 0.3s ease-out;
}

.#{$prefix}--progress-bar--success .#{$prefix}--progress-bar__bar {
	background-color: $support-success;
}

.#{$prefix}--progress-bar--error .#{$prefix}--progress-bar__bar {
	background-color: $support-error;
}

.#{$prefix}--progress-bar--indeterminate .#{$prefix}--progress-bar__bar {
	animation: 1400ms cubic-bezier(0.5, 0, 0.5, 1) infinite progress-bar-indeterminate;
}
```

Key shape:

- **Track is full-width** at the inline size of its container.
- **Bar height: 8 px (`md`/`big`) or 4 px (`sm`)**.
- **Bar fill transitions inline-size over 300 ms ease-out** — natural movement on `value` change.
- **Status colors**: active=`$interactive`, success=`$support-success`, error=`$support-error`.
- **Indeterminate animation**: 1.4 s cubic-bezier sweep loop.
- **No border-radius on track or bar** — square caps; matches Carbon's geometric aesthetic.

---

## Lunaris token map

| Carbon token | Lunaris value | Notes |
| --- | --- | --- |
| `$layer-accent` (track bg) | `var(--bg-2)` | One shade above `--background`; visible empty bar |
| `$interactive` (active bar) | `var(--accent)` | Steel blue — brand-primary fill |
| `$support-success` (finished bar) | `var(--mk2-green-fg)` (#8BBFA0) | Lunaris success palette |
| `$support-error` (error bar) | `var(--mk2-red)` (#FF5C33) | Lunaris error palette |
| `$text-primary` (label) | `var(--ink)` | Bright label |
| `$text-secondary` (helper text) | `var(--ink-2)` | Muted helper / caption |
| `label-01` type-style (label) | `var(--mk2-fs-3) / 1.4 var(--mk2-f-mono)` UPPERCASE | Geist Mono for tactical surfaces |
| `helper-text-01` type-style | `var(--mk2-fs-2) / 1.4 var(--mk2-f-mono)` | Geist Mono small caption |

Indeterminate animation respects `prefers-reduced-motion`: the sweep is disabled and the bar shows a static 30% fill at center per Carbon's stock SCSS rule.

---

## Sizing

Carbon ships 2 sizes via `size` prop and 3 layouts via `kind` prop:

| `size` | Track height | Bar height | Argos use |
| --- | --- | --- | --- |
| `sm` | 4 px | 4 px | Mission Control stat-tile bars (default) |
| `md` | 8 px | 8 px | Forms / mission-critical progress |

| `kind` | Label position | Helper text position | Bar position | Argos use |
| --- | --- | --- | --- | --- |
| `inline` | Same line as bar (left) | n/a | Right of label, fills remaining inline space | (none yet — no Argos surface) |
| `indented` | Above bar | Below bar | Below label, full inline-size | Future: report progress, file upload |
| `big` | Above bar (with caption) | Below bar | Below label, full inline-size, taller | (none — too prominent for current surfaces) |

Mission Control stat-tile bars use `kind="indented"` `size="sm"` — small bar, no inline label (label is above in the tile body).

---

## Track and bar geometry

```text
inline-size: 100% (track)
block-size: 4 px (sm) | 8 px (md)
border-radius: 0 (square caps)
overflow: hidden (clips bar to track)
```

Bar fill % calculation: `(value / max) * 100%`. Carbon clamps `value` to `[0, max]` internally.

---

## Indeterminate animation details

```css
@keyframes progress-bar-indeterminate {
	0% {
		inline-size: 0;
		transform: translateX(0);
	}
	50% {
		inline-size: 30%;
		transform: translateX(150%);
	}
	100% {
		inline-size: 0;
		transform: translateX(400%);
	}
}
```

1.4 s cubic-bezier sweep. Lunaris keeps unchanged.

---

## What Argos does NOT inherit from Carbon

- **Light theme** — Argos is dark-mode only.
- **Custom bar colors** — locked to active/finished/error.
- **Animated value transitions** beyond Carbon's default 300 ms ease-out.

---

## State matrix

| State | Track bg | Bar bg | Bar inline-size | Status icon |
| --- | --- | --- | --- | --- |
| Active 0% | `var(--bg-2)` | `var(--accent)` | 0 | none |
| Active 50% | `var(--bg-2)` | `var(--accent)` | 50% | none |
| Active 100% | `var(--bg-2)` | `var(--accent)` | 100% | none (caller flips to `finished`) |
| Finished | `var(--bg-2)` | `var(--mk2-green-fg)` | 100% | `<CheckmarkFilled>` 16 px in label color |
| Error 25% | `var(--bg-2)` | `var(--mk2-red)` | 25% | `<ErrorFilled>` 16 px in `var(--mk2-red)` |
| Indeterminate | `var(--bg-2)` | `var(--accent)` | 30% (animated sweep) | none |
| reduced-motion indeterminate | `var(--bg-2)` | `var(--accent)` | 30% (static, centered) | none |

---

## Authority citations

- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/progress-bar/_progress-bar.scss`
- Carbon site mdx: `docs/carbon-website/src/pages/components/ProgressBar/{usage,style,code,accessibility}.mdx`
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ProgressBar/ProgressBar.svelte>
- Lunaris CSS custom properties: `src/app.css` (`:root` block)
- Theme overlay: `src/lib/styles/lunaris-carbon-theme.scss`
