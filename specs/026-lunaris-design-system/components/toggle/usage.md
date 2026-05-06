# Toggle — Usage

`<Toggle>` at `src/lib/components/chassis/forms/Toggle.svelte` is a thin Argos chassis around Carbon Design System's `<Toggle>` primitive. It exposes a binary on/off switch with built-in label, optional A/B labels for the two states, and standard Carbon a11y wiring.

## When to use

Use `<Toggle>` for:

- Binary settings that take immediate effect (enable / disable a feature, on / off a service connection).
- Settings where the on / off labels themselves carry meaning (e.g. "Connect on startup", "Show advanced controls").
- Form fields that previously used `bits-ui` Switch — the chassis is the migration target for Phase 8.7.

## When NOT to use

| Need                                                       | Use instead                                      |
| ---------------------------------------------------------- | ------------------------------------------------ |
| A multi-value choice (3+ options)                          | `<Tabs>` or `<RadioButtonGroup>`                 |
| A binary BUT one value is "the default and rarely changes" | `<Checkbox>` (lighter visual weight)             |
| A button that triggers an action (start / stop)            | A regular `<button>`, not a Toggle               |
| A draggable slider over a range                            | (no Argos primitive yet — out of spec-026 scope) |

## Consumers

| Site                                                        | Status                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| `dashboard/tak/TakServerForm.svelte` ("Connect on startup") | **Migrated** in Phase 8.7 (this spec) — was bits-ui `Switch` |

Adding a consumer requires updating this table.

## States

| State                       | Treatment                                                                        |
| --------------------------- | -------------------------------------------------------------------------------- |
| **Off** (`toggled={false}`) | Carbon's neutral track + thumb at left                                           |
| **On** (`toggled={true}`)   | Carbon's accent track + thumb at right (uses `var(--primary)` via Lunaris theme) |
| **Disabled**                | Reduced opacity + `cursor: not-allowed`; Carbon disables click + keyboard        |
| **Focus-visible**           | Carbon's standard focus ring on the track                                        |

## Common pitfalls

1. **Forgetting `labelText`** — TypeScript marks `labelText` REQUIRED. Carbon needs an accessible name for the toggle; a sibling `<label>` does NOT substitute (Carbon owns its own label DOM). Use `hideLabel` if visually unwanted.
2. **Using `bind:checked` (bits-ui legacy)** — chassis exposes `bind:toggled` (Carbon's name). Migrating from `bits-ui` Switch requires renaming the bound prop.
3. **Wrapping Toggle in a sibling `<label>`** — pre-migration `bits-ui` Switch sites used a sibling label for click targeting. Carbon Toggle's built-in `labelText` already provides label-click semantics; drop the sibling wrapper.
4. **Setting both `labelA`/`labelB` AND `labelText`** — Carbon renders `labelA` (off) / `labelB` (on) inline beside the track when provided. If you set both, expect two visible labels (the heading + the inline state name). For single-label-only UX, set `labelText` and omit `labelA`/`labelB`.
5. **Long `labelText`** — Carbon renders the label above the track. Keep it ≤ 4 words for compact layouts.

## Migration roadmap entry

Phase 8.7 — second-to-last sub-phase of the Phase 8 deferred-cleanup umbrella. Closes the bits-ui drop together with the Select consumer migration and the new Separator chassis.
