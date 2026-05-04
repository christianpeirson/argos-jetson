# TooltipIcon — Usage

**Status:** Phase 8.1 — wrapper + 1 canary live
**Last updated:** 2026-05-04
**Implementation file:** `src/lib/components/chassis/forms/TooltipIcon.svelte`
**Carbon component:** `<TooltipIcon>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** `node_modules/carbon-components-svelte/src/TooltipIcon/TooltipIcon.svelte`
**GitHub source:** https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/TooltipIcon/TooltipIcon.svelte

---

## When to use

Carbon's `<TooltipIcon>` wraps an **existing icon button** with a hover-revealed tooltip. The icon IS the trigger — there is no separate text or info-icon affordance. Use when:

- The UI element is **already an icon button** (toolbar action, panel header control).
- The button's **visual identity is subtle** (transparent background, neutral chrome) — no branding.
- Hover/focus context fits in **one short string** (≤ 6 words; e.g. "Clear chat", "Refresh", "Open settings").
- The button needs **a11y-safe naming** (`aria-describedby` wiring) without changing visible chrome.

This is the **second of two Carbon tooltip primitives** Argos wraps. See "TooltipIcon vs Tooltip" below for the distinction.

## When NOT to use

The Phase 8.1 audit identified two `title=` migration targets that look like TooltipIcon candidates from a grep but are actually wrong-primitive matches. Documented here to prevent re-attempts:

| Site | Pattern | Why NOT TooltipIcon | Right primitive |
|---|---|---|---|
| `dashboard/AgentChatPanel.svelte:99` (`title="Send message"`) | Primary-action button: filled `var(--interactive)` blue background, 32×32 sizing, white icon, hover/disabled chrome | TooltipIcon's button is subtle/transparent by design — migrating would strip all branding chrome. Forcing class overrides triggers CSS-specificity battles with Carbon's `bx--tooltip__trigger`. | Future chassis `<Button kind="primary">` (not yet built) |
| `dashboard/views/UASScanView.svelte:231` (`title="Clear buffer"`) | Text-only button: `>Clear<` — no icon, just label text | TooltipIcon REQUIRES an `icon` prop (the icon IS the trigger, by W3C ARIA APG semantic contract) | Stays native `title=` per Phase 4 PR-A discipline (97 native sites stay native — 1.4.13 acceptable for short labels), OR future chassis `<Tooltip hideIcon triggerText="Clear">` if richer hover content is needed |

In general:

- **Single-line, low-stakes hint on a subtle icon → TooltipIcon ✅**
- **Single-line hint on a primary-action / branded button → Future chassis Button (not TooltipIcon) ❌**
- **Hint on a text-only button → Native `title=` or chassis `<Tooltip hideIcon>` ❌**
- **Multi-line / structured tooltip body → chassis `<Tooltip>` (info-icon trigger) ❌**

## TooltipIcon vs Tooltip

Two Carbon primitives, two ARIA patterns, two visual treatments. Pick by trigger shape:

| Concern | `<TooltipIcon>` (Phase 8.1) | `<Tooltip>` (Phase 4 PR-A) |
|---|---|---|
| **Trigger** | Existing icon button (icon IS trigger) | Renders its own info-icon (`Information` glyph) + popover |
| **HTML** | `<button>` with icon child | `<div>` wrapper + `<button>` info-icon + popover |
| **ARIA wiring** | `aria-describedby` on the icon button | `aria-haspopup="true"` + `aria-expanded={open}` + `aria-describedby` on info-icon trigger |
| **Use case** | Toolbar / panel-control icon buttons | Discoverable "?" affordance next to a label |
| **Default `align`** | `'center'` | `'start'` |
| **Warm-handoff** | Yes — adjacent TooltipIcons share `activeTooltipIcon` store, skip open-delay | No (independent state per Tooltip) |
| **Required prop** | `tooltipText` (REQUIRED — no safe default) | `iconDescription` defaults to `'More information'` |

**Use TooltipIcon when**: the icon alone is the action, space is limited, brief explanations suffice.
**Use Tooltip when**: you want a discoverable info-icon next to a label, with multi-line / structured body content.

## Argos surface inventory (Phase 8.1 scope — 1 canary)

| File | Line | Why migrate | PR |
|---|---|---|---|
| `src/lib/components/dashboard/AgentChatToolbar.svelte` | 35 | Subtle toolbar action — `<button class="toolbar-btn" title="Clear chat">` matches TooltipIcon shape exactly | **Phase 8.1 canary** |

The remaining `title=` instances stay native or defer to other chassis primitives — see "When NOT to use" above and `migration-roadmap.md` Phase 8 close-out notes.

## Direction + alignment defaults

Wrapper defaults: `direction='bottom'`, `align='center'` — matches Carbon source defaults (NOT chassis `<Tooltip>` which defaults to `align='start'`). Override per surface when the trigger sits at a panel edge.

| Direction | When |
|---|---|
| `'bottom'` (default) | Most cases — opens downward, won't collide with panel header |
| `'top'` | Trigger near bottom of scrollable container |
| `'right'` / `'left'` | Trigger embedded in vertical rail (icon rail, mission strip) |

| Align | When |
|---|---|
| `'center'` (default) | Tooltip horizontally centered on trigger — most balanced |
| `'start'` | Tooltip-edge aligned to trigger-start (left in LTR) — useful at right viewport edge |
| `'end'` | Tooltip-edge aligned to trigger-end (right in LTR) — useful at left viewport edge |

## Trigger anatomy

```svelte
<TooltipIcon tooltipText="Clear chat" icon={Trash2} onClick={onClear} />
```

- `tooltipText` — REQUIRED string. Becomes the `aria-describedby` content (screen-reader announces).
- `icon` — REQUIRED Svelte Component. The trigger glyph. Lucide (`@lucide/svelte`) preferred per design-system rules; carbon-icons-svelte also accepted.
- `onClick` — invoked on activation. Phase 8.1 canary uses this for the action handler.
- All other props optional — see `code.md` for full API.

## Modal composition

Carbon auto-portals TooltipIcon when rendered inside a `<Modal>` context (detected via `getContext("carbon:Modal")`). No extra wiring needed. Verified for chassis Modal in Phase 4 PR-B.

## Quick start

```svelte
<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import TooltipIcon from '$lib/components/chassis/forms/TooltipIcon.svelte';
</script>

<TooltipIcon tooltipText="Clear chat" icon={Trash2} onClick={() => clearChat()} />
```

For a streaming-state icon swap (deferred Phase 8.1 pattern, candidate for future chassis Button migration):

```svelte
<script lang="ts">
	import { Send, Loader2 } from '@lucide/svelte';
	import TooltipIcon from '$lib/components/chassis/forms/TooltipIcon.svelte';

	let { isStreaming } = $props();
	const sendIcon = $derived(isStreaming ? Loader2 : Send);
</script>

<TooltipIcon tooltipText="Send message" icon={sendIcon} onClick={sendMessage} disabled={isStreaming} />
```

## See also

- `style.md` — Lunaris token overrides for the icon button chrome (deferred until visual diff exposes drift)
- `code.md` — Full props/events table, warm-handoff store semantics, ref export
- `accessibility.md` — `aria-describedby` wiring, why `tooltipText` is REQUIRED, keyboard map
- `tooltip/usage.md` — sibling primitive (info-icon trigger pattern)
