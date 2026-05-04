# Separator — Usage

`<Separator>` at `src/lib/components/chassis/forms/Separator.svelte` is a tiny bespoke Argos chassis primitive (~25 LOC) — Carbon Design System ships no Separator primitive. It renders a non-interactive horizontal or vertical divider with WAI-ARIA `role="separator"` semantics.

## When to use

Use `<Separator>` for:

- Visual breaks between sections of a form (e.g. between `TakServerForm` and `TakAuthMethodPicker`).
- Visual breaks between cards or grouped content.
- Migration target for `bits-ui` Separator consumers in Phase 8.7.

## When NOT to use

| Need | Use instead |
|---|---|
| Interactive resize handle | The hand-rolled pattern at `dashboard/PanelContainer.svelte:112` (with `tabindex` + `aria-valuenow`) — separators meant to be dragged are a different APG pattern |
| Visual grouping where margin/padding suffices | Just use spacing — don't add a separator if the layout already implies separation |
| Decoration-only line | A plain `<hr>` or styled `<div>` — `Separator` adds an a11y role for screen-reader users navigating section structure |
| Border between items in a list | Use `border-bottom` on the list items — separators are for sibling-block dividers, not table-row borders |

## Consumers

| Site | Status |
|---|---|
| `dashboard/globalprotect/GpConfigView.svelte` (2 instances) | **Migrated** in Phase 8.7 (this spec) |
| `dashboard/tak/TakConfigView.svelte` (6 instances) | **Migrated** in Phase 8.7 (this spec) |

Adding a consumer requires updating this table.

## States

Separator has only one state — rendered. No empty/loading/error variants (it's a passive visual primitive).

| Prop | Effect |
|---|---|
| `orientation="horizontal"` (default) | 1px tall, full width |
| `orientation="vertical"` | 1px wide, full height (consumer must constrain height via flex-parent) |

## Common pitfalls

1. **Setting `orientation="vertical"` without a height-constrained parent** — vertical separators only render visibly inside a flex container with non-zero height. Wrap in a flex parent if needed.
2. **Stacking multiple separators in a row** — visually noisy. If your section break needs more weight, increase the gap above/below instead of doubling separators.
3. **Replacing all `<hr>` tags** — `Separator` is for SEMANTIC section breaks (the AT user benefits from "separator" landmark navigation). For purely decorative lines (e.g. inside a card chrome), a plain `<div>` is fine.
4. **Forgetting `class` overrides** — for one-off colour or thickness, pass `class="my-extra-class"` and target `.my-extra-class.separator` in the consumer's scoped CSS. The chassis intentionally exposes minimal styling props.

## Migration roadmap entry

Phase 8.7 — replaces `bits-ui` Separator across `GpConfigView.svelte` and `TakConfigView.svelte`. Closes the bits-ui drop together with the Toggle and Select consumer migrations.
