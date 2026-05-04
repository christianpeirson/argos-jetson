# CLAUDE.md

<!-- SKIP AUTO-UPDATE -->

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- MANUAL ADDITIONS START -->

## Codebase Overview

SvelteKit SDR & Network Analysis Console for Army EW training on RPi 5. Wraps native CLI tools (hackrf_sweep, gpsd, Kismet, grgsm_livemon) into a real-time web dashboard with WebSocket push, MapLibre GL mapping, and MIL-STD-2525C symbology.

**Stack**: SvelteKit 2 + Svelte 5 runes, TypeScript strict, Tailwind CSS v4, better-sqlite3, MapLibre GL, ws (WebSocket), node-pty
**Structure**: 36 API domains (118 routes, 107 using createHandler), 23 stores, 10 UI component families, 7 always-on MCP servers

Use `serena` symbolic tools + targeted `Grep`/`Glob` for codebase navigation. No static map file is maintained — read the current source.

## Mandatory Workflow Rules

These rules are non-negotiable. Follow them for every task.

### Rule 1 — Chrome DevTools for Frontend Debugging

When debugging any frontend, UI rendering, network, or browser-side issue: use the `chrome-devtools` MCP server BEFORE writing speculative fixes. Inspect DOM state, console errors, network requests, and performance traces in the actual running app. Do not guess at UI bugs — observe them first.

### Rule 2 — claude-mem Prior Work Check

Before beginning any significant task, search claude-mem (`smart_search`) to check if this work (or equivalent) has been done in prior sessions. This prevents duplicate effort and surfaces prior decisions, failed approaches, and context that would otherwise be lost.

### Rule 3 — Svelte MCP + LSP on every .svelte edit

Before writing or changing any Svelte component, call `mcp__plugin_svelte_svelte__list-sections` → `get-documentation` → `svelte-autofixer`. Do not send Svelte code to the user unless `svelte-autofixer` returns clean. **Plus** for any modified type / interface / exported symbol, run `LSP findReferences` (svelteserver via the `svelte` plugin) PRE-edit to lock the consumer set, and `LSP hover` POST-edit to confirm type narrowing — beats grep + faster than `svelte-check`. See the **Svelte MCP** section below for the full sequence.

### Rule 4 — GitHub Access via Octocode Only

For ANY GitHub interaction (repo structure, file content, search, PR history): use `mcp__octocode__*` tools ONLY. Do **not** use `gh` CLI. Do **not** use `WebFetch` on `github.com/*` URLs. Octocode respects token scopes, handles pagination cleanly, and avoids auth prompts that break in hooks.

**Exception — PR lifecycle operations**: `gh pr create|view|checks|comment|merge|edit|list|diff` + `gh api repos/Graveside2022/argos-jetson/*` + `gh auth status` are allowed because octocode exposes only read-side GitHub tools. PR creation, comments, and merge require `gh` CLI. Exception list is scoped by exact subcommand in `.claude/settings.local.json` (`permissions.allow`). Do NOT expand to `gh repo *`, `gh workflow *`, `gh release *`, or `gh api` paths outside this repo without adding a new allow rule first.

### Rule 5 — Docs via Context7 before WebFetch

For ANY question about a third-party library, framework, SDK, or CLI tool (React, SvelteKit internals, Puppeteer, node-pty, better-sqlite3, etc.): call `mcp__plugin_context7-plugin_context7__resolve-library-id` then `query-docs`. Only fall back to `WebFetch` if context7 has no entry for the library. This avoids stale training-data answers.

### Rule 6 — Sentrux session bracketing on every PR

Every PR is bracketed by sentrux. Bracketing is **per-branch**, not per-phase or per-commit. Under the batched-commit cadence (Rule 10), `session_start` fires ONCE at branch creation and `session_end` + `rescan` + `check_rules` fire ONCE pre-merge — even when the branch contains multiple phases worth of commits. Mid-session optional rescan is allowed after structurally-risky phases (chassis additions, deletions of >5 files) but is not required.

1. **Branch creation**: after `git checkout -b feature/...`, call `mcp__plugin_sentrux_sentrux__session_start` (captures pre-change graph baseline).
2. **Pre-merge**: before `gh pr merge --squash`, call in order:
    - `mcp__plugin_sentrux_sentrux__rescan` (re-walk after final commit)
    - `mcp__plugin_sentrux_sentrux__session_end` (delta report)
    - `mcp__plugin_sentrux_sentrux__check_rules` (must pass `.sentrux/rules.toml`)
3. **`quality_signal` must NOT regress** vs the baseline recorded in `project_sentrux_baseline.md` (Day-0 = 5401). Regressions block merge unless explicitly approved by the user with a follow-up issue filed.

The `.sentrux/rules.toml` enforces `max_cycles = 0` + layer ordering (routes → components → client_state → server → utils → types) + 4 hard `from→to` boundaries. CC and fn-line checks are deferred until sentrux ships per-language dispatch (see baseline memory for v0.5.7 limitation).

### Rule 7 — CI/CD pipeline edits reference the canon spec

Before any change to `.github/workflows/`, `.husky/`, `package.json` scripts, `.trunk/`, `.lintstagedrc.json`, `commitlint.config.mjs`, `dangerfile.js`, or `config/eslint.config.js`: **read `docs/ci-cd-pipeline-spec.md` first**. It is the canonical pipeline reference (per-tool config, gate-matrix-with-canonical-owner, edge-case handling, decision log). All citations live there — don't re-derive them. If a proposed change isn't represented in the spec, AMEND the spec in the same PR. Once the L3 audit script (`scripts/ops/audit-pipeline-config.sh`, ships in PR-AUD-1b) and audit workflow are merged, drift will be enforced mechanically on every pipeline-touching PR + nightly cron. Until then, this rule is a Claude-session discipline check. Rationale: per `feedback_pro_architecture_playbook.md` Tuning-vs-architectural section + memory `feedback_mechanical_enforcement_over_audit.md` — mechanical gates catch drift that human / Claude audits miss.

### Rule 8 — Explain-as-you-go in plain terms with full-stack context

User has explicitly instructed: explain every command, tool, library, and concept inline as work progresses. Default to "user has zero prior knowledge" framing — define keywords inline the first time they appear in a session (`systemctl`, `MCP server`, `pre-commit hook`, `Carbon Design System`, etc.), open every meaningful action with a one-sentence "what + why" framing, and place each step in stack / OSI-layer / project-phase context (e.g., "Layer 7 HTTP endpoint", "build pipeline pre-bundle stage", "Phase 3c of the 8-phase Carbon migration on branch `feature/spec-026-carbon-phase-3c-checkbox`"). Use numbered step + indented sub-step format for non-trivial sequences. When errors fire, explain what the subsystem does and what surface-vs-root-cause means BEFORE proposing the fix. Caveman-mode terseness is suspended for explanatory passages — full sentences with definitions beat fragment shorthand here.

**Three reinforcements added 2026-04-29 after first day of operation:**

1. **Keyword highlighting.** Bold the keyword the FIRST time it's defined in a turn (`**ESLint cache**`); keep code identifiers / commands / file paths in backticks. Bold + backticks together give the eye an anchor.
2. **Default to deep explanations, not glosses.** A definition gets 4–8 sentences covering (a) what it literally is, (b) which subsystem owns it, (c) mechanical steps of how it works, (d) why it matters for Argos specifically, (e) where it lives on disk if applicable. One-line glosses are too thin — user has stated explanations must be "pretty detailed."
3. **Refresh the phase board after every completed phase.** When a PR squash-merge completes a phase or sub-phase (3a → 3b → 3c → 3d → 3e → 3f, or Phase 1 → 2 → 3, etc.), present the FULL updated phase table (Phase / Component / Status / PR / Date) — not just "Phase X done." Include the explicit "next step + engineering reasoning for why" for the upcoming row. User stated: _"I need to see an update to our overall plan once a phase is complete."_

Full pattern catalogue + counter-examples + edge cases in user memory `feedback_explain_as_you_go.md`. Rationale: user stated _"the way you explain it, it has to be extremely simple. like i have no idea what your doing when you run a long bash command etc, you really have to break things down clearly"_ — non-negotiable preference; failure to explain is failure to deliver even when the technical work is correct.

### Rule 9 — Parallel work during background dispatches (no idle waits)

When ANY of these bg-trigger patterns fires in a turn, the SAME turn MUST include BOTH a one-shot status check AND ≥1 parallel-safe action. **Ending a turn with a bg job pending and zero parallel work dispatched is a non-negotiable user-flagged lint violation** — treat with the same severity as committing broken code.

**Trigger patterns** (auto-fire the rule):

- `run_in_background: true` on `npm run build|test:*|typecheck`, `git commit` (quality-gate ≈ 2-3 min), `gh pr create`, `gh pr merge --auto`, any `Agent` dispatch
- `ScheduleWakeup({ delaySeconds > 60 })`
- `gh pr view` showing PR awaiting CR / CI checks
- `mcp__plugin_sentrux_sentrux__rescan` on a >50K-line repo

**Same-turn obligation** (do all three):

1. **One-shot status check** — execute `tail -3 /tmp/<log>` + `pgrep -af <proc>` + (if applicable) `gh pr view <N> --json statusCheckRollup` together as ONE bash invocation (chain with `&&` / `;` / `echo ---`). NOT split across turns. NOT a wait loop. NOT `until ... sleep ... done`. The hook at `scripts/claude-hooks/post-push-pr-flow.sh:44` uses a different `--json number,state,baseRefName` shape — that's a PR-identity probe, NOT a status check; both fields are valid for `gh pr view`.

2. **Dispatch ≥1 parallel-safe action** from the Lightweight Parallel-Safe Ops list. Always-available examples:
    - **Memory + plan + commit-message + PR-body writes** to `~/.claude/projects/.../memory/*.md`, `plans/*.md`, `/tmp/*.md`
    - **Source reads** via Read/Grep/Glob (the autofixer reminder about symbolic tools is token-efficiency guidance, NOT a parallel-work blocker)
    - **Doc fetches** via `mcp__plugin_context7-plugin_context7__*`, `mcp__octocode__*`, `WebFetch` to vendor docs
    - **Hardware/service probes** — `lsusb`, `systemctl status`, `ss -tnlp`, `curl -sf http://localhost:5173/api/health`
    - **Worktree + symlink setup** — `git worktree add -b ...`, `ln -s node_modules .env`, `npx svelte-kit sync`
    - **GitHub status checks** — `gh pr view`, `gh run list`, `gh api`
    - **Next-PR migrations** if file-disjoint from in-flight work (use the conflict matrix in the memory)

3. **State which next-phase work is being prepared** — give the user visibility into what's in flight.

**If no parallel-safe work fits, say so explicitly** ("Build running. No parallel-safe prep applies because PR-A and PR-B share `src/app.css`") — don't go silent.

**FORBIDDEN sentences** after a `run_in_background=true` dispatch (these are all fabricated excuses for ending the turn idle):

- "staying silent until it notifies"
- "to avoid burning cache cycles"
- "will check status next turn"
- "let the notification fire"
- "monitoring in background" (passive idle wait — see distinction below)
- "standing by for completion"

The `tail -3` cost is ~50 tokens; the cost of NOT parallelizing is 1-3 minutes of wasted wall-clock per bg job × every bg job in the session.

**Banned wait shells:** `until <cond>; do sleep N; done` and `tail -f file & wait` — these orphan across turns and burn process slots without observation. Replace with single-shot check + `Monitor` tool (event-driven) or `ScheduleWakeup` (self-paced re-entry).

**Idle wait vs. event-driven `Monitor` tool — they are NOT the same:**

- ❌ **Forbidden** "monitoring in background" = passive idle polling that strands the turn (the agent ends a turn with a bg job pending and zero parallel work dispatched).
- ✅ **Allowed** `Monitor` tool = event-driven harness primitive that streams stdout lines as notifications. The turn ends, the next notification re-enters the loop. No idle stranding.

`Monitor` is a Claude Code-internal tool (sibling of `Bash`/`Read`/`Edit`). Surfaced via `ToolSearch` if its schema isn't already loaded — query `select:Monitor` to fetch.

Full 6-incident catalogue (escalating remediation across 2026-04-27 → 2026-04-29) + lightweight-vs-heavy ops table + conflict-matrix for parallel PRs in user memory `feedback_parallel_work_during_waits.md`.

**Cadence-coupling note** (added with Rule 10): under batched-commit cadence the `gh pr create` + CR-loop bg dispatches happen ONCE at end-of-day, not per-phase. The per-phase parallel-work obligation is therefore reduced — between phases, the assistant runs local quality gates (eslint + selective svelte-check) and waits at the `keep going / commit` checkpoint prompt for user input. The Rule 9 obligation continues to apply at end-of-day when `npm run build` + `git push` + `gh pr create` + CR poll fire.

### Rule 10 — Batched-commit cadence (default for multi-phase work)

Default cadence for any multi-phase migration / multi-PR cleanup / multi-task feature work: **batch commits into one end-of-day PR**. Per-phase PR is the EXCEPTION, not the default. Per-phase PRs paid ~10-15 min wall-clock overhead each (build + CI + CR + wakeup loops + memory writes) regardless of code size — batching collapses N PR overheads into 1 while preserving in-PR commit granularity for bisect.

**Per-phase loop** (mid-day, before any commit):

1. Code the phase (chassis wrapper / site migrations / spec docs / roadmap update).
2. Run local quality gates: `npx eslint <touched-files> --config config/eslint.config.js`; `npx svelte-check` only if structural type changes.
3. Self-verify the diff.
4. **Stop. Print the checkpoint prompt** (template below).
5. **Wait for user**: `keep going` → loop. `commit` → end-of-day commit + push + PR sequence.

**Checkpoint prompt** (non-skippable, exact format):

```
Phase X.Y complete locally. Local gates passed (eslint clean, svelte-check clean, no typecheck regression).

Files touched (N):
  - path/to/file1
  - path/to/file2

Next phase ready: <name + LOC estimate>
Bundled work since last commit: <list of phases not yet committed>

Continue to next phase, OR commit + push + PR the current bundle? [keep going / commit]
```

Assistant MUST NOT auto-proceed to the next phase. Prompt is non-skippable.

**End-of-day commit sequence** (when user says `commit`):

1. Pre-stage audit: `git status` + `git diff --stat` (catch trunk auto-fix pollution per `feedback_trunk_autofix_pollution.md`).
2. Stage explicitly by path — never `git add -A` or `git add .`.
3. ONE conventional commit per logical phase (intermediate trail) — preserves bisect granularity inside the squashed PR.
4. Sentrux pre-push gate: `rescan` → `scan` → `check_rules` (quality_signal must not regress).
5. `npm run build` in background (per `feedback_argos_commit_always_bg.md`). Do parallel work per Rule 9 while build runs.
6. `git push -u origin <branch>` (pre-push hook fires once for the whole bundle ~13-25s).
7. `gh pr create` with body listing all bundled phases + per-phase commit SHAs + sentrux delta.
8. CR loop per `feedback_pr_wait_pattern.md` — `ScheduleWakeup ~270s` then dual-check `gh pr view --json statusCheckRollup` AND CR reviewThreads.
9. Merge with `--admin` if Danger 2000-LOC cap warns OR if PR is doc-only / CR has nothing actionable (per `project_review_workflow.md`).
10. Tag end-of-day: `git tag eod-YYYY-MM-DD <sha> && git push origin <tag>`.
11. Cleanup worktree + post-merge sentrux scan from main checkout.
12. ONE memory entry covering the full daily batch. ONE pointer line in MEMORY.md.
13. Refresh phase board per Rule 8 — print FULL updated phase table marking all phases that landed.

**WIP recovery checkpoint** (between phases): each phase end pushes `wip/YYYY-MM-DD-phase-N` with `git push --force-with-lease origin <wip-branch>`. NO PR opened. Wip branches deleted after end-of-day PR merges. This is the recovery path if the worktree is accidentally removed or the session crashes mid-day.

**SKIP_TESTS=1 decision tree** (auto-applied without asking):

```
Is the diff > 1500 LOC OR touches src/lib/state/ OR src/app.css OR > 6 files in src/lib/server/?
  YES → use SKIP_TESTS=1 git push (CI re-runs full suite)
  NO  → standard git push
```

**Per-PR cadence (one PR per phase) is RESERVED for**: (a) urgent hotfixes, (b) PR that needs isolated rollback granularity, (c) cross-subsystem changes that exceed Danger 2000-LOC cap, (d) explicit user override.

**Worktree naming under batched cadence**: per-day directory at `/home/jetson2/code/Argos-batch-YYYY-MM-DD` instead of per-phase. Symlink `node_modules` and `.env` once per `project_argos_worktree_pattern.md`.

Catalogue: `feedback_batched_commit_cadence.md`.

## Active MCP Servers

Verify current state with `claude mcp list`. Authoritative config: `~/.claude.json` (user scope) + each plugin's `.claude-plugin/plugin.json`.

### User + Plugin Scope (always on)

| Tool namespace                                       | Source                                                                    | Purpose                                                                                                                           | When to use                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `mcp__serena__*`                                     | user scope (`uv tool`)                                                    | LSP-backed symbol search, refactor, find-refs                                                                                     | Known symbol name → prefer over Grep/Glob                                                      |
| `mcp__octocode__*`                                   | user scope (`npx octocode-mcp`)                                           | GitHub repo/file/code/PR search                                                                                                   | Any `github.com` lookup (**Rule 5**)                                                           |
| `mcp__plugin_svelte_svelte__*` + `LSP`               | plugin `svelte` v1.0.4+ (`npx -y @sveltejs/mcp` + `svelteserver --stdio`) | Official Svelte 5/SvelteKit docs, autofixer, AND language-server intelligence (`findReferences`, `hover`, `goToDefinition`, etc.) | Every `.svelte` file change (**Rule 3**). Requires one-time `npm i -g svelte-language-server`. |
| `mcp__chrome-devtools__*`                            | user scope (`--browserUrl http://127.0.0.1:9222`)                         | Browser DOM/console/network/perf                                                                                                  | Frontend debugging (**Rule 2**). Requires headless chromium pre-launched                       |
| `mcp__plugin_claude-mem_mcp-search__*`               | plugin `claude-mem`                                                       | Cross-session memory + smart code search                                                                                          | Prior work check (**Rule 3**), `smart_search`, `timeline`, `smart_outline`, `knowledge-agent`  |
| `mcp__plugin_context-mode_context-mode__*`           | plugin `context-mode`                                                     | Keep raw tool output in sandbox (FTS5) to protect context window                                                                  | `ctx_batch_execute`, `ctx_search`, `ctx_execute` for >20-line outputs                          |
| `mcp__plugin_context7-plugin_context7__*`            | plugin `context7-plugin`                                                  | Live third-party library docs                                                                                                     | Any library/framework question (**Rule 6**)                                                    |
| `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*` | plugin `chrome-devtools-mcp`                                              | Duplicate namespace — **fails on Jetson aarch64** (defaults to `/opt/google/chrome/chrome`)                                       | Ignore on Jetson; prefer user-scope `mcp__chrome-devtools__*`                                  |

#### context-mode — enforcement reality

context-mode's `<context_window_protection>` system-reminder tells the agent to route Bash output >20 lines through `ctx_execute`. **The hook does not enforce this — it is pure prompt guidance, model-enforced only.** The PreToolUse hook (`hooks/core/routing.mjs` in upstream `mksglu/context-mode`) only rewrites three Bash pattern families: `curl`/`wget` without file redirect, inline HTTP (`fetch()` / `requests.*` / `http.get()`) in `bash -c`/heredoc, and `gradle`/`mvn`/`./gradlew`/`./mvnw`. It unconditionally denies `WebFetch` and appends routing guidance to `Agent` prompts. Everything else (including `npm run build`, `cat bigfile.log`, `tail`) passes through with at most a one-time session nudge. There is **zero size/token/line logic** in the hook — PreToolUse fires before execution, so output size is not even observable. `Write`/`Edit`/`Glob`/`NotebookEdit` are not hooked at PreToolUse at all. An agent that runs high-volume Bash directly will not be blocked; self-discipline per the system-reminder is the only gate.

### Project-scoped (requires `npm run dev` on :5173)

| Server                     | Purpose                                | When to use                    |
| -------------------------- | -------------------------------------- | ------------------------------ |
| `tailwindcss`              | Tailwind CSS v4 tooling                | Any CSS/styling work           |
| `argos-system-inspector`   | Live system metrics, process state     | Diagnosing RPi resource issues |
| `argos-database-inspector` | SQLite schema, query execution, health | Any database work              |
| `argos-api-debugger`       | Live API endpoint testing              | Debugging API routes           |

These servers hit `localhost:5173` via HTTP; they cannot import SvelteKit internals. If the app runs via `argos-final.service` (`node build`), only HTTP API routes are available — Vite dev middleware (e.g. the terminal `/terminal-ws` plugin) is absent.

### On-Demand Profiles (`--mcp-profile <name>`)

| Profile    | Servers added                                                         | Use case                         |
| ---------- | --------------------------------------------------------------------- | -------------------------------- |
| `hardware` | `hardware-debugger`                                                   | HackRF, GPS, USB hardware issues |
| `full`     | `hardware-debugger`, `streaming-inspector`, `gsm-evil`, `test-runner` | Full diagnostic suite            |

### Jetson aarch64 — chrome-devtools wiring (non-obvious)

Google does NOT ship Chrome for aarch64 Linux. Snap Chromium is the only browser. Plugin-shipped chrome-devtools MCP launches `/opt/google/chrome/chrome` by default → fails. Fix path on Jetson:

```bash
# 1. Pre-launch headless snap Chromium with remote debugging
/snap/bin/chromium --headless=new --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chromium-debug-profile" --no-first-run --disable-gpu &

# 2. Verify
curl -s http://127.0.0.1:9222/json/version | head

# 3. Register user-scope MCP that connects to the running instance (official docs/troubleshooting.md § sandboxes)
claude mcp add -s user chrome-devtools -- npx -y chrome-devtools-mcp@latest \
  --browserUrl http://127.0.0.1:9222

# 4. /reload-plugins — plugin-scope namespace still fails, but user-scope `mcp__chrome-devtools__*` now works
```

The `--browserUrl` flag is camelCase (per `npx chrome-devtools-mcp --help`), not kebab-case despite what some README examples show.

## Installed Plugins

Verify with `/plugin list`. Install more with `/plugin install <name>` (marketplace must be added first via `/plugin marketplace add <repo>`).

| Plugin                | Marketplace                          | Provides                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `context-mode`        | `context-mode`                       | MCP server (ctx\_\*) + skills `ctx-stats`, `ctx-doctor`, `ctx-upgrade`, `ctx-insight`, `ctx-purge`, `context-mode-ops`                                                                                                                                                                                                                                                               |
| `claude-mem`          | `thedotmack`                         | MCP server (smart_search, timeline) + skills `mem-search`, `smart-explore`, `make-plan`, `do`, `knowledge-agent`, `timeline-report`, `version-bump`                                                                                                                                                                                                                                  |
| `caveman`             | `caveman`                            | Token-compression skills `caveman`, `caveman-review`, `caveman-commit`, `compress`, `caveman-help`                                                                                                                                                                                                                                                                                   |
| `superpowers`         | `claude-plugins-official`            | Rigorous workflow skills — `brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `using-git-worktrees`, `dispatching-parallel-agents`, `writing-skills`, `requesting-code-review`, `receiving-code-review`, `verification-before-completion`, `subagent-driven-development`, `finishing-a-development-branch`, `using-superpowers` |
| `context7-plugin`     | `context7-marketplace`               | MCP server for library docs + skills `context7-mcp`, `context7-cli`, `find-docs`                                                                                                                                                                                                                                                                                                     |
| `coderabbit`          | `claude-plugins-official`            | Skills `code-review`, `autofix` — run AI review on diffs                                                                                                                                                                                                                                                                                                                             |
| `chrome-devtools-mcp` | `ChromeDevTools/chrome-devtools-mcp` | MCP server (duplicate namespace — see Jetson note above) + skills `chrome-devtools`, `troubleshooting`, `debug-optimize-lcp`, `a11y-debugging`, `memory-leak-debugging`, `chrome-devtools-cli`                                                                                                                                                                                       |
| `svelte-skills`       | `spences10/svelte-skills-kit`        | 10 passive skills — `svelte-runes`, `svelte-components`, `svelte-styling`, `svelte-template-directives`, `sveltekit-data-flow`, `sveltekit-remote-functions`, `sveltekit-structure`, `svelte-deployment`, `layerchart-svelte5`, `ecosystem-guide`                                                                                                                                    |

### How to use plugins properly

- **Slash commands vs skills**: Some plugins expose slash commands (`/caveman`, `/ctx-stats`). Others are pure SKILL files that activate via keyword match. Ask `/plugin list` if uncertain.
- **Skill invocation**: Call `Skill` tool with the name shown in the system-reminder `available-skills` list. Don't guess names — names not in that list will fail.
- **MCP vs skill**: MCP = live tool calls that return data. Skill = prompt-time instructions loaded into context. Use MCP for data, skill for workflow discipline.
- **Reload after edits**: Editing any plugin config or `.claude.json` requires `/reload-plugins` to respawn MCP server subprocesses with new args. Plain config reload does not update already-running subprocesses — kill stale `pgrep chrome-devtools-mcp` procs if needed.

## Svelte MCP + LSP

When working with Svelte or SvelteKit code, you MUST use the `svelte` plugin's tools in this order. Plugin source: `sveltejs/ai-tools` marketplace, plugin name `svelte`, v1.0.4+. One-time setup: `npm i -g svelte-language-server` (provides the `svelteserver` binary the LSP wires to).

1. **`LSP findReferences`** (PRE-edit) — Lock the blast radius of any modified type / interface / exported symbol. Returns the authoritative consumer set from the language-server-parsed AST. Beats grep — won't miss aliases, shorthand, or test/story consumers. Args: `(operation: "findReferences", filePath, line, character)` — line/character both 1-based as shown in editors.
2. **`mcp__plugin_svelte_svelte__list-sections`** — Call to discover relevant doc sections. Analyze the `use_cases` field to identify what to fetch. Skip if the change is purely structural (data-shape, not Svelte-idiom).
3. **`mcp__plugin_svelte_svelte__get-documentation`** — Fetch ALL relevant sections. Token-expensive per the tool's own description; only call after autofixer flags something you can't immediately fix.
4. **`mcp__plugin_svelte_svelte__svelte-autofixer`** — MUST run on all Svelte code before sending to user. Keep calling until `issues: []`. Suggestions about `$effect` calling functions can be acknowledged-and-ignored if the function is verifiably non-mutating; the autofixer self-flags these as low-confidence.
5. **`LSP hover`** (POST-edit) — Confirm TypeScript narrowed correctly on a sample of the migrated consumer sites. One LSP call per site beats running `svelte-check` (~650 MB RAM, 30+ s).
6. **`mcp__plugin_svelte_svelte__playground-link`** — Ask user if they want one ONLY when no project file was modified. NEVER generate when code was written to project files (the tool description forbids it).

## Tactical AI Kill Chain Framework

The `tactical/` directory contains an autonomous pentesting framework with **82 Python modules** wrapping Kali Linux security tools, **13 workflow playbooks**, and a TypeScript module runner. For tactical operations (scanning, exploitation, AD attacks, OSINT, forensics, SDR/SIGINT), read the full agent context:

IMPORTANT: READ tactical/CLAUDE.md before any tactical/security work. It contains the complete module inventory, workflow list, database schema, and execution rules.

```bash
# Execute any tactical module
npx tsx tactical/modules/module_runner.ts <module> [args...]

# List all 82 available modules
npx tsx tactical/modules/module_runner.ts --runner-help

# Read a workflow playbook before executing
cat tactical/workflows/<ID>_<name>.md
```

## Commands

```bash
# Dev server (tmux + OOM protection)
npm run dev              # Start in tmux session with oom_score_adj=-500
npm run dev:simple       # Direct vite start (no tmux, lower memory limit)
npm run dev:clean        # Kill existing + restart fresh
npm run dev:logs         # Tail dev server output

# Build & check
npm run build            # Production build (catches errors tsc alone misses)
npm run typecheck        # svelte-check + tsc (uses ~650MB RAM — never run concurrent instances)
npm run lint             # ESLint with config/eslint.config.js
npm run lint:fix         # Auto-fix

# Testing
npx vitest run src/path/to/file.test.ts     # Single test file
npm run test:unit                            # All unit tests (src/ + tests/unit/)
npm run test:integration                     # tests/integration/
npm run test:security                        # tests/security/
npm run test:e2e                             # Playwright (config/playwright.config.ts)
npm run test:all                             # unit + integration + visual + performance

# Database
npm run db:migrate       # Run SQLite migrations
npm run db:rollback      # Rollback last migration

# File-scoped verification (use these before committing)
npx tsc --noEmit src/lib/FILE.ts
npx eslint src/lib/FILE.ts --config config/eslint.config.js
npx vitest run src/lib/FILE.test.ts

# Serena (installed via uv tool, connected via claude mcp add user scope)
uv tool upgrade serena-agent --prerelease=allow   # Update Serena to latest
export MCP_TIMEOUT=60000                          # Raise MCP boot timeout if Serena LSP slow on first init
```

## Architecture

**Argos is a SvelteKit SDR & Network Analysis Console** deployed natively on Raspberry Pi 5 (Kali Linux). No Docker for the main app — Docker is only for third-party tools (OpenWebRX, Bettercap).

### Key Patterns

- **Fail-closed auth**: `ARGOS_API_KEY` required (min 32 chars), system exits without it. All `/api/*` routes (except `/api/health`) require `X-API-Key` header or HMAC session cookie.
- **Zod-validated env**: `src/lib/server/env.ts` validates all env vars at startup via Zod. Process exits on parse failure.
- **Direct SQLite**: `better-sqlite3` with WAL mode, no ORM. Migrations in `scripts/db-migrate.ts`. Repository pattern in `src/lib/server/db/`.
- **Security middleware stack** in `src/hooks.server.ts`: Auth gate → Rate limiter (200/min API, 30/min hardware) → Body size limiter → CSP headers → Event loop monitor.
- **MCP servers** (`src/lib/server/mcp/`): Communicate with the running app via HTTP API (localhost:5173) — they cannot import SvelteKit internals.
- **OpenTelemetry opt-in**: OTel SDK gated behind `OTEL_ENABLED=1`. Default off. All OTel imports are dynamic inside the gate — static imports cause `ERR_AMBIGUOUS_MODULE_SYNTAX` because `require-in-the-middle` (used by OTel auto-instrumentation) intercepts `better-sqlite3` and confuses ESM/CJS boundaries. See `src/instrumentation.ts`.

### Data Flow

```
Hardware (HackRF/Alfa/GPS)
  → src/lib/server/services/        # Hardware/protocol services (native CLI wrappers)
  → src/lib/server/hardware/        # Hardware detection & monitoring
  → src/routes/api/*/+server.ts     # REST API endpoints (createHandler factory)
  → WebSocket (src/hooks.server.ts) # Real-time push via WebSocketManager
  → src/lib/stores/                 # Client-side Svelte stores (Zod-validated)
  → src/lib/components/             # UI components (Svelte 5 runes)
```

### Source Layout

```
src/
├── routes/                    # SvelteKit file-based routing
│   ├── api/                   # 36 API domains (hackrf, kismet, gsm-evil, gps, tak, etc.)
│   ├── dashboard/             # Dashboard page
│   ├── gsm-evil/              # GSM monitoring page
│   └── +page.svelte           # Root page
├── lib/
│   ├── server/                # Server-only code (223 files)
│   │   ├── auth/              # Fail-closed API key + HMAC session cookie
│   │   ├── api/               # createHandler factory + error utilities
│   │   ├── security/          # Rate limiter, CORS, input sanitizer, audit log
│   │   ├── middleware/        # Rate limit, security headers, WS handler
│   │   ├── db/                # RFDatabase facade, repositories, migrations, cleanup
│   │   ├── hardware/          # HardwareRegistry, ResourceManager, detection
│   │   ├── hackrf/            # SweepManager: process lifecycle, frequency cycling
│   │   ├── kismet/            # KismetProxy, WebSocketManager, FusionController
│   │   ├── services/          # gps/, gsm-evil/, kismet/, cloudrf/, cell-towers/, bluehood/, wigletotak/
│   │   ├── tak/               # TakService, SA broadcaster, cert manager
│   │   ├── gsm/               # GSM L3 decoder (pure, no process spawning)
│   │   ├── mcp/               # 7 MCP servers + dynamic server + API client
│   │   └── agent/             # AgentRuntime + tool dispatch (Claude Sonnet 4)
│   ├── components/            # Svelte 5 components (136 files, 10 families)
│   ├── stores/                # 23 Svelte stores (Zod-validated, legacy + runes)
│   ├── types/                 # TypeScript type definitions
│   ├── schemas/               # Zod validation schemas
│   ├── websocket/             # Client-side WebSocket base class + reconnect
│   └── utils/                 # Logger, geo, MGRS, validation
├── hooks.server.ts            # Auth, rate limiting, WebSocket, CSP, ELD monitor
└── hooks.client.ts            # Client-side error handling
config/                        # Vite, ESLint, Playwright, terminal plugin configs
tests/                         # unit/, integration/, security/, e2e/, visual/, performance/
scripts/ops/                   # setup-host.sh (provisioning), install-services.sh, keepalive
deployment/                    # Systemd service files (10 services)
native/apm-runner/             # Navy APM propagation model (C + fork isolation)
tactical/                      # AI kill chain framework (82 modules, 13 workflows)
_bmad-output/                  # Audit + remediation artifacts (read-only reference)
docs/                          # General documentation
specs/                         # Feature specifications (016-025)
plans/                         # Architecture plans and roadmaps
```

## Code Conventions

**TypeScript strict mode** is non-negotiable. No `any` (use `unknown` + type guards). No `@ts-ignore` without issue ID.

**Naming**: camelCase (vars/funcs), PascalCase (Types/Components), UPPER_SNAKE_CASE (constants), kebab-case (files). Booleans use `is/has/should` prefix.

**No barrel files** (`index.ts`) except for `src/lib/components/ui/` (shadcn-svelte). Import directly from the source file.

**No catch-all utils files** (`utils.ts`, `helpers.ts`). Place utility functions in domain-specific modules.

**File limits**: Max 300 lines/file, max 50 lines/function. Single responsibility per file. **Mechanically enforced** as of 2026-05-04 by ESLint `max-lines` + `max-lines-per-function` (warn-only initially while 158 day-1 violators are baselined; promote to error per `docs/ci-cd-pipeline-spec.md` Migration Roadmap item 13).

**Cyclomatic complexity ≤ 5, cognitive complexity ≤ 5, CRAP score ≤ 30.** Enforced in two layers per `docs/ci-cd-pipeline-spec.md` §3.17:

- **ESLint** (`config/eslint.config.js`): `complexity` + `sonarjs/cognitive-complexity` rules — error-blocking, TS/Svelte only. Drops at 2026-05-18 cutover.
- **Fallow** (`.fallowrc.json` + `.husky/pre-{commit,push}` + `.github/workflows/fallow.yml`): Rust-based, Oxc-parser, baseline-aware. Adds CRAP, semantic dupes, cross-module dead-code (none of which ESLint covers). Day-1 baselines (`.fallow-{deadcode,health,dupes}-baseline.json`) grandfather pre-existing findings (244 complexity, 129 dupe groups, 223 dead exports). New code blocks at 5/5; existing code grandfathered.
- **Per-developer Claude PreToolUse gate**: auto-installed by `package.json` `prepare` script via `fallow hooks install --target agent --agent claude`. Blocks Claude `git commit`/`git push` when fallow audit verdict is `fail`.

`.svelte` files are excluded from fallow's dead-code detector (ROADMAP false-positive on `export let` props). `static/**` excluded (vendored WebTAK).

**Error handling**: Explicit handling for all external operations. Typed error classes. No swallowed errors. User-visible errors must suggest corrective action.

**Component state handling**: Every component must handle ALL states: Empty, Loading, Default, Active, Error, Success, Disabled, Disconnected.

## Design System Authority

**IBM Carbon Design System is the canonical methodology authority for Argos v2 (Mk II) component conventions.** Lunaris remains the visual identity (color palette, typography choices, layout chrome, military-tactical aesthetic). Geist remains the typeface. Carbon supplies the per-component conventions (alignment, spacing rhythm, sort behavior, accessibility patterns) that all visual surfaces conform to.

**Three reference surfaces** under `docs/` (gitignored — recreate locally on demand per `specs/026-lunaris-design-system/spec.md`):

| Path                                           | Role                                                       | Precedence                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `docs/carbon-design-system/` (sparse-checkout) | Carbon SCSS + React + themes source-of-truth               | **Wins** when source disagrees with site docs (last-modified date is the tiebreaker) |
| `docs/carbon-website/` (full clone)            | Carbon usage / a11y / style mdx docs                       | Provides context but never overrides source SCSS                                     |
| `docs/argos-v2-mockup/` (extracted user zip)   | Argos v2 visual layout reference + screenshot ground-truth | Visual identity wins on look-and-feel; Carbon wins on methodology/anatomy            |

**Per-component spec structure** at `specs/026-lunaris-design-system/components/<name>/{usage.md, style.md, code.md, accessibility.md}` — modeled on Carbon's docs site. Spec citations live in `authorities.md`. Token mappings live in `tokens.md`. Migration roadmap (8 phases) in `migration-roadmap.md`.

**Workflow rule** (per memory `feedback_lunaris_spec_first.md`): no visual / behavioral component change ships without first writing or updating the matching `style.md` citing Carbon source. Implementation references the spec.

**Stack**: `carbon-components-svelte@^0.107.0` (Svelte 5 supported), `@carbon/styles@^1.105.0`, `carbon-icons-svelte@^13.10.0`. Theme overlay file at `src/lib/styles/lunaris-carbon-theme.scss` translates Carbon Sass tokens to Lunaris CSS custom properties.

## Design System — Lunaris

The UI follows the **Lunaris design language** — a military-grade enterprise dashboard aesthetic (not cyberpunk). The definitive visual reference is `pencil-lunaris.pen` and the spec at `specs/012-lunaris-ui-redesign/design-reference.md`.

**Dark mode only**. Light mode removed.

### Color Architecture

Three layers in `src/app.css` (`:root` block), with shared utilities in `src/lib/styles/dashboard-utilities.css`:

- **Surface tokens**: `--background` (#111111), `--card` (#1A1A1A), `--border` (#2E2E2E) — deep black base with subtle layered depth
- **Accent**: Steel blue (#A8B8E0 default, Blue ★) — swappable via `--primary` across 13 MIL-STD palette themes. Used for brand text, progress bars, active indicators, AP markers
- **Semantic status** (independent of accent): Healthy #8BBFA0 (muted sage), Warning #D4A054 (warm gold), Error #FF5C33 (high-vis) / #C45B4A (desaturated panel), Inactive #555555

All colors must reference design tokens — no hardcoded hex in component markup. Status colors are always desaturated to harmonize with the dark theme. Color must never be the sole status indicator — always pair with a text label.

### Typography

Dual-font system, not monospace-only:

- **Fira Code** (monospace): ALL data — metrics, labels, IPs, coordinates, status text, section headers, command bar
- **Geist** (sans-serif): Tab labels, UI navigation chrome, weather text only

Six-step size scale: 24px (hero metrics) → 13px (brand) → 12px (secondary data) → 11px (primary rows) → 10px (status text) → 9px (section headers, UPPERCASE with letter-spacing 1.2+)

### Layout Structure

48px icon rail → 280px overview panel → fill map area → 240px bottom panel. 40px command bar fixed top. All spacing uses consistent tokens — no ad-hoc pixel values.

### Icons

Lucide for all navigation and status icons. Material Symbols Sharp for the bottom panel collapse caret only.

## Platform Constraints

**Target hardware**:

- **Primary**: Raspberry Pi 5 (8GB RAM, ARM Cortex-A76) on Kali Linux.
- **Active port** (branch `install/jetson-port`): NVIDIA Jetson AGX Orin on Ubuntu 22.04 (aarch64). Jetson-specific quirks live in `jetson-port-notes.md`. Key deltas: CPU temp must read `/sys/class/thermal/thermal_zone*/temp` first (hwmon paths differ); HDMI boot needs explicit `modprobe nvidia-drm`; TigerVNC xstartup patched to surface snap-packaged Chromium; sudo pw documented in user memory.

Memory is scarce on both platforms.

**OOM risk**: `svelte-check` uses ~650MB. Never run multiple instances concurrently. The `git-quality-gate.sh` hook runs typecheck before commits; no auto-typecheck on every edit.

**Performance budgets**: WebSocket messages < 16ms processing. Initial load < 3s. < 200MB heap. < 15% CPU. Use WebSockets over polling.

**Native execution**: Argos runs directly on the host OS, not in Docker. `src/lib/server/exec.ts` provides `execFileAsync()` for safe child process execution (no shell, argument arrays only).

## Git Workflow

**Branch naming**: `feature/NNN-feature-name` or `NNN-feature-name`.

**Commits**: One commit per task. Format: `type(scope): TXXX — description`. Never commit broken code.

**Forbidden**: WIP commits, mega commits, generic messages, force-push.

**Spec-kit workflow**: Features follow `spec.md` → `plan.md` → `tasks.md` in `specs/NNN-feature-name/`. CLAUDE.md is auto-updated by `.specify/scripts/bash/update-agent-context.sh` — but this file is protected by the SKIP AUTO-UPDATE marker above.

## Dependencies

No `npm install` without user approval. Pin exact versions. No ORMs. No CSS frameworks beyond Tailwind. No state management libraries (Redux/Zustand). No lodash.

**Native addons must stay in `dependencies`, NOT `devDependencies`.** This includes `better-sqlite3` and `node-pty`. `@sveltejs/adapter-node` externalizes only `dependencies` at build time; anything in `devDependencies` gets bundled into the ESM server chunk, which breaks native addons that expect CJS globals (`__filename`, `__dirname`). Symptom: `ReferenceError: __filename is not defined` at server startup.

<!-- MANUAL ADDITIONS END -->

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:

- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
