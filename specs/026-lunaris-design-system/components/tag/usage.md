# Tag — Usage

**Status:** Phase 9.1 prep
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/data/Tag.svelte`
**Carbon component:** `<Tag>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tag/Tag.svelte>

---

## When to use

A small inline label that classifies, categorizes, or signals state. Argos surfaces use Tags everywhere a short status or category needs visual prominence:

- **Status chips on AGENTS sessions**: ACTIVE, PAUSED, IDLE, DEAD.
- **Source-state chips in OVERVIEW SOURCES**: ATTACHED, HOT, PASSIVE, NOT-INSTALLED.
- **Tool category labels in Workflows**: SDR, NETWORK, CRYPTO, GEO.
- **Filter chips on KISMET / Bluetooth panels**: enabled-filter indicators.
- **Selected-item indicators in DataTable filter bar**: closeable filter Tags.

## When NOT to use

- **A persistent state badge on a button** → use `<Button kind="ghost">` with a number/label, not a Tag.
- **A long descriptive paragraph** → use a Tooltip or inline text. Tags are designed for ≤2-word labels.
- **Form input chips** that user types and removes → use a tagging input pattern (no Argos surface today).
- **A clickable navigation element** → use `<Button>` or `<ClickableTile>`. Tags can be `interactive` but represent classification, not action.

## Carbon vs bespoke distinction

Per Carbon `tag/usage.mdx`:

- **Default `<Tag>`** — static label, non-interactive.
- **`<Tag filter>`** — closeable filter tag with an X icon; emits `close` callback.
- **`<Tag interactive>`** — button-styled tag that fires `click` (rendering as `<button>` instead of `<span>`). Used in faceted-filter UIs.
- **Skeleton** — `<TagSkeleton>` for loading states (rare; deferred).

### `kind` palette

Carbon ships 12 kind values:

| `kind` | Carbon intent | Argos use |
| --- | --- | --- |
| `red` | error / critical | DEAD, ERROR, CRASHED |
| `magenta` | sensitive / restricted | (rarely used; reserved) |
| `purple` | special / promo | (reserved) |
| `blue` | informational / primary | ACTIVE, ATTACHED |
| `cyan` | information / secondary | PASSIVE, IDLE |
| `teal` | success-adjacent | (paired with green for category mix) |
| `green` | success / healthy | HEALTHY, OK |
| `gray` | neutral / default | NOT-INSTALLED, UNKNOWN |
| `cool-gray` | neutral cool | secondary metadata |
| `warm-gray` | neutral warm | (rarely used) |
| `high-contrast` | high-emphasis neutral | HOT (Lunaris repurpose for high-vis) |
| `outline` | bordered transparent | filter-chip mode for KISMET filters |

**Argos status palette mapping** (lockdown):

| Argos status | `kind` | Reasoning |
| --- | --- | --- |
| ACTIVE | `blue` | Live + primary |
| PAUSED | `warm-gray` | Suspended but recoverable |
| IDLE | `cyan` | Available but quiet |
| DEAD | `red` | Crashed / unrecoverable |
| ATTACHED | `blue` | Hardware connected + primary |
| HOT | `high-contrast` | High-vis: hardware in active use |
| PASSIVE | `cyan` | Hardware connected but not transmitting |
| NOT-INSTALLED | `gray` | Hardware/software absent |
| HEALTHY | `green` | OK |
| WARNING | `warm-gray` (paired with amber border via custom CSS) | Soft warn — use `kind="warm-gray"` + Lunaris CSS adds `var(--mk2-amber)` border |
| ERROR | `red` | Hard error |

Locked in `tokens.md`; do not deviate per surface.

### `size` axis

Carbon ships 2 sizes:

- **`size="default"`** — block-size 24 px, default everywhere.
- **`size="sm"`** — block-size 18 px, used inside dense surfaces (DataTable cells, tooltip metadata).

## Argos surface inventory (provisional)

Bespoke `.chip` / `.status-pill` / hand-rolled tag sites that Phase 9.1 retires:

| Surface | File | Current pattern | Variant |
| --- | --- | --- | --- |
| AGENTS status pills | `src/lib/components/dashboard/views/AgentsView.svelte` | bespoke `.status-{kind}` divs | `Tag` |
| OVERVIEW SOURCES state | `src/lib/components/dashboard/panels/SourcesPanel.svelte` | bespoke `.source-state-pill` | `Tag` |
| Workflows category labels | `src/lib/components/dashboard/views/WorkflowsView.svelte` | bespoke `.cat-label` | `Tag` |
| KISMET filter chips | `src/lib/components/dashboard/panels/KismetPanel.svelte` | bespoke `.filter-chip` with X | `Tag filter` |
| GSM IMSI hot-flag | `src/lib/components/dashboard/panels/GsmEvilPanel.svelte` | bespoke `.imsi-hot` red dot + text | `Tag kind="red"` |
| Toast metadata chips | `src/lib/components/chassis/feedback/Toast.svelte` | n/a (does not use chips) | (no migration) |

Total bespoke tag call sites: ~30+ (high-traffic primitive). Migration in batches of 5-8 per sub-phase.

## Anatomy (per Carbon source)

From `_tag.scss`:

1. **`.bx--tag`** — outermost element; either `<span>` (default) or `<button>` (interactive/filter). Inline-block.
2. **Optional leading icon** — `<slot name="icon">`; 16 px square at default size, 12 px at sm.
3. **Label text** — inline text content.
4. **Filter X icon** — 16 px close button rendered when `filter={true}`; clicking fires `close` callback.

## States to handle

- **Default**: per `kind` color scheme.
- **Hover** (interactive/filter only): background brightens.
- **Focus** (interactive/filter only): 2 px outline outside the tag.
- **Disabled** (interactive/filter): muted background + opacity 0.5; pointer-events none.
- **Closing animation** (filter): on close-click, tag is removed by parent. Carbon does not animate; Argos parent may add a `transition: opacity 150ms` on removal.

## Spacing rhythm

Carbon Tags have 8 px inline padding + 4 px block padding by default. Tags-in-a-row use a 4 px gap. In dense rows (DataTable cells), `size="sm"` tags reduce to 6 px / 2 px padding.

## Common pitfalls

- **Using `kind="red"` for non-error states** → red is reserved for DEAD/ERROR/CRASHED only. Misuse breaks the Lunaris status semantics.
- **Mixing `kind` between AGENTS pills and KISMET pills** → user expectation is consistent kind-meaning across surfaces. Lock in `tokens.md`.
- **Long labels** → Tags are designed for ≤2 words / ≤16 chars. Longer labels truncate ugly. Use a Tooltip with the full text and a short Tag label.
- **`<Tag interactive>` inside a clickable parent** → nested click handlers; the tag-click and parent-click both fire. Either stop propagation or use `<Tag>` (non-interactive) with parent handling clicks.
- **`<Tag filter>` close icon overlapping content** → ensure parent flex/grid leaves room. Carbon tag with filter is ~24 px wider than non-filter at the same label.
- **Color-only signaling** → Tag color must be paired with the text label (Lunaris rule: color is never the sole status indicator). Never use a colored dot alone — always pair with text.

## Out of scope for Phase 9.1

- **`<TagSkeleton>`** — loading state for async-loaded tags; no surface needs it.
- **Custom `kind` values beyond Carbon's 12** — Lunaris locks the palette; surfaces must pick from the 12.
- **Drag-to-reorder tags** — not Carbon-shipped; no Argos surface needs.
- **Multi-line tag wrapping inside table cells** — Carbon uses `white-space: nowrap`; long labels truncate with ellipsis. Custom CSS to allow wrap is deferred.

## Authority citations

- Carbon Svelte component: <https://svelte.carbondesignsystem.com/?path=/docs/components-tag--default>
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tag/Tag.svelte>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/tag/_tag.scss`
- Carbon usage mdx: `docs/carbon-website/src/pages/components/Tag/usage.mdx`
- Argos status palette lockdown: `specs/026-lunaris-design-system/tokens.md`
- Argos bespoke surfaces: see "Surface inventory" table above (~30+ call sites)
