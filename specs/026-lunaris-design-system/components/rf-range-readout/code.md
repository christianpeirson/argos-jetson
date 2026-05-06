# RfRangeReadout — Code

The `<RfRangeReadout>` chassis at `src/lib/components/chassis/forms/RfRangeReadout.svelte` is a **bespoke Argos design-system primitive** — NOT a Carbon wrapper.

## Public API

```typescript
interface Props {
	label: string; // REQUIRED — uppercase parameter name (LNA / VGA / START / etc.)
	value: string | number; // REQUIRED — current value, displayed verbatim in mono
	unit?: string; // Optional unit suffix (MHz / kHz / dB / etc.); omitted for OFF / ON / N/A states
	class?: string; // Optional consumer styling hook
}
```

| Prop    | Type               | Default      | Description                                                                            |
| ------- | ------------------ | ------------ | -------------------------------------------------------------------------------------- |
| `label` | `string`           | **REQUIRED** | Parameter name. Component applies `text-transform: uppercase`                          |
| `value` | `string \| number` | **REQUIRED** | Displayed verbatim; consumer formats numerics (e.g., `(hz/1e6).toFixed(3)`)            |
| `unit`  | `string?`          | `undefined`  | Suffix shown after value in dimmer ink-4 token. Omit for non-numeric states like `OFF` |
| `class` | `string?`          | `undefined`  | Pass-through for layout customisation by consumer                                      |

## Implementation discipline

- **No internal state.** Pure presentation. Value formatting is the consumer's responsibility.
- **No event handlers.** Read-only display — clicks/keyboard handled by sibling editing affordance (Dropdown, NumberInput) wrapping this in a popover.
- **No `bind:` props.** Nothing is bidirectional.
- **Strict TS.** `value` accepts `string | number`; rendered via `{value}` (Svelte coerces). No `any`.
- **Snippets.** None — props are sufficient for the entire design surface.

## Rationale for prop-only API (not snippet-based)

Snippets would add flexibility (e.g., custom rich content in value position) but the design surface is unanimous: every consumer in the design archive uses the same `label / mono-value / optional-unit` shape. A snippet API would invite drift. Keep the primitive small and uniform.

If a future requirement needs custom value rendering (e.g., colored status pill mid-value), build a sibling chassis or extend with a `valueSnippet` prop after 3+ sites need it.

## Source-of-truth values

Consumers feeding from `spectrumConfigStore.value` should format units explicitly:

```typescript
// Frequency Hz → MHz with 3-decimal precision
const startMhz = (cfg.startFreq / 1e6).toFixed(3);
<RfRangeReadout label="START" value={startMhz} unit="MHz" />

// Discrete gain values pass through directly
<RfRangeReadout label="LNA" value={cfg.gain.lna} unit="dB" />

// Boolean → string
<RfRangeReadout label="AMP" value={cfg.gain.amp ? 'ON' : 'OFF'} />
```

Don't pass raw `Hz` values and rely on the chassis to format — that couples the chassis to a specific unit assumption.

## Constraints

- Component file is single-file Svelte 5 with `<script lang="ts">`. No external dependencies.
- File must stay ≤ 60 LOC (per architecture limits + chassis discipline). Bespoke primitives at this granularity should be tiny.
- `svelte-autofixer` must report `issues: []` before merge.

## Testing

No dedicated test file. The component has zero behavior — verify by visual diff against the design archive in 9.6 SPECTRUM parity work.

## Migration phasing (for 9.6 SPECTRUM parity)

`SpectrumControls.svelte` currently renders editable input controls (Dropdown / NumberInput). The 9.6 layout will:

1. Add a horizontal `<RfRangeReadout>` strip showing the **current** sweep parameters at-a-glance.
2. Move the editable input form to a collapsible `<details>` or popover triggered from the readout strip.
3. Keep behavior identical; only visual chrome changes.

This is composition (readout strip + popover edit), not replacement of the existing input handling.
