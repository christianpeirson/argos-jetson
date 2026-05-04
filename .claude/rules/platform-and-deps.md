# Platform Constraints, Git Workflow, Dependencies

Loaded into every session (no `paths:` — these constraints apply to every interaction with the repo).

## Platform constraints

- **Primary**: Raspberry Pi 5 (8 GB, ARM Cortex-A76, Kali). **Active port** (`install/jetson-port`): NVIDIA Jetson AGX Orin, Ubuntu 22.04 aarch64. Jetson deltas in `jetson-port-notes.md` (CPU temp via `/sys/class/thermal/thermal_zone*/temp` first; HDMI needs `modprobe nvidia-drm`; TigerVNC patched for snap chromium).
- **OOM risk**: `svelte-check` ~650 MB — never concurrent. `git-quality-gate.sh` runs typecheck pre-commit.
- **Perf budgets**: WS msg <16 ms, initial load <3 s, <200 MB heap, <15 % CPU. Prefer WS over polling.
- **Native execution**: not Dockerised. `src/lib/server/exec.ts` `execFileAsync()` — no shell, argument arrays only.

## Git workflow

**Worktree-per-session model** (cognitively simple, default for daily work):

- 1-10 stable sibling worktrees at `/home/jetson2/code/Argos-session-N` (N = 1…10), each permanently tracking its own branch `session-N` off `dev`. Created once via `scripts/ops/spin-worktree.sh session-N` and then reused indefinitely. Never `git checkout` a different branch inside a session worktree — it defeats the per-session isolation.
- Daily flow: ssh in → `cd Argos-session-N` → work → commit on `session-N` → PR `session-N` → `dev` → merge. After merge, refresh the worktree branch with `git fetch origin && git reset --hard origin/dev` (or `git pull --ff-only` if the merge was non-squash) so the next day's work starts from current `dev`.
- Topic branches (`feature/<slug>`, `chore/<slug>`, `fix/<slug>`) are the EXCEPTION — only use one when the work is genuinely orthogonal to all session worktrees (e.g., a long-lived spec migration that needs its own worktree). Spin via `scripts/ops/spin-worktree.sh <slug>` — that creates `Argos-<slug>` + branch `<slug>` (or `feature/<slug>` if no prefix is given).
- Commit format: `type(scope): description` (Conventional Commits). Subject lowercase (commitlint enforced). Atomic commits — one logical change per commit.
- Forbidden: WIP commits, mega commits, generic messages, force-push to `dev`/`main`. Force-push to your own session-N branch is fine if upstream isn't shared.
- Spec-kit: `spec.md` → `plan.md` → `tasks.md` in `specs/NNN-*/`. CLAUDE.md auto-update is BLOCKED by the SKIP AUTO-UPDATE marker in CLAUDE.md.

## Dependencies

No `npm install` without user approval. Pin exact versions. No ORMs, no CSS frameworks beyond Tailwind, no Redux/Zustand/lodash.

**Native addons stay in `dependencies`, NOT `devDependencies`** — `better-sqlite3`, `node-pty`. `@sveltejs/adapter-node` externalises only `dependencies`; anything in `devDependencies` gets bundled into the ESM server chunk and breaks native addons that need CJS globals (`__filename`, `__dirname`). Symptom: `ReferenceError: __filename is not defined` at server startup.
