#!/usr/bin/env bash
# port-for-worktree.sh — derive a stable, non-colliding Vite dev port for the
# current worktree.
#
# Argos development now runs many parallel worktrees (one per feature, created
# by `scripts/ops/spin-worktree.sh` → `aoe add --worktree …`, living under
# ../Argos-worktrees/<branch>). Each `npm run dev` must bind a unique port so
# they don't fight over a socket. Combined with Vite's `--strictPort`, a
# collision makes Vite exit cleanly instead of stomping another instance.
#
# Reserved ports (never auto-assigned):
#   5173  argos-final.service        (production, v1 legacy UI — main worktree)
#   5174  argos-dev.service          (production, v2 Mk II UI — main worktree)
#   5175  argos-newui-dev.service    (legacy session-2 worktree)
#
# Both :5173 and :5174 serve from the main worktree; UI split is port-aware in
# hooks.server.ts (see memory feedback_port_ui_split_nonnegotiable.md).
#
# Assignment:
#   main checkout (basename "Argos")         → 5174
#   legacy "Argos-session-2"                 → 5175
#   legacy "Argos-session-N" (N∈{1,3..9})    → 5180 + N ; session-10 → 5190
#   anything else (aoe feature worktree)     → 5191 + (hash(branch) mod 79)  ∈ [5191, 5269]
#
# The feature-worktree port is a hash of the *branch name* (not the directory),
# so it's stable across rename/move and identical for the same branch wherever
# it's checked out. Range chosen to avoid 5173–5175 and the session-N band.
#
# Caller: VITE_PORT="$(./scripts/dev/port-for-worktree.sh)"
# Exits non-zero with an explanatory message on the refuse path.

set -euo pipefail

cwd="$(pwd -P)"
name="$(basename "$cwd")"

# Legacy fixed mappings (kept until the old worktrees are drained).
case "$name" in
	Argos)
		echo 5174
		exit 0
		;;
	Argos-session-2)
		echo 5175
		exit 0
		;;
	Argos-session-10)
		echo 5190
		exit 0
		;;
	Argos-session-[0-9])
		echo $((5180 + ${name##*-}))
		exit 0
		;;
esac

# aoe feature worktree (../Argos-worktrees/<branch>) — hash the branch name.
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$name")"
# Stable 32-bit-ish hash via cksum (POSIX, no external hash tool needed).
h="$(printf '%s' "$branch" | cksum | cut -d' ' -f1)"
echo $((5191 + h % 79))
