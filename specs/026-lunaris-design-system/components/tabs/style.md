# Tabs — Style

This document maps Carbon Tabs' visual treatment to Lunaris tokens. Per spec-026 authority precedence (`authorities.md`), **Carbon source SCSS wins** when source disagrees with site docs; the citations below all point to source files.

## Carbon source-of-truth files

| File                                                                 | Purpose                                                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `node_modules/carbon-components-svelte/src/Tabs/Tabs.svelte`         | Container component — manages `selected` prop + emits `on:change`; renders `<div role="navigation"><ul role="tablist">`         |
| `node_modules/carbon-components-svelte/src/Tabs/Tab.svelte`          | Per-tab `<li role="presentation"><a role="tab">` element + keyboard handler (Tab.svelte:96-106 = arrow-key skip-disabled logic) |
| `node_modules/carbon-components-svelte/src/Tabs/TabContent.svelte`   | Optional `<div role="tabpanel" hidden={!selected}>` (chassis omits — see `code.md`)                                             |
| `node_modules/carbon-components-svelte/src/Tabs/TabsSkeleton.svelte` | Loading-state placeholder; passthrough by chassis `TabsSkeleton.svelte`                                                         |
| `node_modules/@carbon/styles/scss/components/tabs/_tabs.scss`        | SCSS rules + token consumption (`bx--tabs`, `bx--tabs__nav-item`, `bx--tabs__nav-link`, container variants)                     |

Carbon source URLs (v0.107.0):

- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tabs/Tabs.svelte>
- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tabs/Tab.svelte>
- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tabs/TabContent.svelte>
- <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Tabs/TabsSkeleton.svelte>

## Anatomy

Carbon's Tabs renders this structure (from `Tabs.svelte` + `Tab.svelte`):

```
<div role="navigation" class="bx--tabs [bx--tabs--container] [bx--tabs__nav--auto-width]">
  <ul role="tablist" class="bx--tabs__nav">
    <li role="presentation" class="bx--tabs__nav-item [bx--tabs__nav-item--selected] [bx--tabs__nav-item--disabled] [lunaris-has-items]">
      <a role="tab" class="bx--tabs__nav-link" href="#" tabindex="0|-1" aria-selected="true|false" aria-disabled="true|false">
        {label}  <!-- or chassis badge slot: <span class="lunaris-tab-with-badge"><span>{label}</span><span class="lunaris-tab-badge">{n}</span></span> -->
      </a>
    </li>
    <!-- ... more <li> per Tab -->
  </ul>
</div>
```

The Lunaris wrapper introduces no extra DOM at the container level; the badge wraps the label inside the `<a role="tab">` (see `Tabs.svelte:69-75`).

## Token mapping (Carbon → Lunaris)

These overrides live (or will live) in `src/lib/styles/lunaris-carbon-theme.scss`. **Token additions are deferred** to whichever PR's chrome-devtools visual diff first exposes drift; do not edit the theme file unless the diff fails.

| Carbon token        | Lunaris value             | Used by                                                        | Citation                                            |
| ------------------- | ------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `$layer-01`         | `var(--card)`             | `bx--tabs--container` background fill (container var)          | `@carbon/styles/scss/components/tabs/_tabs.scss`    |
| `$layer-selected`   | `var(--bg-2)`             | selected tab background in container variant                   | `_tabs.scss` `.bx--tabs__nav-item--selected`        |
| `$text-primary`     | `var(--ink)`              | selected tab label text                                        | shared with all form fields                         |
| `$text-secondary`   | `var(--ink-3)`            | inactive tab label text                                        | `_tabs.scss` `.bx--tabs__nav-link`                  |
| `$border-strong-01` | `var(--line-2)`           | underline beneath inactive tabs (default variant)              | `_tabs.scss` `.bx--tabs__nav-item::after`           |
| `$interactive`      | `var(--accent)`           | underline beneath selected tab + hover state                   | `_tabs.scss` `.bx--tabs__nav-item--selected::after` |
| `$focus`            | `var(--accent)`           | 2 px focus outline on `.bx--tabs__nav-link:focus`              | shared with all interactives                        |
| `$support-warning`  | `var(--warning, #d4a054)` | `lunaris-has-items` inactive tab label color (Argos extension) | `chassis/forms/Tabs.svelte:81-83`                   |

## Typography

Carbon's Tabs inherits `$body-compact-01` → `font-family: $body-font-family` → mapped to Geist via Phase 0 `lunaris-carbon-theme.scss`. **Tab labels are UI navigation chrome**, so per CLAUDE.md typography rules (`Geist (sans-serif): Tab labels, UI navigation chrome, weather text only`), Geist is correct here — do NOT override to Fira Code. The badge inside the label (`.lunaris-tab-badge` at `Tabs.svelte:91-96`) sets `font-variant-numeric: tabular-nums` so digit columns stay aligned across width changes; size is `0.85em` to subordinate to the label.

## Sizing and variants

Carbon Tabs has no per-instance size prop — height is fixed by the variant:

| Argos prop         | Carbon prop        | Visual                                                                          |
| ------------------ | ------------------ | ------------------------------------------------------------------------------- |
| `type="default"`   | `type="default"`   | 40 px tall, transparent background, 1 px underline; selected = 2 px accent line |
| `type="container"` | `type="container"` | 48 px tall, filled `$layer-01` strip, selected tile lifts to `$layer-selected`  |
| `autoWidth={true}` | `autoWidth={true}` | each tab sizes to its label                                                     |
| `fullWidth={true}` | `fullWidth={true}` | tabs distribute evenly across container width                                   |

Default = `type="default"` / `autoWidth={false}` / `fullWidth={false}` — matches DeviceSubTabs canary.

## What the wrapper adds

The chassis adds three things on top of Carbon's primitive (see `chassis/forms/Tabs.svelte`):

1. **Id-keyed `TabDef` API** (`Tabs.svelte:3-12`) — Carbon's `<Tab>` is positionally indexed (`selected: number`); the chassis maps the consumer's stable `selectedId: string` to that index via a `$derived` (`Tabs.svelte:40`). This isolates consumers from index drift when tabs are added/removed/reordered.
2. **Inline badge slot** (`Tabs.svelte:68-76`) — when `tab.badge` is set, the wrapper renders a `<span class="lunaris-tab-with-badge">` around the label so a count appears inline. Carbon does not ship a built-in badge prop on `<Tab>`; the wrapper composes it via the existing `$$slots` content.
3. **`hasItems` warning class forwarding** (`Tabs.svelte:66`) — passes `class="lunaris-has-items"` on the underlying `<Tab>` when set; `<style :global>` at `Tabs.svelte:80-83` paints inactive labels with `var(--warning)` to flag stale items while keeping the selected-state accent intact.

The Svelte-4 → Svelte-5 callback bridge (`Tabs.svelte:42-48`) translates Carbon's `on:change` `CustomEvent<number>` into the chassis's `onChange?: (id: string) => void` and updates the bindable `selectedId`.

## Accent ring

Argos uses a single `--accent` color (default amber, switchable via `data-accent` attribute on `<html>`). Carbon's `$focus` and `$interactive` tokens get overridden globally in `lunaris-carbon-theme.scss` so both the focus outline AND the active-tab underline match the user-picked accent — the Tabs wrapper inherits this without needing local rules.

## Visual diff procedure (PR-A canary)

1. Pre-merge: chrome-devtools MCP `take_screenshot` of DeviceSubTabs on `localhost:5173/dashboard` in an isolated context (per `feedback_chrome_devtools_heap_iso.md`).
2. Apply PR-A.
3. Post-merge: same screenshot, same isolated context.
4. Compare. Drift > 1 pixel on any axis OR > 0.5 luma on any color sample OR new layout shift = fail; extend `lunaris-carbon-theme.scss` with the missing override and re-test.
5. Verify `lunaris-has-items` warning state by toggling a stale device feed and confirming `var(--warning)` paints the inactive label.
