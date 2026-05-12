#!/usr/bin/env bash
# worktree-refresh.sh — fan-out rebase of sibling git worktrees onto current dev.
#
# Why this exists
# ---------------
# Argos development now runs N parallel Claude Code sessions, each in its own
# tmux session (managed by `aoe`, Agent of Empires) on its own git worktree
# under ../Argos-worktrees/<branch>. All worktrees share ONE .git object store,
# so a `git fetch` makes the new `dev` visible everywhere instantly — but each
# worktree's *working tree* still has to be moved onto it.
#
# When one feature's PR merges to `dev`, this script reaches into every OTHER
# worktree and, if it has a clean tree, runs `git fetch origin && git rebase
# origin/dev`. A worktree that's dirty / mid-edit is left alone and marked with
# a `.needs-rebase` file; its own pre-push freshness gate (.husky/pre-push
# step 1b) will force the rebase before it can push again.
#
# This is layer L2 of the conflict-avoidance design (see
# .claude/rules/platform-and-deps.md "Git workflow" + memory
# feedback_worktree_conflict_strategy.md). L1 = pre-push freshness gate,
# L3 = `dev` branch protection, L4 = GitHub merge queue.
#
# Usage
# -----
#   bash scripts/claude-hooks/worktree-refresh.sh [merged-branch]
#
#   merged-branch  the feature branch that just merged to dev (skipped from the
#                  fan-out, and its now-orphaned local branch is deleted if it
#                  is fully contained in origin/dev). Defaults to the current
#                  branch (the typical call site: right after the merge).
#
# Safe to run any time — it never touches a worktree with uncommitted changes,
# never force-anything, and a rebase conflict aborts cleanly and is reported.
#
# Exit code is always 0 (informational hook); a human-readable summary is
# printed to stdout.

set -uo pipefail

# --- locate the shared repo + base branch ----------------------------------
git_common_dir="$(git rev-parse --git-common-dir 2>/dev/null)" || {
	echo "[worktree-refresh] not inside a git repo — nothing to do"
	exit 0
}
main_root="$(cd "$(dirname "$git_common_dir")" && pwd)"
self_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
merged_branch="${1:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")}"
base="dev"

echo "[worktree-refresh] base=origin/$base  merged-branch=${merged_branch:-<none>}"

# Update remote refs once for the whole shared repo.
if ! git -C "$main_root" fetch origin --quiet; then
	echo "[worktree-refresh] ⚠ git fetch failed — aborting fan-out"
	exit 0
fi
if ! git -C "$main_root" rev-parse --verify --quiet "origin/$base" >/dev/null; then
	echo "[worktree-refresh] ⚠ origin/$base not found — aborting"
	exit 0
fi
base_sha="$(git -C "$main_root" rev-parse "origin/$base")"

rebased=()
skipped_dirty=()
conflicted=()
already=()

# Rebase one worktree onto origin/dev if it's eligible + clean.
process_worktree() {
	local wt="$1" wt_branch="$2"

	# Skip the main checkout (tracks dev, refreshed via the dev→main rollup),
	# and skip ourselves.
	[ "$wt" = "$main_root" ] && return 0
	[ "$wt" = "$self_root" ] && return 0
	# Skip the worktree holding the just-merged branch.
	[ -n "$merged_branch" ] && [ "$wt_branch" = "$merged_branch" ] && return 0
	# Skip detached-HEAD worktrees.
	[ -z "$wt_branch" ] && return 0
	# Never rebase protected branches.
	case "$wt_branch" in main|master|dev) return 0 ;; esac

	# Already contains the new dev tip? Nothing to do.
	local head_sha
	head_sha="$(git -C "$wt" rev-parse HEAD 2>/dev/null || echo "")"
	if [ -n "$head_sha" ] && git -C "$wt" merge-base --is-ancestor "$base_sha" "$head_sha" 2>/dev/null; then
		already+=("$wt_branch")
		return 0
	fi

	# Dirty tree → don't touch; leave a breadcrumb the pre-push gate picks up.
	if [ -n "$(git -C "$wt" status --porcelain 2>/dev/null)" ]; then
		: > "$wt/.needs-rebase" 2>/dev/null || true
		skipped_dirty+=("$wt_branch")
		return 0
	fi

	# Clean tree → rebase onto origin/dev.
	if git -C "$wt" rebase "origin/$base" --quiet >/dev/null 2>&1; then
		rm -f "$wt/.needs-rebase" 2>/dev/null || true
		rebased+=("$wt_branch")
	else
		git -C "$wt" rebase --abort >/dev/null 2>&1 || true
		: > "$wt/.needs-rebase" 2>/dev/null || true
		conflicted+=("$wt_branch")
	fi
}

# --- iterate all worktrees -------------------------------------------------
# `git worktree list --porcelain` emits blocks separated by blank lines:
#   worktree <path>
#   HEAD <sha>
#   branch refs/heads/<name>      (absent for detached HEAD)
wt=""
wt_branch=""
while IFS= read -r line; do
	case "$line" in
		"worktree "*) wt="${line#worktree }"; wt_branch="" ;;
		"branch refs/heads/"*) wt_branch="${line#branch refs/heads/}" ;;
		"")
			[ -n "$wt" ] && process_worktree "$wt" "$wt_branch"
			wt=""; wt_branch=""
			;;
	esac
done < <(git -C "$main_root" worktree list --porcelain; printf '\n')

# --- summary ---------------------------------------------------------------
summary="[worktree-refresh] done."
[ ${#rebased[@]} -gt 0 ]       && summary="$summary  rebased: ${rebased[*]}."
[ ${#already[@]} -gt 0 ]       && summary="$summary  already-current: ${already[*]}."
[ ${#skipped_dirty[@]} -gt 0 ] && summary="$summary  skipped (dirty, marked .needs-rebase): ${skipped_dirty[*]}."
[ ${#conflicted[@]} -gt 0 ]    && summary="$summary  ⚠ rebase conflict (aborted, marked .needs-rebase): ${conflicted[*]} — those worktrees must 'git rebase origin/dev' by hand."
echo "$summary"

# Best-effort: drop the now-orphaned local branch of the merged PR if it's
# fully contained in origin/dev and not checked out in any worktree.
if [ -n "$merged_branch" ] \
	&& git -C "$main_root" rev-parse --verify --quiet "refs/heads/$merged_branch" >/dev/null \
	&& git -C "$main_root" merge-base --is-ancestor "$merged_branch" "origin/$base" 2>/dev/null; then
	if ! git -C "$main_root" worktree list --porcelain | grep -qx "branch refs/heads/$merged_branch"; then
		git -C "$main_root" branch -D "$merged_branch" >/dev/null 2>&1 \
			&& echo "[worktree-refresh] deleted orphaned local branch '$merged_branch'"
	fi
fi

exit 0
