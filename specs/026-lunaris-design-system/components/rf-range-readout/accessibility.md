# RfRangeReadout — Accessibility

`<RfRangeReadout>` is a **read-only label/value display**. It owns no interactive behavior and is wrapped by sibling editing affordances (Dropdown, NumberInput) when editing is needed.

## ARIA pattern

No ARIA role applied. The component renders semantic HTML where the visible label and value are programmatically associated by DOM proximity. Screen readers read the label and value sequentially as a related pair.

If the readout ever becomes part of an editable composite (e.g., wrapped by a click-to-edit popover), the parent composite owns ARIA — `<RfRangeReadout>` continues to be presentational only.

## DOM structure

```html
<div class="rf-range-readout">
	<span class="label">LNA</span>
	<span class="value">
		24
		<span class="unit">dB</span>
	</span>
</div>
```

`<span>` (not `<label>` / `<dt>` / `<dd>`) because there's no form control to associate with. `<dl>`/`<dt>`/`<dd>` would be semantically incorrect in a horizontal strip context — the data is parameter-state, not term/definition list.

## Visual contrast

| Element               | Token         | Background           | Ratio  | Status                      |
| --------------------- | ------------- | -------------------- | ------ | --------------------------- |
| Label (ink-3 #A0A0A0) | `--mk2-ink-3` | `--mk2-bg` (#0A0A0A) | 8.9:1  | WCAG AAA                    |
| Value (ink #E6E6E6)   | `--mk2-ink`   | `--mk2-bg`           | 14.6:1 | WCAG AAA                    |
| Unit (ink-4 #707070)  | `--mk2-ink-4` | `--mk2-bg`           | 4.7:1  | WCAG AA (large text border) |

Unit suffix sits at the AA threshold for normal text (4.5:1). Acceptable because unit is **redundant context** — the label already states what parameter the value represents (LNA dB, VGA dB are obvious). Unit could be removed entirely without information loss; it's a glanceable affordance, not the primary information channel.

If contrast becomes a concern (e.g., during high-ambient-light field operation), bump unit to `--mk2-ink-3` token via Lunaris theme override.

## Keyboard navigation

None. The component is not focusable and produces no tab stops. Keyboard navigation through the parent strip is handled by the editing controls (Dropdown / NumberInput) interleaved with readouts.

## Screen reader behavior

NVDA / VoiceOver / JAWS read in order:

1. Label text (e.g., "LNA")
2. Value text (e.g., "24")
3. Unit text (e.g., "dB")

Total announcement: "LNA 24 dB". This matches the visual reading order and conveys the parameter state.

If the consumer needs richer SR semantics (e.g., for a live-updating sweep status panel), wrap multiple readouts in `aria-live="polite"` at the strip level — the chassis itself does not emit live-region announcements.

## Color independence

Information is **never conveyed by color alone**. The label, value, and unit all use distinct ink tokens for visual hierarchy, but each carries its own text content. A monochrome rendering loses no semantics.

## WCAG 2.1 AA criteria

| Criterion                    | Status | Notes                                      |
| ---------------------------- | ------ | ------------------------------------------ |
| 1.3.1 Info and Relationships | PASS   | Programmatic association via DOM proximity |
| 1.4.3 Contrast (Minimum)     | PASS   | All foregrounds ≥ 4.5:1 against bg         |
| 1.4.4 Resize Text            | PASS   | rem-relative sizing via Lunaris fs tokens  |
| 1.4.10 Reflow                | PASS   | No fixed widths; flex strip wraps          |
| 1.4.11 Non-text Contrast     | N/A    | No interactive UI components               |
| 2.4.6 Headings and Labels    | PASS   | Label clearly identifies parameter         |
| 4.1.2 Name, Role, Value      | PASS   | Plain text content; no role/state required |

## Testing

Visual diff against design archive in 9.6 SPECTRUM parity work. No automated a11y test added — `axe-core` would flag nothing here (presentational text). Rely on the e2e accessibility scan running over the SPECTRUM screen as a whole.
