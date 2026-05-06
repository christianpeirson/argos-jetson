# Mandatory Workflow Rules

These rules are non-negotiable. Loaded into every Claude Code session at launch with the same priority as `.claude/CLAUDE.md` (per the official `.claude/rules/` contract — Anthropic memory doc: "Rules without `paths` frontmatter are loaded at launch with the same priority as `.claude/CLAUDE.md`").

## Rule 1 — Chrome DevTools for Frontend Debugging

When debugging any frontend, UI rendering, network, or browser-side issue: use the `chrome-devtools` MCP server BEFORE writing speculative fixes. Inspect DOM state, console errors, network requests, and performance traces in the actual running app. Do not guess at UI bugs — observe them first.

## Rule 2 — claude-mem Prior Work Check

Before beginning any significant task, search claude-mem (`smart_search`) to check if this work (or equivalent) has been done in prior sessions. This prevents duplicate effort and surfaces prior decisions, failed approaches, and context that would otherwise be lost.

## Rule 3 — Svelte MCP + LSP on every .svelte edit

Before writing or changing any Svelte component, call `mcp__plugin_svelte_svelte__list-sections` → `get-documentation` → `svelte-autofixer`. Do not send Svelte code to the user unless `svelte-autofixer` returns clean. **Plus** for any modified type / interface / exported symbol, run `LSP findReferences` (svelteserver via the `svelte` plugin) PRE-edit to lock the consumer set, and `LSP hover` POST-edit to confirm type narrowing — beats grep + faster than `svelte-check`.

### Svelte MCP + LSP sequence

Plugin source: `sveltejs/ai-tools` marketplace, plugin name `svelte`, v1.0.4+. One-time setup: `npm i -g svelte-language-server` (provides the `svelteserver` binary the LSP wires to).

1. **`LSP findReferences`** (PRE-edit) — Lock the blast radius of any modified type / interface / exported symbol. Returns the authoritative consumer set from the language-server-parsed AST. Beats grep — won't miss aliases, shorthand, or test/story consumers. Args: `(operation: "findReferences", filePath, line, character)` — line/character both 1-based as shown in editors.
2. **`mcp__plugin_svelte_svelte__list-sections`** — Call to discover relevant doc sections. Analyze the `use_cases` field to identify what to fetch. Skip if the change is purely structural (data-shape, not Svelte-idiom).
3. **`mcp__plugin_svelte_svelte__get-documentation`** — Fetch ALL relevant sections. Token-expensive per the tool's own description; only call after autofixer flags something you can't immediately fix.
4. **`mcp__plugin_svelte_svelte__svelte-autofixer`** — MUST run on all Svelte code before sending to user. Keep calling until `issues: []`. Suggestions about `$effect` calling functions can be acknowledged-and-ignored if the function is verifiably non-mutating; the autofixer self-flags these as low-confidence.
5. **`LSP hover`** (POST-edit) — Confirm TypeScript narrowed correctly on a sample of the migrated consumer sites. One LSP call per site beats running `svelte-check` (~650 MB RAM, 30+ s).
6. **`mcp__plugin_svelte_svelte__playground-link`** — Ask user if they want one ONLY when no project file was modified. NEVER generate when code was written to project files (the tool description forbids it).

## Rule 4 — GitHub Access via github-mcp-server Only (HARD-LOCKED)

For ANY GitHub API operation: use `mcp__github__*` tools (github-mcp-server, remote at `https://api.githubcopilot.com/mcp`) ONLY. Mechanically enforced — `mcp__octocode__github*` is in `.claude/settings.json` `permissions.deny` AND blocked by PreToolUse hook `scripts/claude-hooks/block-octocode-github.sh`. `gh` CLI is gated by hook `scripts/claude-hooks/gh-cli-restrict.sh` to a narrow allow-list. `WebFetch` on `github.com/*` is blocked by global hook `~/.claude/hooks/github-url-block.sh`.

**Routing matrix:**

| Operation                        | Tool                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Read repo file/structure/history | `mcp__github__get_file_contents` / `list_commits` / `list_branches`                                                            |
| Search code/PRs/issues           | `mcp__github__search_code` / `search_pull_requests` / `search_issues`                                                          |
| PR create/read/update/merge      | `mcp__github__create_pull_request` / `pull_request_read` / `update_pull_request` / `merge_pull_request` / `list_pull_requests` |
| PR review                        | `mcp__github__pull_request_review_write` / `add_comment_to_pending_review` / `add_reply_to_pull_request_comment`               |
| Issues                           | `mcp__github__issue_write` / `issue_read` / `add_issue_comment` / `list_issues`                                                |
| Branches (remote)                | `mcp__github__create_branch` / `list_branches`                                                                                 |
| Releases / tags                  | `mcp__github__list_releases` / `get_latest_release` / `get_release_by_tag` / `list_tags` / `get_tag`                           |
| CI / runs                        | `mcp__github__` actions toolset                                                                                                |

**`gh` CLI allow-list** (gaps github-mcp-server doesn't cover):

- `gh workflow run|list|view` — workflow dispatch (github MCP `actions` toolset is read-only re: dispatch)
- `gh secret set|list|delete` — secret management (no MCP surface)
- `gh auth status|login|logout` — auth probe

Anything else (`gh pr`, `gh issue`, `gh api`, `gh release`, `gh repo`, `gh run`) is denied by the hook.

**`git` CLI** is fully allowed for local working-tree ops (commit, push, fetch, pull, branch, rebase, checkout, tag) — github MCP cannot replace local git.

**Bash hooks** (`scripts/claude-hooks/*.sh`) MAY use any `gh` subcommand internally because hooks run in bash and have no access to MCP tools. They bypass `gh-cli-restrict.sh` by setting `CLAUDE_HOOK_INTERNAL=1` before invoking `gh` (see `scripts/claude-hooks/post-push-pr-flow.sh`).

**octocode** is kept ONLY for `lsp*` (LSP findReferences/hover/gotoDefinition/callHierarchy) and `local*` (localFindFiles/localSearchCode/localGetFileContent/localViewStructure) namespaces — these are NOT GitHub operations and are out of scope.

Source-of-truth: official `github/github-mcp-server` README + `docs/` (16 toolsets, 50+ tools, `--toolsets` / `--read-only` flags, OAuth + PAT auth, gaps documented for workflow-dispatch + secret-write).

## Rule 5 — Docs via Context7 before WebFetch

For ANY question about a third-party library, framework, SDK, or CLI tool (React, SvelteKit internals, Puppeteer, node-pty, better-sqlite3, etc.): call `mcp__plugin_context7-plugin_context7__resolve-library-id` then `query-docs`. Only fall back to `WebFetch` if context7 has no entry for the library. This avoids stale training-data answers.

## Rule 6 — Sentrux session bracketing on every PR

Every PR is bracketed by sentrux. Bracketing is **per-branch**, not per-phase or per-commit. Under the batched-commit cadence (Rule 10), `session_start` fires ONCE at branch creation and `session_end` + `rescan` + `check_rules` fire ONCE pre-merge — even when the branch contains multiple phases worth of commits. Mid-session optional rescan is allowed after structurally-risky phases (chassis additions, deletions of >5 files) but is not required.

1. **Worktree entry / branch refresh**: when starting work in `Argos-session-N` (or after a fresh `scripts/ops/spin-worktree.sh <slug>`), call `mcp__plugin_sentrux_sentrux__session_start` (captures pre-change graph baseline).
2. **Pre-merge**: before `mcp__github__merge_pull_request` (mergeMethod: "squash"), call in order:
    - `mcp__plugin_sentrux_sentrux__rescan` (re-walk after final commit)
    - `mcp__plugin_sentrux_sentrux__session_end` (delta report)
    - `mcp__plugin_sentrux_sentrux__check_rules` (must pass `.sentrux/rules.toml`)
3. **`quality_signal` must NOT regress** vs the baseline recorded in `project_sentrux_baseline.md` (Day-0 = 5401). Regressions block merge unless explicitly approved by the user with a follow-up issue filed.

The `.sentrux/rules.toml` enforces `max_cycles = 0` + layer ordering (routes → components → client_state → server → utils → types) + 4 hard `from→to` boundaries. CC and fn-line checks are deferred until sentrux ships per-language dispatch (see baseline memory for v0.5.7 limitation).

## Rule 7 — CI/CD pipeline edits reference the canon spec

Before any change to `.github/workflows/`, `.husky/`, `package.json` scripts, `.trunk/`, `.lintstagedrc.json`, `commitlint.config.mjs`, `dangerfile.js`, or `config/eslint.config.js`: **read `docs/ci-cd-pipeline-spec.md` first**. It is the canonical pipeline reference (per-tool config, gate-matrix-with-canonical-owner, edge-case handling, decision log). All citations live there — don't re-derive them. If a proposed change isn't represented in the spec, AMEND the spec in the same PR. Once the L3 audit script (`scripts/ops/audit-pipeline-config.sh`, ships in PR-AUD-1b) and audit workflow are merged, drift will be enforced mechanically on every pipeline-touching PR + nightly cron. Until then, this rule is a Claude-session discipline check. Rationale: per `feedback_pro_architecture_playbook.md` Tuning-vs-architectural section + memory `feedback_mechanical_enforcement_over_audit.md` — mechanical gates catch drift that human / Claude audits miss.

## Rule 8 — Explain-as-you-go in plain terms with full-stack context

User has explicitly instructed: explain every command, tool, library, and concept inline as work progresses. Default to "user has zero prior knowledge" framing — define keywords inline the first time they appear in a session (`systemctl`, `MCP server`, `pre-commit hook`, `Carbon Design System`, etc.), open every meaningful action with a one-sentence "what + why" framing, and place each step in stack / OSI-layer / project-phase context (e.g., "Layer 7 HTTP endpoint", "build pipeline pre-bundle stage", "Phase 3c of the 8-phase Carbon migration on branch `feature/spec-026-carbon-phase-3c-checkbox`"). Use numbered step + indented sub-step format for non-trivial sequences. When errors fire, explain what the subsystem does and what surface-vs-root-cause means BEFORE proposing the fix. Caveman-mode terseness is suspended for explanatory passages — full sentences with definitions beat fragment shorthand here.

**Three reinforcements added 2026-04-29 after first day of operation:**

1. **Keyword highlighting.** Bold the keyword the FIRST time it's defined in a turn (`**ESLint cache**`); keep code identifiers / commands / file paths in backticks. Bold + backticks together give the eye an anchor.
2. **Default to deep explanations, not glosses.** A definition gets 4–8 sentences covering (a) what it literally is, (b) which subsystem owns it, (c) mechanical steps of how it works, (d) why it matters for Argos specifically, (e) where it lives on disk if applicable. One-line glosses are too thin — user has stated explanations must be "pretty detailed."
3. **Refresh the phase board after every completed phase.** When a PR squash-merge completes a phase or sub-phase (3a → 3b → 3c → 3d → 3e → 3f, or Phase 1 → 2 → 3, etc.), present the FULL updated phase table (Phase / Component / Status / PR / Date) — not just "Phase X done." Include the explicit "next step + engineering reasoning for why" for the upcoming row. User stated: _"I need to see an update to our overall plan once a phase is complete."_

Full pattern catalogue + counter-examples + edge cases in user memory `feedback_explain_as_you_go.md`. Rationale: user stated _"the way you explain it, it has to be extremely simple. like i have no idea what your doing when you run a long bash command etc, you really have to break things down clearly"_ — non-negotiable preference; failure to explain is failure to deliver even when the technical work is correct.

## Rule 9 — Parallel work during background dispatches (no idle waits)

When ANY of these bg-trigger patterns fires in a turn, the SAME turn MUST include BOTH a one-shot status check AND ≥1 parallel-safe action. **Ending a turn with a bg job pending and zero parallel work dispatched is a non-negotiable user-flagged lint violation** — treat with the same severity as committing broken code.

**Trigger patterns** (auto-fire the rule):

- `run_in_background: true` on `npm run build|test:*|typecheck`, `git commit` (quality-gate ≈ 2-3 min), `mcp__github__create_pull_request`, `mcp__github__merge_pull_request`, any `Agent` dispatch
- `ScheduleWakeup({ delaySeconds > 60 })`
- `mcp__github__pull_request_read` / `list_pull_requests` showing PR awaiting CR / CI checks
- `mcp__plugin_sentrux_sentrux__rescan` on a >50K-line repo

**Same-turn obligation** (do all three):

1. **One-shot status check** — execute `tail -3 /tmp/<log>` + `pgrep -af <proc>` + (if applicable) `mcp__github__pull_request_read({ method: "get", pullNumber: N })` for status-check rollup. Combine bash probes as ONE invocation (chain with `&&` / `;` / `echo ---`). NOT split across turns. NOT a wait loop. NOT `until ... sleep ... done`. The hook at `scripts/claude-hooks/post-push-pr-flow.sh:46` uses a bash-internal `gh pr view --json number,state,baseRefName` because hooks have no MCP access (workflow Rule 4 carve-out, hook sets `CLAUDE_HOOK_INTERNAL=1`).

2. **Dispatch ≥1 parallel-safe action** from the Lightweight Parallel-Safe Ops list. Always-available examples:
    - **Memory + plan + commit-message + PR-body writes** to `~/.claude/projects/.../memory/*.md`, `plans/*.md`, `/tmp/*.md`
    - **Source reads** via Read/Grep/Glob (the autofixer reminder about symbolic tools is token-efficiency guidance, NOT a parallel-work blocker)
    - **Doc fetches** via `mcp__plugin_context7-plugin_context7__*`, `mcp__octocode__*`, `WebFetch` to vendor docs
    - **Hardware/service probes** — `lsusb`, `systemctl status`, `ss -tnlp`, `curl -sf http://localhost:5173/api/health`
    - **Worktree + symlink setup** — `git worktree add -b ...`, `ln -s node_modules .env`, `npx svelte-kit sync`
    - **GitHub status checks** — `mcp__github__pull_request_read`, `mcp__github__list_pull_requests`, `mcp__github__` actions toolset
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

**Cadence-coupling note** (added with Rule 10): under batched-commit cadence the `mcp__github__create_pull_request` + CR-loop bg dispatches happen ONCE at end-of-day, not per-phase. The per-phase parallel-work obligation is therefore reduced — between phases, the assistant runs local quality gates (eslint + selective svelte-check) and waits at the `keep going / commit` checkpoint prompt for user input. The Rule 9 obligation continues to apply at end-of-day when `npm run build` + `git push` + `mcp__github__create_pull_request` + CR poll fire.

## Rule 10 — Batched-commit cadence (default for multi-phase work)

Default cadence for any multi-phase migration / multi-PR cleanup / multi-task feature work: **batch commits into one end-of-day PR**. Per-phase PR is the EXCEPTION, not the default. Per-phase PRs paid ~10-15 min wall-clock overhead each (build + CI + CR + wakeup loops + memory writes) regardless of code size — batching collapses N PR overheads into 1 while preserving in-PR commit granularity for bisect.

**Per-phase loop** (mid-day, before any commit):

1. Code the phase (chassis wrapper / site migrations / spec docs / roadmap update).
2. Run local quality gates: `npx eslint <touched-files> --config config/eslint.config.js`; `npx svelte-check` only if structural type changes.
3. Self-verify the diff.
4. **Stop. Print the checkpoint prompt** (template below).
5. **Wait for user**: `keep going` → loop. `commit` → end-of-day commit + push + PR sequence.

**Checkpoint prompt** (non-skippable, exact format):

```text
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
7. **PRE-PR LOC GATE** — run `git diff --stat origin/dev...HEAD | tail -1`. If `(insertions + deletions) > 2000`, **STOP**. Do NOT open one mega-PR. Split bundle along phase boundaries into N session-N PRs, each ≤2000 LOC, opened/merged sequentially. See `feedback_no_admin_bypass_daily_loc_cap.md` for the split protocol. Admin-bypass on session-N → dev PRs is **FORBIDDEN**.
8. `mcp__github__create_pull_request` with body listing all bundled phases + per-phase commit SHAs + sentrux delta. (Repeat per split slice.)
9. CR loop per `feedback_pr_wait_pattern.md` — `ScheduleWakeup ~270s` then dual-check `mcp__github__pull_request_read` (status-check rollup) AND CR reviewThreads.
10. Merge ONLY when ALL required checks green. Admin override is reserved for `dev → main` rollup PRs only (per `feedback_rollup_pr_admin_squash.md`); session-N → dev PRs always wait for green CI. Doc-only PRs with green CI + no actionable CR may merge without further wait.
11. Tag end-of-day: `git tag eod-YYYY-MM-DD <sha> && git push origin <tag>` (after FINAL slice if split).
12. Cleanup worktree + post-merge sentrux scan from main checkout.
13. ONE memory entry covering the full daily batch. ONE pointer line in MEMORY.md.
14. Refresh phase board per Rule 8 — print FULL updated phase table marking all phases that landed.

**WIP recovery checkpoint** (between phases): each phase end pushes `wip/YYYY-MM-DD-phase-N` with `git push --force-with-lease origin <wip-branch>`. NO PR opened. Wip branches deleted after end-of-day PR merges. This is the recovery path if the worktree is accidentally removed or the session crashes mid-day.

**SKIP_TESTS=1 decision tree** (auto-applied without asking):

```text
Is the diff > 1500 LOC OR touches src/lib/state/ OR src/app.css OR > 6 files in src/lib/server/?
  YES → use SKIP_TESTS=1 git push (CI re-runs full suite)
  NO  → standard git push
```

**Per-PR cadence (one PR per phase) is RESERVED for**: (a) urgent hotfixes, (b) PR that needs isolated rollback granularity, (c) cross-subsystem changes that exceed Danger 2000-LOC cap, (d) explicit user override.

**Worktree model**: 1-10 stable sibling worktrees at `/home/jetson2/code/Argos-session-N`, each permanently tracking branch `session-N` off `dev`. Daily atomic commits land on `session-N`; PR `session-N` → `dev` → merge → `git fetch origin && git reset --hard origin/dev` to refresh the worktree branch for the next cycle. `node_modules` and `.env` symlinked once per `project_argos_worktree_pattern.md`. Topic branches (`feature/`, `chore/`, etc.) are the EXCEPTION — only spin a fresh worktree when the work is orthogonal to every session-N.

Catalogue: `feedback_batched_commit_cadence.md`.
