#!/usr/bin/env bash
# spin-worktree.sh — create an isolated worktree + feature branch for a parallel
# Claude Code (or human) development session, driven by `aoe` (Agent of Empires).
#
# Why this exists
# ---------------
# Argos development runs several Claude Code instances in parallel — one per
# feature in flight. Each instance MUST be in its own git worktree so the
# instances don't fight over `.git/HEAD` in the main checkout. `aoe` owns the
# tmux-session + worktree lifecycle; this helper is the thin front door that:
#
#   1. fetches `origin` so `dev` is current,
#   2. creates the feature branch off `origin/dev` (so the worktree starts fresh),
#   3. hands the branch to `aoe add --worktree … --launch` (creates the worktree
#      at ../Argos-worktrees/<branch> and starts a tmux session with Claude),
#   4. symlinks `node_modules` and `.env` from the main checkout so npm/dev
#      tooling work immediately without a multi-minute `npm ci`, then runs
#      `svelte-kit sync` so the worktree gets its OWN `.svelte-kit`
#      (NEVER symlink `.svelte-kit` — `svelte-kit sync` writes through it and
#      corrupts the shared `internal.js` with worktree-relative `node_modules`
#      paths, 500ing whichever dev server owns the real one),
#   5. prints the next-step hint.
#
# If `aoe` is not on PATH it falls back to a plain `git worktree add` — the
# worktree still works, you just start `claude` in it by hand.
#
# Usage
# -----
#   ./scripts/ops/spin-worktree.sh <slug> [base-branch]
#
#   slug         feature name (→ branch `feature/<slug>`) OR a full branch name
#                with a recognized prefix (feature/ fix/ chore/ spike/ docs/
#                test/ refactor/), used verbatim.
#   base-branch  branch to fork from (default: dev). Accepts a local or origin/ ref.
#
# Examples:
#   ./scripts/ops/spin-worktree.sh css-import-fix
#       → branch feature/css-import-fix off origin/dev, worktree
#         ../Argos-worktrees/feature/css-import-fix, Claude session launched
#   ./scripts/ops/spin-worktree.sh fix/wal-checkpoint
#       → branch fix/wal-checkpoint off origin/dev
#   ./scripts/ops/spin-worktree.sh spec-028-migration main
#       → branch feature/spec-028-migration off origin/main
#
# When the branch's PR has merged and you're done:
#   aoe session stop <session>            # stop the tmux session
#   aoe remove <session> --delete-worktree
#   (the remote branch was deleted by the PR merge; worktree-refresh.sh deletes
#    the orphaned local branch on the next merge fan-out)

set -euo pipefail

slug="${1:-}"
base="${2:-dev}"

if [[ -z "$slug" ]]; then
	cat <<'USAGE' >&2
usage: spin-worktree.sh <slug> [base-branch]

  slug         feature name → branch feature/<slug>, OR a full prefixed branch
               name (feature/… fix/… chore/… spike/… docs/… test/… refactor/…)
  base-branch  branch to fork from (default: dev)

Run from inside any Argos worktree. The new worktree is created under
../Argos-worktrees/<branch> (aoe's path layout).
USAGE
	exit 64
fi

# --- resolve branch name ---------------------------------------------------
known_prefix_re='^(feature|fix|chore|spike|docs|test|refactor)/'
if [[ "$slug" =~ $known_prefix_re ]]; then
	branch="$slug"
else
	branch="feature/$slug"
fi

# --- locate the main checkout (shared .git lives there) --------------------
git_common_dir="$(git rev-parse --git-common-dir 2>/dev/null)" || {
	echo "✗ not inside a git repo" >&2
	exit 1
}
main_root="$(cd "$(dirname "$git_common_dir")" && pwd)"
parent="$(dirname "$main_root")"
repo_name="$(basename "$main_root")"
# aoe path layout: ../{repo-name}-worktrees/{branch}  (branch keeps its slash)
worktree_dir="$parent/${repo_name}-worktrees/$branch"

if [[ -e "$worktree_dir" ]]; then
	echo "✗ path already exists: $worktree_dir" >&2
	echo "  remove it first: git -C $main_root worktree remove $worktree_dir" >&2
	exit 1
fi

# Refuse if branch is already checked out in some worktree.
existing="$(git -C "$main_root" worktree list --porcelain | awk -v b="branch refs/heads/$branch" '
	$0 ~ /^worktree / { wt = substr($0, 10) }
	$0 == b { print wt; exit }
')"
if [[ -n "$existing" ]]; then
	echo "✗ branch '$branch' is already checked out at: $existing" >&2
	exit 1
fi

# --- fetch + resolve base --------------------------------------------------
echo "→ fetching origin"
git -C "$main_root" fetch origin --quiet
if git -C "$main_root" rev-parse --verify --quiet "origin/$base" >/dev/null; then
	base_ref="origin/$base"
elif git -C "$main_root" rev-parse --verify --quiet "$base" >/dev/null; then
	base_ref="$base"
else
	echo "✗ base branch not found locally or on origin: $base" >&2
	exit 1
fi

# --- create the branch off the (fresh) base --------------------------------
if git -C "$main_root" rev-parse --verify --quiet "refs/heads/$branch" >/dev/null; then
	echo "→ reusing existing branch '$branch'"
else
	echo "→ creating branch '$branch' off $base_ref"
	git -C "$main_root" branch "$branch" "$base_ref"
fi

# --- create the worktree (via aoe if available, else plain git) ------------
if command -v aoe >/dev/null 2>&1; then
	echo "→ aoe add --worktree $branch --launch --trust-hooks"
	# aoe places the worktree at its path_template (../{repo}-worktrees/{branch}),
	# starts a tmux session, and (--launch) opens Claude inside it. --trust-hooks
	# pre-approves this repo's husky + .claude hooks so the session runs unattended.
	# Branch already exists, so no --new-branch.
	( cd "$main_root" && aoe add --worktree "$branch" --launch --trust-hooks )
	used_aoe=1
else
	echo "→ aoe not found — falling back to: git worktree add"
	mkdir -p "$(dirname "$worktree_dir")"
	git -C "$main_root" worktree add "$worktree_dir" "$branch"
	used_aoe=0
fi

if [[ ! -d "$worktree_dir" ]]; then
	echo "✗ worktree directory did not appear at $worktree_dir" >&2
	echo "  (check 'aoe worktree list' / 'git worktree list')" >&2
	exit 1
fi

# --- symlink heavy/sensitive deps from the main checkout -------------------
# aoe does NOT do this; without it each worktree needs its own `npm ci`
# (multi-minute, RAM-heavy on the Jetson) and a copied .env.
#
# DO NOT symlink `.svelte-kit`. SvelteKit *writes* to `.svelte-kit/generated/`
# (via `svelte-kit sync`, run automatically by `vite` and `svelte-check`), and
# the generated `internal.js` contains `node_modules` import paths computed
# RELATIVE TO THE WORKTREE'S `.svelte-kit` PATH. A symlinked `.svelte-kit`
# therefore lets one worktree's sync clobber the shared one with a path that's
# only valid from inside that worktree (e.g.
# `../../../../../../Argos/node_modules/@sveltejs/kit/...`), and whichever dev
# server owns the real `.svelte-kit` then 500s with "Failed to load url …".
# Each worktree gets its OWN `.svelte-kit` via `svelte-kit sync` below — it's
# cheap (~1–2 s), and `vite`/`svelte-check` regenerate it on first run anyway.
for link in node_modules .env; do
	src="$main_root/$link"
	if [[ -e "$src" ]]; then
		ln -sfn "$src" "$worktree_dir/$link"
		echo "→ symlinked $link"
	fi
done

# Generate this worktree's own .svelte-kit (NOT a symlink — see above).
if [[ -f "$worktree_dir/package.json" ]] && command -v npx >/dev/null 2>&1; then
	echo "→ svelte-kit sync (generating this worktree's own .svelte-kit)"
	( cd "$worktree_dir" && npx svelte-kit sync >/dev/null 2>&1 ) \
		|| echo "  (svelte-kit sync skipped — vite/svelte-check will regenerate on first run)"
fi

# --- done ------------------------------------------------------------------
cat <<EOF

✓ worktree ready

  Worktree:  $worktree_dir
  Branch:    $branch
  Base:      $base_ref
EOF
if [[ "$used_aoe" == "1" ]]; then
	cat <<EOF

  A Claude session was launched in a tmux session via aoe. Attach with:
    aoe session attach        # pick this session
    aoe list                  # see all sessions

  When done (PR merged): aoe session stop <s> && aoe remove <s> --delete-worktree
EOF
else
	cat <<EOF

  Next: cd $worktree_dir && claude
  When done (PR merged): git -C $main_root worktree remove $worktree_dir
EOF
fi
