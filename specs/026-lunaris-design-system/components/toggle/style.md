# Toggle — Style

`<Toggle>` is a Carbon Design System wrapper. Visual treatment is owned by `@carbon/styles/scss/components/toggle/_toggle.scss` overlaid by the Lunaris theme at `src/lib/styles/lunaris-carbon-theme.scss`. The chassis itself adds NO custom CSS beyond Argos's standard token mapping.

## Source-of-truth files

| File                                                              | Role                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/components/chassis/forms/Toggle.svelte`                  | Argos chassis — Svelte 5 wrapper (~70 LOC)                          |
| `node_modules/carbon-components-svelte/src/Toggle/Toggle.svelte`  | Carbon Svelte component (v0.107.0)                                  |
| `node_modules/@carbon/styles/scss/components/toggle/_toggle.scss` | Carbon SCSS source — visual rules                                   |
| `src/lib/styles/lunaris-carbon-theme.scss`                        | Lunaris token overlay (maps Carbon tokens to Lunaris CSS variables) |

## Carbon source URLs (v0.107.0)

- https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Toggle/Toggle.svelte
- https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Toggle/Toggle.svelte.d.ts
- https://github.com/carbon-design-system/carbon/blob/main/packages/styles/scss/components/toggle/_toggle.scss

## Anatomy

```html
<div class="bx--form-item">
	<label class="bx--label">{labelText}</label>
	<button
		type="button"
		class="bx--toggle__button"
		role="switch"
		aria-checked="{toggled}"
		aria-labelledby="{labelId}"
	>
		<span class="bx--toggle__appearance">
			<span class="bx--toggle__switch"></span>
			<span class="bx--toggle__text">{toggled ? labelB : labelA}</span>
		</span>
	</button>
</div>
```

(Carbon owns the DOM — chassis renders a `<Toggle>` and lets Carbon do the work.)

## Sizing + spacing

Carbon's defaults; no chassis overrides:

| Prop value       | Track         | Thumb  | Label gap                     |
| ---------------- | ------------- | ------ | ----------------------------- |
| `size="default"` | `48px × 24px` | `20px` | `8px` between label and track |
| `size="sm"`      | `32px × 16px` | `12px` | `4px`                         |

## Color tokens

| State      | Track                                        | Thumb                                     | Label                     |
| ---------- | -------------------------------------------- | ----------------------------------------- | ------------------------- |
| Off        | `var(--toggle-off, var(--surface-elevated))` | `var(--icon-on-color, var(--background))` | `var(--foreground)`       |
| On         | `var(--primary, #A8B8E0)`                    | `var(--icon-on-color, var(--background))` | `var(--foreground)`       |
| Disabled   | inherits but `opacity: 0.5`                  | inherits                                  | `var(--muted-foreground)` |
| Focus ring | `2px solid var(--ring, var(--primary))`      | n/a                                       | n/a                       |

`var(--primary)` swaps with the active MIL-STD-2525C palette (13 palettes per CLAUDE.md typography rules). The toggle's "on" colour follows automatically.

## Typography

- Label: Geist 12px / 500 (chrome font per CLAUDE.md typography rules — UI text, not data).
- Inline state label (`labelA` / `labelB`): Geist 11px / 400, uppercase via Carbon SCSS.

## Reduced-motion compliance

Carbon's track-thumb transition respects `prefers-reduced-motion: reduce`; the thumb snap is instant when motion-reduction is requested. Chassis adds no animation of its own.

## Visual diff vs pre-migration `bits-ui` Switch

| Aspect             | `bits-ui` Switch (pre-migration)      | Carbon Toggle (chassis)                        |
| ------------------ | ------------------------------------- | ---------------------------------------------- |
| Track size         | 32×18 px (Tailwind `w-8 h-[1.15rem]`) | 48×24 px (Carbon default)                      |
| Label position     | sibling `<label>` to the right        | built-in label above the track                 |
| Focus ring         | 3px outline on track                  | 2px outline on track (Carbon focus discipline) |
| Disabled treatment | `opacity-50`                          | `opacity-50` + `cursor: not-allowed`           |

Visual diff procedure: chrome-devtools MCP `take_screenshot` of `/dashboard/tak` settings before/after. Drift expected (Carbon track is larger + label sits above); accepted as new baseline.

## Lunaris theme alignment

Lunaris-Carbon-theme overlay (`src/lib/styles/lunaris-carbon-theme.scss`) re-binds:

- `$toggle-off` → `var(--surface-elevated)`
- `$interactive` (Carbon's "on" colour) → `var(--primary)`
- `$focus` → `var(--ring)`

So the toggle inherits the active MIL-STD-2525C palette automatically.
