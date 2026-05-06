# DockShell — Usage

**Status:** Phase 9.2 — chassis primitive only (consumer wiring in 9.3 AGENTS Mission Control)
**Last updated:** 2026-05-05
**Implementation file:** `src/lib/components/chassis/DockShell.svelte`
**Predecessor:** none — net-new bespoke primitive

---

## When to use

`<DockShell>` renders **two panels with the secondary panel docked to one of four sides** (top / right / bottom / left) of the primary, with a `'hidden'` mode that gives the primary the full surface. Use when:

- A surface needs a primary content area plus a sidekick panel that the user can re-position around the primary (Workflows panel around the TMUX session grid in AGENTS).
- The dock side is **persisted user preference** (localStorage / store), not a fixed designer choice.
- Hide is a first-class state — the secondary panel can fully retract.

This is the layout shell that wraps the AGENTS screen's TMUX session grid + Workflows panel, mirroring the React mock's `DockLayout` component from `docs/UI/Argos (1).zip`.

## When NOT to use

| Pattern                                                        | Why not                                                                             | Right primitive                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Fixed two-pane split (no re-docking)                           | Over-engineered; just use a `<Split>` or grid                                       | `ResizableBottomPanel.svelte` or bespoke flex          |
| Three-or-more-panel layout                                     | Beyond scope; forces nested DockShells with messy z-index                           | Build a custom panel manager                           |
| Modal overlay or popover                                       | Wrong primitive; DockShell is for in-flow layout                                    | `<Modal>` (chassis 4) or popover                       |
| Dragging the secondary panel between dock zones (drag-drop UX) | DockShell ships dock-mode prop only; drag coordination is consumer's responsibility | Consumer manages pointer events + calls `onDockChange` |

DockShell deliberately does **not** ship drag-and-drop coordination in v1. The design archive coordinates drag via a `window.__argosDock` global. Bringing that into Svelte cleanly takes a context store. v1 ships layout + dock-state prop only; drag UX layers on in 9.3 if user testing shows it's needed.

## Argos surface inventory (Phase 9.2 — chassis only)

| Site                                                                                             | Phase | Status                      |
| ------------------------------------------------------------------------------------------------ | ----- | --------------------------- |
| `routes/dashboard/mk2/agents/+page.svelte` (AGENTS Mission Control: TMUX grid + Workflows panel) | 9.3   | Sole consumer; ships in 9.3 |

The chassis ships in 9.2 to be ready for 9.3's full AGENTS rebuild.

## Paste-ready snippets

```svelte
<script lang="ts">
	import DockShell from '$lib/components/chassis/DockShell.svelte';
	import type { DockMode } from '$lib/components/chassis/DockShell.svelte';

	let dock: DockMode = $state('right');
</script>

<DockShell {dock}>
	{#snippet primary()}
		<SessionGrid />
	{/snippet}
	{#snippet secondary()}
		<WorkflowsPanel {dock} onDock={(next) => (dock = next)} />
	{/snippet}
</DockShell>
```

The dock-chip controls (◧ ⬒ ⬓ ◨ ×) live inside the secondary panel's header — they're a consumer concern (per the design archive's `WorkflowsPanel`), not part of `DockShell`. The shell only owns layout positioning.

## Persistence

DockShell does NOT persist state itself. The consumer reads/writes localStorage (or a store) and feeds the current value through the `dock` prop. This keeps the chassis stateless and testable.

A typical consumer pattern with `useLocalStorage`-style helper:

```svelte
import {localStorageRune} from '$lib/utils/local-storage.svelte'; const dockMode = localStorageRune('argos.wf-dock',
'right' as DockMode);
```

(Substitute Argos's actual local-storage rune helper at the time 9.3 lands — the reference here is illustrative.)

## Sizing

DockShell uses CSS grid with two tracks. Default split:

- Horizontal docks (left/right): primary `1fr`, secondary `clamp(240px, 28vw, 480px)`
- Vertical docks (top/bottom): primary `1fr`, secondary `clamp(160px, 30vh, 400px)`

The `secondarySize` prop accepts a CSS length (e.g., `'320px'`, `'30vw'`) to override. Resizable splitters are a future enhancement — not in v1 scope.

## Composition pattern

```text
┌─────────────── DockShell ───────────────┐
│  ┌─────────── primary ───────────┐  ┌─ secondary ─┐
│  │                               │  │ header      │
│  │  TMUX session grid            │  │  ◧⬒⬓◨×     │
│  │                               │  │ ─────────── │
│  │                               │  │ accordion   │
│  └───────────────────────────────┘  │ workflow    │
│                                     │  list       │
│                                     └─────────────┘
└─────────────────────────────────────────────┘
```

## Dependencies

- None — pure Svelte 5 component using CSS grid.
- Lunaris tokens only: `--mk2-line` (panel divider).
