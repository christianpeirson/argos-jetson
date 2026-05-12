# Platform Constraints, Git Workflow, Dependencies

Loaded into every session (no `paths:` — these constraints apply to every interaction with the repo).

## Platform constraints

- **Primary**: Raspberry Pi 5 (8 GB, ARM Cortex-A76, Kali). **Active port** (`install/jetson-port`): NVIDIA Jetson AGX Orin, Ubuntu 22.04 aarch64. Jetson deltas in `jetson-port-notes.md` (CPU temp via `/sys/class/thermal/thermal_zone*/temp` first; HDMI needs `modprobe nvidia-drm`; TigerVNC patched for snap chromium).
- **OOM risk**: `svelte-check` ~650 MB — never concurrent. `git-quality-gate.sh` runs typecheck pre-commit.
- **Perf budgets**: WS msg <16 ms, initial load <3 s, <200 MB heap, <15 % CPU. Prefer WS over polling.
- **Native execution**: not Dockerised. `src/lib/server/exec.ts` `execFileAsync()` — no shell, argument arrays only.

## Git workflow

**One aoe worktree per feature** (replaces the old hard-coded `session-N` model):

- Parallel development runs through **`aoe` (Agent of Empires)**: `cd ~/code/Argos`, start `aoe`, then each feature in flight gets its own tmux session on its own git worktree under `../Argos-worktrees/<branch>`. All worktrees share one `.git` object store, so a fetch in any of them makes the new `dev` visible everywhere.
- Spin a feature worktree with `./scripts/ops/spin-worktree.sh <slug>` — fetches `origin`, creates branch `feature/<slug>` (or `<slug>` verbatim if it already has a `feature/ fix/ chore/ spike/ docs/ test/ refactor/` prefix) off `origin/dev`, hands it to `aoe add --worktree <branch> --launch --trust-hooks`, and symlinks `node_modules` / `.env` / `.svelte-kit` from the main checkout (aoe doesn't do that — without it each worktree needs its own multi-minute `npm ci`).
- Daily flow: spin a worktree → work in its Claude session → `git push` → `post-push-pr-flow.sh` opens/finds the PR → `dev`, runs the CodeRabbit autofix loop, auto-merges. **On merge, run `bash scripts/claude-hooks/worktree-refresh.sh <branch>`** — it rebases every other clean worktree onto the new `dev` and marks dirty ones `.needs-rebase`. When the feature's done: `aoe session stop <s> && aoe remove <s> --delete-worktree`.
- `dev → main` stays a **manual rollup PR** with admin-squash (per `feedback_rollup_pr_admin_squash.md`) — never automated.
- **Conflict avoidance, 4 layers**: **L1** pre-push freshness gate (`.husky/pre-push` step 1b — blocks if HEAD is > `FRESHNESS_MAX_BEHIND` (25) commits behind `origin/dev`, or if `.needs-rebase` is present; bypass `SKIP_FRESHNESS=1`). **L2** post-merge fan-out (`scripts/claude-hooks/worktree-refresh.sh` — auto-rebases sibling worktrees). **L3** `dev` branch protection (require CI green + up-to-date-with-base + linear history). **L4** GitHub merge queue on `dev` (`ci.yml` runs on `merge_group`; serialises the rare PR-vs-PR race). L1+L2 are the workhorses; L3/L4 are the server-side backstop. See `feedback_worktree_conflict_strategy.md` and `feedback_branch_freshness_gate.md`.
- Commit format: `type(scope): description` (Conventional Commits). Subject lowercase (commitlint enforced). Atomic commits — one logical change per commit. One PR per feature; split if Danger's 2000-LOC cap blocks (`feedback_no_admin_bypass_daily_loc_cap.md`).
- Forbidden: WIP commits, mega commits, generic messages, force-push to `dev`/`main`. Force-push to your own feature branch is fine before the PR opens.
- Spec-kit: `spec.md` → `plan.md` → `tasks.md` in `specs/NNN-*/`. CLAUDE.md auto-update is BLOCKED by the SKIP AUTO-UPDATE marker in CLAUDE.md.

> The 10 legacy `Argos-session-*` worktrees aren't force-deleted — drain them, then `aoe worktree cleanup` / `git worktree remove`. `port-for-worktree.sh` keeps back-compat ports for them in the meantime.

## Dependencies

No `npm install` without user approval. Pin exact versions. No ORMs, no CSS frameworks beyond Tailwind, no Redux/Zustand/lodash.

**Native addons stay in `dependencies`, NOT `devDependencies`** — `better-sqlite3`, `node-pty`. `@sveltejs/adapter-node` externalises only `dependencies`; anything in `devDependencies` gets bundled into the ESM server chunk and breaks native addons that need CJS globals (`__filename`, `__dirname`). Symptom: `ReferenceError: __filename is not defined` at server startup.
