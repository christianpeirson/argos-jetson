# DockShell — Style

`<DockShell>` is a **bespoke Argos chassis primitive** — Carbon Design System ships no equivalent layout shell. Carbon's grid system is page-level; this is a localised two-panel re-dockable shell.

## Rationale for a bespoke chassis

| Carbon candidate                | Why wrong                                             |
| ------------------------------- | ----------------------------------------------------- |
| `<Grid>` / `<Row>` / `<Column>` | Fixed grid; no dock-side prop, no hidden mode         |
| Carbon's CSS Grid utility       | Same — no semantic dock concept                       |
| `<Modal>`                       | Overlay, not in-flow layout                           |
| `<SideNav>`                     | Edge-pinned navigation; not a generic two-panel shell |

The dock-anywhere pattern is unique to engineering / monitoring tools (Grafana panels, JetBrains tool windows, VS Code activity bar). It's a long-tail layout primitive that no general-purpose UI library ships at the right level of generality.

## Visual structure

```text
dock="right"                    dock="left"
┌────────────┬───────┐          ┌───────┬────────────┐
│  primary   │ sec   │          │ sec   │  primary   │
│            │       │          │       │            │
└────────────┴───────┘          └───────┴────────────┘

dock="top"                      dock="bottom"
┌────────────────────┐          ┌────────────────────┐
│ secondary          │          │ primary            │
├────────────────────┤          ├────────────────────┤
│ primary            │          │ secondary          │
│                    │          │                    │
└────────────────────┘          └────────────────────┘

dock="hidden"
┌────────────────────┐
│ primary (full)     │
│                    │
└────────────────────┘
```

Implemented via CSS grid with `grid-template-columns` / `grid-template-rows` switching by `[data-dock]` attribute. No JS layout calculation.

## Lunaris tokens used

| Token        | Role                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| `--mk2-line` | Border between primary and secondary panels (1px)                             |
| `--mk2-bg`   | Shell background (transparent fallback so consumer panels paint their own bg) |

The shell itself is mostly transparent — primary and secondary panels paint their own backgrounds. The shell only contributes the dividing border line.

## Design archive citation

Mirrors the `DockLayout` and `DockOverlay` components from `docs/UI/Argos (1).zip` `screen-agents.jsx`:

```jsx
const DockLayout = ({ dock, tmux, wf, onDock }) => {
	// ...drag coordination via window.__argosDock...

	if (dock === 'hidden') {
		return <div className="ag-dock-root">{tmux}</div>;
	}

	switch (dock) {
		case 'right':
			return (
				<Split direction="row" sizes={[0.72, 0.28]} min={240}>
					{tmux}
					{wf}
				</Split>
			);
		case 'left':
			return (
				<Split direction="row" sizes={[0.28, 0.72]} min={240}>
					{wf}
					{tmux}
				</Split>
			);
		case 'top':
			return (
				<Split direction="column" sizes={[0.3, 0.7]} min={160}>
					{wf}
					{tmux}
				</Split>
			);
		case 'bottom':
			return (
				<Split direction="column" sizes={[0.7, 0.3]} min={160}>
					{tmux}
					{wf}
				</Split>
			);
	}
};
```

Argos chassis maps:

- `dock` prop → `data-dock` attribute on the shell root
- React `<Split>` library → CSS grid (no resize splitter in v1; resize is a future enhancement)
- React min/sizes props → CSS `clamp()` values (overridable via `secondarySize` prop)
- `window.__argosDock` global drag API → **not in v1**, deferred to 9.3 if user testing shows it's wanted

## CSS contract

The shell owns its `.dock-shell-root` / `.dock-primary` / `.dock-secondary` selectors. Consumers do not style these directly. Consumer panels passed via `primary` and `secondary` snippets paint their own borders / backgrounds.

The shell adds **one** border between the panels (using `--mk2-line` token). That's a subtle 1px divider — it should not visually compete with the panels' own chrome.

## Theming

Dark mode only. No prop overrides for color — all visual variation is driven by Lunaris tokens at the `:root` level.

## Sizing

| Mode                 | Default secondary size      |
| -------------------- | --------------------------- |
| `'left'` / `'right'` | `clamp(240px, 28vw, 480px)` |
| `'top'` / `'bottom'` | `clamp(160px, 30vh, 400px)` |
| `'hidden'`           | n/a — primary takes 100%    |

Override via `secondarySize` prop (CSS length or grid-template fragment). The shell does not store user-resized values; resizable splitters are out of v1 scope.

## Reduced motion

The shell does not animate dock changes in v1 — switching `dock` is an instant CSS-grid layout swap. No transition that would need a `prefers-reduced-motion` opt-out.

If 9.3 user feedback wants animated docking, layer a CSS transition on the grid template via `prefers-reduced-motion: no-preference` media query. Do not animate by default — instant swap is cleaner UX in a tactical console.
