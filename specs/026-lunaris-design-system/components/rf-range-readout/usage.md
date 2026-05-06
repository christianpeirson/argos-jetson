# RfRangeReadout — Usage

**Status:** Phase 9.2 — chassis primitive only (consumer wiring in 9.6 SPECTRUM parity)
**Last updated:** 2026-05-05
**Implementation file:** `src/lib/components/chassis/forms/RfRangeReadout.svelte`
**Predecessor:** none — net-new bespoke primitive

---

## When to use

`<RfRangeReadout>` renders a **compact read-only RF parameter** as a label-over-mono-value pair with optional unit suffix. Use when:

- Showing the current value of an RF sweep parameter (LNA / VGA / AMP / START / STOP / RBW) inline with sibling controls in a horizontal status strip.
- The value is **driven by an upstream input** (Dropdown, NumberInput, etc.) and just needs to be displayed compactly.
- The display is **single-line, glanceable**, not a full editing surface.

This is the readout half of the SPECTRUM screen's `[CTL-01] SWEEP CONTROL` panel. The interactive editing affordance lives in sibling components — `RfRangeReadout` does not own input handling.

## When NOT to use

| Pattern                                              | Why not                                                              | Right primitive                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Editable RF gain (LNA/VGA discrete steps)            | Editing belongs in interactive input affordance                      | `<Dropdown>` (chassis) — already correct in `SpectrumControls.svelte` |
| Editable frequency input (start / stop MHz)          | Numeric typing affordance                                            | `<NumberInput>` (chassis)                                             |
| Continuous-range slider for RF parameter             | HackRF gain is discrete; sliders are anti-pattern for stepped values | `<Dropdown>` for discrete; `<NumberInput>` for free-form              |
| KV detail row inside a vertical inspector panel      | Wrong shape — tall rows with longer labels                           | `<StructuredList>` (chassis 9.1)                                      |
| Full-tile state displays (LOADING / ERROR / NO DATA) | Wrong shape — multi-line padded tile                                 | `<PanelStatus>` (chassis 8.4)                                         |

## Argos surface inventory (Phase 9.2 — chassis only, no migrations yet)

| Site                                                                                          | Phase | Status                                                                                  |
| --------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| `src/lib/components/screens/parts/SpectrumControls.svelte` (CTL-01 sweep panel readout strip) | 9.6   | Deferred — SPECTRUM parity audit will wire 6 readouts (LNA, VGA, AMP, START, STOP, RBW) |
| `src/lib/components/screens/parts/Spectrum.svelte` (panel meta line frequency range)          | 9.6   | Candidate                                                                               |

The chassis ships in 9.2; consumer migrations land in 9.6 alongside the `MODE` ContentSwitcher (PEAK/AVG/LIVE) and full SPECTRUM screen parity work.

## Paste-ready snippets

```svelte
<script lang="ts">
	import RfRangeReadout from '$lib/components/chassis/forms/RfRangeReadout.svelte';
	import { spectrumConfigStore } from '$lib/state/spectrum.svelte';
</script>

<div class="readout-strip">
	<RfRangeReadout
		label="START"
		value={(spectrumConfigStore.value.startFreq / 1e6).toFixed(3)}
		unit="MHz"
	/>
	<RfRangeReadout
		label="STOP"
		value={(spectrumConfigStore.value.endFreq / 1e6).toFixed(3)}
		unit="MHz"
	/>
	<RfRangeReadout label="RBW" value="8.0" unit="kHz" />
	<RfRangeReadout label="LNA" value="24" unit="dB" />
	<RfRangeReadout label="VGA" value="16" unit="dB" />
	<RfRangeReadout label="AMP" value="OFF" />
</div>

<style>
	.readout-strip {
		display: flex;
		gap: 18px;
		align-items: center;
	}
</style>
```

## Composition with sibling controls (planned for 9.6)

The expected SPECTRUM CTL-01 panel layout:

```text
[SWEEP] [HOLD] [CAPTURE] | START STOP RBW LNA VGA AMP | MODE [PEAK|AVG|LIVE]
   ^                          ^                              ^
   chassis Button             6× RfRangeReadout              chassis ContentSwitcher
```

Editing happens in a popover or modal triggered by clicking a readout — composition pattern, not baked into `RfRangeReadout` itself. A future `RfReadoutPopover` chassis may layer on top once 3+ surfaces need it (per design-system "rule of three").

## Dependencies

- None — pure visual primitive.
- Lunaris tokens only: `--mk2-f-mono`, `--mk2-fs-1`, `--mk2-fs-2`, `--mk2-ink`, `--mk2-ink-3`, `--mk2-ink-4`.
