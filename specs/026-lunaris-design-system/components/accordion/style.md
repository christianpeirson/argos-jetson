# Accordion — Style

**Status:** Phase 9.1 PR — implementation in flight
**Last updated:** 2026-05-04
**Authority precedence:** Carbon source SCSS > Carbon site mdx > Lunaris CSS overlay
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/Accordion.svelte>

---

## Canonical anatomy citations

From `docs/carbon-design-system/packages/styles/scss/components/accordion/_accordion.scss`:

```scss
.#{$prefix}--accordion {
	@include reset;
	inline-size: 100%;
	list-style: none;
}

.#{$prefix}--accordion__item {
	transition: all $duration-fast-02 motion(standard, productive);
	border-block-start: 1px solid $border-subtle;
}

.#{$prefix}--accordion__heading {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	inline-size: 100%;
	min-block-size: convert.to-rem(40px); // default; sm 32px; xl 48px
	padding-block: $spacing-04;            // 12px
	padding-inline: $spacing-05;           // 16px
	background-color: transparent;
	color: $text-primary;
	cursor: pointer;
	transition: background-color $duration-fast-02 motion(standard, productive);
}

.#{$prefix}--accordion__heading:hover::before {
	background-color: $layer-hover;
}

.#{$prefix}--accordion__content {
	display: none;
	padding-block-start: $spacing-03;
	padding-block-end: $spacing-06;
	padding-inline-start: $spacing-05;
	padding-inline-end: 25%;
	transition: padding $duration-fast-02 motion(standard, productive);
}

.#{$prefix}--accordion__item--active .#{$prefix}--accordion__content {
	display: block;
}

.#{$prefix}--accordion__arrow {
	flex: 0 0 1rem;
	margin-block-start: convert.to-rem(2px);
	margin-inline-end: 0;
	transform: rotate(-90deg);
	transition:
		transform $duration-fast-02 motion(standard, productive),
		fill $duration-fast-02 motion(standard, productive);
}

.#{$prefix}--accordion__item--active .#{$prefix}--accordion__arrow {
	transform: rotate(0deg);
}
```

Key shape:

- **40-px default heading height**, 32 px at `sm`, 48 px at `xl`.
- **Body collapsed via `display: none`** — not `visibility: hidden`. AT does not announce hidden content. Transition affects `padding`, not `display`.
- **Border between items** — 1 px `$border-subtle` on `border-block-start`. Last item gets a `border-block-end` matching style.
- **Chevron rotation** — `-90deg` collapsed → `0deg` open. Animated via `transform` over `$duration-fast-02` (110 ms) standard productive.
- **Body inline-end padding 25 %** — Carbon's specific reading-comfort gap on the right; Lunaris keeps unchanged for prose accordions, overrides to 16 px for tactical-density nav accordions (Workflows panel) via `class` forwarding.

---

## Lunaris token map

| Carbon token                     | Lunaris value                             | Notes                                                              |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `$text-primary` (heading text)   | `var(--ink)` for active, `var(--ink-2)` collapsed | Active item heading slightly brighter to signal "you're here"      |
| `$text-disabled` (disabled head) | `var(--ink-5)`                            | Most-muted ink                                                     |
| `$border-subtle` (item sep)      | `var(--border)` (#2E2E2E) 1 px            | Quiet rule between items                                           |
| `$layer-hover` (heading hover)   | `var(--bg-1)` (#161616)                   | Subtle lift on hover                                               |
| `$icon-primary` (chevron)        | `var(--ink-2)`                            | Default chevron                                                    |
| `$focus`                         | `var(--accent)`                           | 2-px outline on focused heading button                              |
| `$layer` (heading bg)            | transparent                               | Heading sits flush on parent panel — no card-on-card               |
| `body-compact-01` heading text   | `var(--mk2-fs-3) / 1.4 var(--mk2-f-mono)` | Geist Mono UPPERCASE for tactical accordions (Workflows / Tools)   |
| `body-01` heading text (prose)   | `var(--mk2-fs-3) / 1.4 var(--mk2-f-sans)` | Geist sans for prose-heavy accordions (Reports / Tweaks)           |

---

## Sizing per surface

Carbon ships three sizes via `size` prop. Lunaris adopts all three.

| Argos surface              | Density | Carbon size | Heading height | Heading text                            |
| -------------------------- | ------- | ----------- | -------------- | --------------------------------------- |
| Workflows panel categories | compact | `"sm"`      | 32 px          | `code-compact-01` UPPER mono            |
| Tools flyout sub-categories | compact | `"sm"`      | 32 px          | `code-compact-01` UPPER mono            |
| Advanced settings (Tweaks)  | normal  | default     | 40 px          | `body-compact-01` mixed-case sans       |
| Mission report sections    | normal  | default     | 40 px          | `body-compact-01` mixed-case sans       |

Touch-target compliance is achieved via full-width heading hitboxes — see `accessibility.md` for WCAG 2.5.8 reasoning.

---

## What Argos does NOT inherit from Carbon

- **Light variant** — Argos is dark-mode only.
- **Body inline-end 25 % padding** for tactical surfaces — Lunaris overrides to 16 px on Workflows / Tools accordions (longer item lists with right-edge actions need the space). Override applied via `class="tactical"` forwarded to outer `<ul>`.
- **Custom transition durations** — Carbon's 110 ms feels right for Argos; not overridden.

---

## State matrix

Per Carbon `accordion/style.mdx` confirmed against source SCSS:

| State                | Border (Lunaris)                        | Heading bg     | Heading text                       | Chevron          |
| -------------------- | --------------------------------------- | -------------- | ---------------------------------- | ---------------- |
| Collapsed (default)  | `var(--border)` 1 px top                | transparent    | `var(--ink-2)`                     | -90° `var(--ink-2)` |
| Hover (collapsed)    | unchanged                               | `var(--bg-1)`  | `var(--ink)`                       | -90° `var(--ink)` |
| Expanded             | unchanged                               | transparent    | `var(--ink)`                       | 0° `var(--ink)`   |
| Hover (expanded)     | unchanged                               | `var(--bg-1)`  | `var(--ink)`                       | 0° `var(--ink)`   |
| Focus (any)          | + 2-px ring `var(--accent)` outside heading | unchanged   | unchanged                          | unchanged        |
| Disabled             | unchanged                               | transparent    | `var(--ink-5)`                     | -90° `var(--ink-5)` |

---

## `align="start"` for nav-style accordions

Carbon's default chevron alignment is `align="end"` (chevron on the trailing edge). Tree-view + nav patterns expect chevron-leading (`align="start"`) so the expand affordance reads top-down with the title to the right.

| Surface                     | `align`   | Reason                                         |
| --------------------------- | --------- | ---------------------------------------------- |
| Workflows panel categories  | `"start"` | Tree-view nav pattern; chevron-leading         |
| Tools flyout sub-categories | `"start"` | Tree-view nav pattern                          |
| Advanced settings (Tweaks)  | `"end"`   | Prose disclosure; Carbon default reads better  |
| Mission report sections     | `"end"`   | Prose disclosure                               |

---

## Active-item visual emphasis

The current active workflow / tool category in nav-style accordions deserves a stronger active state than just "expanded". Lunaris applies a 2-px leading `border-inline-start: var(--accent)` on the active item heading to mirror nav-rail "you're here" affordance.

This override is per-instance (`class="active"` forwarded), not built into the wrapper — the wrapper does not know which item is "active in the app sense" vs "expanded in the accordion sense". Consumer attaches `class="active"` to the matching `<AccordionItem>` heading via `class` prop pass-through.

---

## Authority citations

- Carbon Svelte source (v0.107.0): <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/Accordion.svelte>
- Carbon Svelte `<AccordionItem>` source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/Accordion/AccordionItem.svelte>
- Carbon source SCSS: `docs/carbon-design-system/packages/styles/scss/components/accordion/_accordion.scss`
- Carbon site mdx: `docs/carbon-website/src/pages/components/Accordion/{usage,style,code,accessibility}.mdx`
- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-accordion--default>
- Lunaris CSS custom properties: `src/app.css` (`:root` block)
- Theme overlay: `src/lib/styles/lunaris-carbon-theme.scss`
