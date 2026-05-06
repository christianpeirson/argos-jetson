# EditorTabBar — Usage

`<EditorTabBar>` at `src/lib/components/chassis/EditorTabBar.svelte` is a **bespoke Argos design-system primitive** for editor-style tab strips with per-tab close affordance. It is the SECOND genuinely-bespoke chassis in spec-026 (after `PanelStatus`, Phase 8.4) — Carbon Design System has no primitive that supports a close-X inside a tab without violating W3C ARIA APG (`role="tab"` forbids nested interactives).

## When to use

Use `<EditorTabBar>` when the surface needs:

- A horizontal strip of tabs that the user can switch between AND close individually.
- A trailing affordance such as a "+ new" button or dropdown.
- Industry-standard editor/browser-tab UX (VS Code editor tabs, Chrome browser tabs).

## When NOT to use

| Need                                                   | Use instead                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| Tabs without close (settings/dashboard sub-navigation) | `<Tabs>` (`chassis/forms/Tabs.svelte`) — wraps Carbon's Tabs |
| Vertical navigation with sub-items                     | `<DrawerTabs>` (`chassis/drawer-tabs/`)                      |
| Switching between tool families                        | `<ToolsFlyout>`                                              |
| Single panel with empty/loading/error states           | `<PanelStatus>`                                              |

## Consumers

| Site                                                     | Status                                |
| -------------------------------------------------------- | ------------------------------------- |
| `dashboard/TerminalPanel.svelte` (terminal session tabs) | **Migrated** in Phase 8.6 (this spec) |

Adding a consumer requires updating this table.

## States

Per Argos architecture rule (`Components must handle: Empty / Loading / Default / Active / Error / Success / Disabled / Disconnected`):

| State            | Treatment                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Empty**        | Consumer renders the chassis with `tabs={[]}` — bar collapses to just the `trailing` snippet (e.g. "+ new"). No tabs visible |
| **Loading**      | Consumer wraps `<EditorTabBar>` in a parent skeleton; chassis itself has no intrinsic loading state                          |
| **Default**      | One or more tabs, exactly one with `id === activeId`                                                                         |
| **Active**       | Active tab carries `aria-selected="true"` + `tabindex="0"` + `--lunaris-tab-active` style                                    |
| **Error**        | Per-tab error indication is consumer's responsibility (icon snippet on the tab title) — chassis stays state-agnostic         |
| **Success**      | Same as Default; success indication via consumer-provided `icon`                                                             |
| **Disabled**     | Whole-bar disable: consumer sets `class="opacity-50 pointer-events-none"` on the chassis                                     |
| **Disconnected** | Same as Disabled — consumer's responsibility                                                                                 |

## Common pitfalls

1. **Forgetting `activeId`** — without an `activeId` matching a tab `id`, no tab carries `tabindex=0`; the bar is keyboard-unreachable. Always pass an `activeId` even for empty-tab cases (use `''`).
2. **Mutable `id`s** — chassis tracks focus by `id`; rotating IDs every render breaks focus restoration after close. Stable IDs only (e.g. session UUIDs).
3. **Trailing snippet with focusable items** — focusable elements inside `trailing` are reachable via Tab key but NOT via the chassis's roving arrow keys (per WAI-ARIA APG Toolbar — multi-stop toolbar). Document this in the consumer.
4. **Deep DOM nesting in tab title** — the title `<span>` inside the tab `<button>` should remain a single text node or trivial inline icon. Nested interactives inside the tab `<button>` reintroduce the original APG violation.
5. **Calling `onClose` without removing the tab from `tabs`** — the chassis is controlled. The consumer must remove the closed tab from its source store; chassis does not auto-remove.

## Migration roadmap entry

Phase 8.6 — closes the deferred-cleanup umbrella's last high-risk row. Single consumer (TerminalPanel) migrated in the same PR that introduces the chassis.
