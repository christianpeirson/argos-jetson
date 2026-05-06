# RfRangeReadout — Style

`<RfRangeReadout>` is a **bespoke Argos chassis primitive** — Carbon Design System ships no equivalent. Carbon's `<Definition>` component is closest in spirit (term/value pair) but is styled for prose contexts and lacks the mono-value compact-tactical look of pro SDR consoles.

## Rationale for a bespoke chassis

| Carbon candidate           | Why wrong                                                       |
| -------------------------- | --------------------------------------------------------------- |
| `<Definition>`             | Prose-styled (sans, larger spacing); not a compact data readout |
| `<Tag>`                    | Designed for status chips, not numeric parameter display        |
| `<StructuredList>` row     | Tall multi-row layout; wrong for horizontal strip               |
| `<NumberInput>` (readonly) | Editable affordance; visual chrome wrong for read-only display  |

Pro SDR consoles (SDR# / SDR++ / GQRX / Spektrum) use a tight label-over-mono-value strip with optional small unit suffix. That's a 5-line CSS block, not worth a Carbon wrapper.

## Visual structure

```text
┌─────────────┐
│ LNA         │  ← label   (uppercase, fs-1, ink-3, letter-spacing 0.1em)
│ 24  dB      │  ← value   (mono, fs-2, ink) + unit (mono, fs-1, ink-4, ml-5)
└─────────────┘
```

Vertical stack, `gap: 3px`. Horizontal strip composition is consumer's responsibility (parent flex container).

## Lunaris tokens used

| Token                   | Role                                 |
| ----------------------- | ------------------------------------ |
| `--mk2-f-mono`          | Value + unit font family (Fira Code) |
| `--mk2-fs-1` (9px)      | Label, unit suffix                   |
| `--mk2-fs-2` (10px)     | Value                                |
| `--mk2-ink` (#E6E6E6)   | Value color                          |
| `--mk2-ink-3` (#A0A0A0) | Label color                          |
| `--mk2-ink-4` (#707070) | Unit color (dimmer than value)       |

Per Lunaris discipline: label `text-transform: uppercase`, `letter-spacing: 0.1em`. Value `letter-spacing: 0.02em`. Dark mode only — no light variant.

## Design archive citation

Mirrors the read-only `RangeField` component from `docs/UI/Argos (1).zip` source:

```jsx
const RangeField = ({ label, val, u }) => (
	<div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
		<div className="label">{label}</div>
		<div
			className="mono"
			style={{ fontSize: 13, color: 'var(--ink)', letterSpacing: '0.02em' }}
		>
			{val}
			{u && <span style={{ color: 'var(--ink-4)', marginLeft: 5, fontSize: 10 }}>{u}</span>}
		</div>
	</div>
);
```

Argos chassis maps:

- `label` className → `.label` style with Lunaris tokens (uppercase, fs-1, ink-3)
- `.mono` className → `font-family: var(--mk2-f-mono)`, `font-size: var(--mk2-fs-2)`, `color: var(--mk2-ink)`
- Unit `<span>` → `font-size: var(--mk2-fs-1)`, `color: var(--mk2-ink-4)`, `margin-left: 5px`

## CSS contract

The component owns its `.label` / `.value` / `.unit` selectors. Consumers do not style these directly. To compose a horizontal strip, wrap multiple readouts in a flex container.

## Theming

Dark mode only. No prop overrides for color — all visual variation is driven by Lunaris tokens at the `:root` level.

## Sizing

Single fixed size. The readout is intrinsically small (label fs-1, value fs-2). No `size="sm" | "md" | "lg"` prop — the primitive is the same shape everywhere it appears in the design.

If a future surface needs a larger readout (e.g., for hero KPIs), build a sibling chassis `RfHeroReadout` rather than expanding this one.
