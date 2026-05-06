# DockShell — Code

The `<DockShell>` chassis at `src/lib/components/chassis/DockShell.svelte` is a **bespoke Argos design-system primitive** — NOT a Carbon wrapper.

## Public API

```typescript
export type DockMode = 'left' | 'right' | 'top' | 'bottom' | 'hidden';

interface Props {
	dock: DockMode; // REQUIRED — current dock side
	primary: Snippet; // REQUIRED — primary panel content
	secondary: Snippet; // REQUIRED — secondary panel content
	secondarySize?: string; // Optional CSS length override (e.g. '320px', '30vw')
	primaryLabel?: string; // Optional aria-label for primary <section>
	secondaryLabel?: string; // Optional aria-label for secondary <section>
	class?: string; // Optional consumer styling hook
}
```

| Prop             | Type       | Default             | Description                                                                       |
| ---------------- | ---------- | ------------------- | --------------------------------------------------------------------------------- |
| `dock`           | `DockMode` | **REQUIRED**        | One of 5 layout modes; component data-attribute drives CSS grid template          |
| `primary`        | `Snippet`  | **REQUIRED**        | Primary content (e.g., session grid). Always rendered, occupies remaining surface |
| `secondary`      | `Snippet`  | **REQUIRED**        | Secondary panel content. Hidden when `dock === 'hidden'`                          |
| `secondarySize`  | `string`   | (clamp default)     | CSS length for the secondary track; overrides the default `clamp()`               |
| `primaryLabel`   | `string`   | `'Primary panel'`   | `aria-label` for the primary `<section>` landmark                                 |
| `secondaryLabel` | `string`   | `'Secondary panel'` | `aria-label` for the secondary `<section>` landmark                               |
| `class`          | `string`   | `undefined`         | Pass-through                                                                      |

The shell does **not** ship a `onDockChange` callback in v1 — dock state is consumer-managed. The dock-control buttons live inside the consumer's secondary panel header (per design archive's `WorkflowsPanel`), which already owns its own `onDock` callback path back to the parent. Adding a parallel chassis-level callback would be redundant and invite drift.

## Implementation discipline

- **Stateless layout.** The shell does not own `dock` — consumer is the source of truth (so persistence + multi-shell coordination work cleanly).
- **CSS grid only.** No JS layout calculation, no resize observers in v1. The browser handles all sizing via `grid-template-columns` / `grid-template-rows`.
- **Two snippets only.** `primary` + `secondary`. No `header` / `footer` / `overlay` snippets in v1 — those are consumer concerns. Drop-zone overlay (drag UX) is deferred to 9.3.
- **No drag coordination in v1.** The React mock uses a `window.__argosDock` global to coordinate drag-pointer state between WorkflowsPanel header and DockLayout. Replicating that in Svelte cleanly takes a Svelte context store. Deferred until 9.3 user testing shows the drag UX is preferred over chip-button dock control.

## Snippet API rationale

Two snippets keep the API tight. Consumers pass arbitrary content; the shell only owns positioning. No prop-driven content — snippets are the right Svelte 5 idiom for "user-provided panels".

```svelte
<DockShell {dock}>
  {#snippet primary()}
    <SessionGrid sessions={...} />
  {/snippet}
  {#snippet secondary()}
    <WorkflowsPanel
      onDock={setDock}
      onPointerDown={(e) => /* consumer-driven drag */}
    />
  {/snippet}
</DockShell>
```

## CSS grid template

The shell switches `grid-template` via `[data-dock]`:

```css
.dock-shell-root {
	display: grid;
	width: 100%;
	height: 100%;
	gap: 0;
	position: relative;
}
.dock-shell-root[data-dock='right'] {
	grid-template-columns: 1fr var(--dock-secondary-size, clamp(240px, 28vw, 480px));
	grid-template-areas: 'primary secondary';
}
.dock-shell-root[data-dock='left'] {
	grid-template-columns: var(--dock-secondary-size, clamp(240px, 28vw, 480px)) 1fr;
	grid-template-areas: 'secondary primary';
}
.dock-shell-root[data-dock='top'] {
	grid-template-rows: var(--dock-secondary-size, clamp(160px, 30vh, 400px)) 1fr;
	grid-template-areas: 'secondary' 'primary';
}
.dock-shell-root[data-dock='bottom'] {
	grid-template-rows: 1fr var(--dock-secondary-size, clamp(160px, 30vh, 400px));
	grid-template-areas: 'primary' 'secondary';
}
.dock-shell-root[data-dock='hidden'] {
	grid-template: 'primary' 1fr / 1fr;
}
.dock-primary {
	grid-area: primary;
	min-width: 0;
	min-height: 0;
}
.dock-secondary {
	grid-area: secondary;
	min-width: 0;
	min-height: 0;
}
```

`min-width: 0` / `min-height: 0` prevent grid track blowout from oversized child content (a common CSS-grid footgun).

## Source-of-truth pattern (consumer side)

```typescript
// In the AGENTS route or a parent component:
import { localStorageRune } from '$lib/utils/local-storage.svelte';
const wfDock = localStorageRune<DockMode>('argos.wf-dock', 'right');

// ...
<DockShell dock={wfDock.value} onDockChange={(next) => (wfDock.value = next)} />
```

The shell reads `dock`, never writes. Consumer owns persistence.

## Constraints

- Component file is single-file Svelte 5 with `<script lang="ts">`. No external dependencies.
- File should stay ≤ 150 LOC including styles.
- `svelte-autofixer` must report `issues: []` before merge.
- Type re-export: `export type DockMode` from the component module so consumers can import the union without re-declaring.

## Testing

No dedicated unit test in v1 — the component is layout-only and visually verified via 9.3 AGENTS work. If drag UX lands in v2, add a Playwright test asserting the dock-mode switch + persistence.

## Migration phasing

- **9.2 (this PR):** ship chassis only. No consumer wiring.
- **9.3:** AGENTS Mission Control wires `<DockShell>` around `<SessionGrid>` + `<WorkflowsPanel>`. Dock-chip controls live inside `WorkflowsPanel` header, calling `onDockChange` upward.
- **Future:** if user-testing shows drag-anywhere docking is wanted, add `dragOverlay` snippet + Svelte context store for pointer coordination. Do NOT add it speculatively.
