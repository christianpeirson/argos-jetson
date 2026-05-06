#!/usr/bin/env bash
# worktree-refresh.sh — fast-forward a worktree to its upstream tip if clean.
#
# Used by argos-worktree-refresh@.timer (one-shot daily) to keep
# /home/jetson2/code/Argos and any opted-in worktrees in sync with origin/dev,
# preventing the :5174 / :5175 "serving yesterday's code" failure mode.
#
# Behaviour:
#   - Refuses if working tree dirty (preserves user WIP).
#   - Refuses if HEAD is detached.
#   - Tries `git pull --ff-only`; logs but does not error if non-FF.
#   - All output goes to journald via the systemd unit.
#
# Usage:
#   worktree-refresh.sh <abs-worktree-path>

set -euo pipefail

worktree="${1:?worktree path required}"
cd "$worktree"

if [ -n "$(git status --porcelain)" ]; then
	echo "[worktree-refresh] $worktree dirty — skipping" >&2
	exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" = "HEAD" ]; then
	echo "[worktree-refresh] $worktree detached HEAD — skipping" >&2
	exit 0
fi

echo "[worktree-refresh] $worktree on $branch — fetching"
git fetch --quiet origin

if git pull --ff-only --quiet origin "$branch" 2>/tmp/worktree-refresh.err; then
	echo "[worktree-refresh] $worktree fast-forwarded to $(git rev-parse --short HEAD)"
else
	echo "[worktree-refresh] $worktree non-FF or no upstream — skipping" >&2
	cat /tmp/worktree-refresh.err >&2 || true
fi
