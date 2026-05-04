#!/usr/bin/env bash
# spin-worktree.sh — spin up an isolated git worktree + feature branch for parallel
# Claude Code (or human) development against this repo.
#
# Why this exists
# ---------------
# Multiple SSH terminals on one Jetson share the same filesystem and the same
# .git/HEAD pointer in the main checkout. Running `git checkout <other-branch>`
# in any one of them clobbers every other terminal sitting in the main checkout.
# The fix is `git worktree add` — a separate working directory on disk linked
# to the same .git database, with its own HEAD.
#
# This helper:
#   1. Fetches origin so the base branch is current.
#   2. Creates the worktree as a sibling of the main checkout (avoids parent-
#      CLAUDE.md auto-load contamination from nesting worktrees).
#   3. Creates the feature branch off the chosen base.
#   4. Symlinks node_modules, .env, and .svelte-kit (if present) so npm + dev
#      tooling work immediately without re-installing.
#   5. Prints the next-step hint.
#
# Usage
# -----
#   ./scripts/ops/spin-worktree.sh <slug> [base-branch]
#
# Examples:
#   ./scripts/ops/spin-worktree.sh css-import-fix
#       → ../Argos-css-import-fix on branch feature/css-import-fix off dev
#
#   ./scripts/ops/spin-worktree.sh session-3
#       → ../Argos-session-3 on branch feature/session-3 off dev
#
#   ./scripts/ops/spin-worktree.sh chore/audit-cleanup main
#       → ../Argos-audit-cleanup on branch chore/audit-cleanup off main
#
# Slug rules
# ----------
# * If slug starts with a recognized prefix (feature/, fix/, chore/, spike/,
#   docs/, test/, refactor/) it becomes the branch name verbatim and the
#   worktree path uses the part after the slash.
# * Otherwise the branch becomes feature/<slug> and the worktree path uses
#   the slug as-is.
#
# Cleanup when done
# -----------------
#   cd /home/jetson2/code/Argos
#   git worktree remove ../Argos-<slug>
#   git push origin --delete <branch>      # if remote no longer needs it

set -euo pipefail

slug="${1:-}"
base="${2:-dev}"

if [[ -z "$slug" ]]; then
    cat <<'USAGE' >&2
usage: spin-worktree.sh <slug> [base-branch]

  slug         feature name OR full branch name with prefix (feature/, fix/, chore/, ...)
  base-branch  branch to fork from (default: dev)

Run from inside any Argos worktree. The new worktree is created as a sibling
of the main checkout on disk.
USAGE
    exit 64
fi

# Locate the main checkout (the one whose .git is a real directory).
# `git rev-parse --git-common-dir` returns the shared .git path even from
# inside a non-main worktree.
git_common_dir="$(git rev-parse --git-common-dir 2>/dev/null)" || {
    echo "✗ not inside a git repo" >&2
    exit 1
}
main_root="$(cd "$(dirname "$git_common_dir")" && pwd)"
parent="$(dirname "$main_root")"

# Strip any leading prefix to derive the dir name; keep slash-form for branch.
known_prefix_re='^(feature|fix|chore|spike|docs|test|refactor)/'
if [[ "$slug" =~ $known_prefix_re ]]; then
    branch="$slug"
    short_slug="${slug#*/}"
else
    branch="feature/$slug"
    short_slug="$slug"
fi

worktree_dir="$parent/Argos-$short_slug"

if [[ -e "$worktree_dir" ]]; then
    echo "✗ path already exists: $worktree_dir" >&2
    echo "  remove it first: git worktree remove $worktree_dir" >&2
    exit 1
fi

# Refuse if branch is already checked out somewhere — prevents the worktree-
# collision error from being a confusing surprise mid-script.
existing_worktree="$(git -C "$main_root" worktree list --porcelain | awk -v b="refs/heads/$branch" '
    $1 == "worktree" { wt = $2 }
    $1 == "branch" && $2 == b { print wt; exit }
')"
if [[ -n "$existing_worktree" ]]; then
    echo "✗ branch '$branch' is already checked out at: $existing_worktree" >&2
    echo "  pick a different slug or remove that worktree first" >&2
    exit 1
fi

echo "→ fetching origin"
git -C "$main_root" fetch origin --quiet

# Resolve the base ref — accept local or origin/.
if git -C "$main_root" rev-parse --verify --quiet "$base" >/dev/null; then
    base_ref="$base"
elif git -C "$main_root" rev-parse --verify --quiet "origin/$base" >/dev/null; then
    base_ref="origin/$base"
else
    echo "✗ base branch not found locally or on origin: $base" >&2
    exit 1
fi

# Branch may already exist (e.g. previously deleted worktree). Handle both cases.
if git -C "$main_root" rev-parse --verify --quiet "refs/heads/$branch" >/dev/null; then
    echo "→ reusing existing branch '$branch'"
    git -C "$main_root" worktree add "$worktree_dir" "$branch"
else
    echo "→ creating branch '$branch' off $base_ref"
    git -C "$main_root" worktree add -b "$branch" "$worktree_dir" "$base_ref"
fi

# Symlink heavy/sensitive deps from main checkout — avoids re-install + keeps
# secrets in one place. Per project_argos_worktree_pattern.md.
for link in node_modules .env .svelte-kit; do
    src="$main_root/$link"
    if [[ -e "$src" ]]; then
        ln -sfn "$src" "$worktree_dir/$link"
        echo "→ symlinked $link"
    fi
done

cat <<EOF

✓ worktree ready

  Worktree:  $worktree_dir
  Branch:    $branch
  Base:      $base_ref

Next steps:
  cd $worktree_dir
  claude                 # start a fresh Claude session in this worktree

When the branch's PR is merged and the worktree is no longer needed:
  cd $main_root && git worktree remove $worktree_dir
  git branch -d $branch                  # local branch (errors if unmerged — use -D to force)
  git push origin --delete $branch       # remote branch (only after PR merged)
EOF
