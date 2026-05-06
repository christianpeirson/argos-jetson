# Spec 026 — Lunaris Design System (Charter)

**Status:** active · Phase 0 in progress
**Created:** 2026-04-28
**Owner:** Argos team
**Supersedes:** ad-hoc per-component CSS in `src/lib/components/**`
**Related:** `specs/024-argos-mk2-redesign/`, `specs/017-lunaris-ui-unification/`, `specs/018-lunaris-layout-structure/`

---

## Why this exists

Argos's frontend is a custom Svelte design system ("Lunaris") built on top of Geist typography. Without a canonical reference doc to point at during component design discussions, every "doesn't look nice" turned into a new commit. Recent iteration on `DrawerTable.svelte` (drawer tabs 02-06) burned 5 commits chasing alignment decisions before a verbatim Carbon source rule (`.cds--data-table td { text-align: start }` from `_data-table.scss` last modified 2025-12-13) settled the question authoritatively.

This spec establishes a **single source of truth** for component conventions, citing IBM Carbon Design System source code as the authoritative reference, with Lunaris preserved as a Carbon theme overlay (color tokens) and Geist preserved as a typography override. End state: 100% visual identity preservation, ~70% engineering substrate replaced with Carbon `carbon-components-svelte` primitives, the remaining ~30% (RF widgets, MapLibre wrappers, panel-with-brackets framing, IconRail) stays bespoke but consumes Lunaris theme tokens for harmony.

---

## Architecture (end state)

```text
IBM Carbon Design System (sole authority)
  ├─ carbon-components-svelte (Svelte 5 component library)
  ├─ @carbon/styles (SCSS tokens, mixins, themes)
  └─ Methodology + a11y per component
       │
       ▼ token overrides (single SCSS file)
Lunaris Theme = Carbon g100 + token overrides
  ├─ Color: oklch military palette → $layer-*, $text-*, $border-*
  ├─ Typography: Geist + Geist Mono → $body-font-family, $font-family-mono
  └─ Spacing/density: Lunaris row-h → $spacing-*
       │
       ▼ wraps + extends
Argos shell + custom widgets (stay bespoke, consume Lunaris tokens)
  ├─ Application chassis (IconRail, TopStatusBar, Drawer skeleton)
  ├─ RF widgets (Sparkline, spectrum tiles)
  ├─ MapLibre wrappers
  └─ Panel-with-brackets framing
```

The visual identity stays Lunaris (you wouldn't be able to tell from a screenshot that Carbon is underneath — colors, fonts, spacing, look-and-feel are all preserved). What changes is the **engineering substrate**: bespoke Svelte components → Carbon Svelte components, with theme token overrides as the bridge.

---

## Authorities

Three reference surfaces on disk under `/home/jetson2/code/Argos/docs/`:

| Path                                                                            | Purpose                                                                           | Source-of-truth role                                                                                                         |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `docs/carbon-design-system/` (sparse-checkout of `carbon-design-system/carbon`) | Carbon SCSS source + React components + themes                                    | **Methodology authority.** Source code wins over site docs (last-modified date is the tiebreaker).                           |
| `docs/carbon-website/` (full clone)                                             | Carbon usage mdx docs (`usage.mdx`, `style.mdx`, `code.mdx`, `accessibility.mdx`) | **Usage / a11y reference.** Contextual guidance per component.                                                               |
| `docs/argos-v2-mockup/` (extracted user-provided zip)                           | Argos v2 JSX/HTML/CSS mockup + screenshots                                        | **Visual layout reference.** What "Argos v2 looks like" — color palette, typography, layout chrome, screenshot ground-truth. |

**See `authorities.md`** for the canonical-pattern matrix per-component (e.g., data-table alignment rules cited verbatim from each authority).

---

## Per-component spec structure

Each component governed by this DS gets a directory under `specs/026-lunaris-design-system/components/<name>/` with **four files** modeled on Carbon's documentation structure:

| File               | Content                                                                                                            | Mirrors                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| `usage.md`         | When to use / when not / variants / common patterns                                                                | Carbon `usage.mdx`         |
| `style.md`         | Visual specs (alignment, padding, sizing, color tokens) with Carbon source URLs + last-modified dates as citations | Carbon `style.mdx`         |
| `code.md`          | Component API (props, slots, events, Svelte usage examples) including any Argos-specific extensions                | Carbon `code.mdx`          |
| `accessibility.md` | WCAG patterns, keyboard navigation, screen-reader behavior                                                         | Carbon `accessibility.mdx` |

**Rule (per memory `feedback_lunaris_spec_first.md`):** No component change ships without first writing or updating the matching `style.md`. Citations + canonical-pattern matrix go in the spec; the implementation references the spec.

---

## Verification gates

Per-phase pre-merge gate (CLAUDE.md Rule 6 already enforces sentrux):

| Check                 | Tool                                                                              | Pass criterion                     |
| --------------------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| Build clean           | `npm run build`                                                                   | Exit 0, `✔ done`                  |
| Production restart    | `sudo systemctl restart argos-final.service` + curl                               | HTTP 200 within 10s                |
| Visual parity         | chrome-devtools MCP `take_screenshot` vs `docs/argos-v2-mockup/screenshots/*.png` | Pixel-diff or human-judgment match |
| a11y                  | Carbon's `axe-core` test integration                                              | Zero WCAG 2.1 AA violations        |
| Behavior              | chrome-devtools MCP click/keyboard/sort                                           | Matches pre-migration UX           |
| Type-check            | Svelte LSP `hover` on key symbols                                                 | Clean                              |
| Architectural fitness | Sentrux `check_rules`                                                             | quality_signal not regressed       |
| Trunk hold-the-line   | pre-commit `trunk check --index`                                                  | No NEW issues                      |

---

## Rollback strategy (multi-layer defense)

Five layers, cheapest to slowest:

1. **Per-commit revert** — every phase has atomic commits. `git revert <sha>`. Cost: ~30s.
2. **Per-phase git tag** — `spec-026-phase-N-complete` tag at end of each phase. `git checkout spec-026-phase-N-complete -- <files>`. Cost: ~1 min.
3. **Per-phase branch isolation** — each phase on its own feature branch; merged to `dev` only after green verify.
4. **Parallel implementations** — bespoke component file kept alive (renamed `*Bespoke.svelte`) until 100% migrated. Switching back is a 1-line consumer-side change.
5. **Production-build rollback** — `git checkout spec-026-phase-N-complete && npm run build && sudo systemctl restart argos-final.service`. Cost: ~2 min.

---

## Migration roadmap

Eight-phase plan in `migration-roadmap.md`. Phase 0 (this branch) lays infrastructure with zero user-visible change. Phases 1-7 progressively swap bespoke components for Carbon components.

---

## Status (Phase 0 — 2026-04-28)

- ✓ Carbon `carbon-components-svelte` v0.107.0 verified (Svelte 5 supported, Apache-2.0, official Carbon org repo, last modified 2026-04-26)
- ✓ Authoritative reference docs cloned to `docs/`
- ✓ Bad-iteration commits `f8bdc233` + `86b49fad` reverted on the predecessor Phase-3 branch
- ⏳ Phase-0 scaffold in progress (this branch: `feature/spec-026-carbon-phase-0-scaffold`)

---

## References

- [carbon-components-svelte (Svelte 5 compatible, v0.107.0)](https://github.com/carbon-design-system/carbon-components-svelte)
- [Carbon design system monorepo](https://github.com/carbon-design-system/carbon)
- [Carbon Svelte docs site](https://svelte.carbondesignsystem.com/)
- [Vercel Geist typography](https://vercel.com/geist/introduction)
- Approved migration plan: `/home/jetson2/.claude/plans/create-the-plan-clearly-humble-badger.md`
