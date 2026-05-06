#!/usr/bin/env bash
# port-for-worktree.sh — derive Vite dev port from worktree directory name.
#
# Stable mapping ensures `npm run dev` from any worktree binds a non-colliding
# port. Combined with `--strictPort`, this makes accidental port collisions
# (e.g., colliding with argos-final on 5173 or argos-dev on 5174) impossible:
# vite exits cleanly instead of fighting for the same socket.
#
# Mapping:
#   Argos             → 5174  (argos-dev.service — v2 production-tracking dev)
#   Argos-session-2   → 5175  (argos-newui-dev.service — active v2 dev work)
#   Argos-session-N   → 5180 + N for N in {1,3..9}; session-10 → 5190
#                       (avoids 5173/5174/5175; reserved for parallel topic work)
#   Argos-v1          → refuse (argos-final.service owns :5173)
#   <anything else>   → 5191
#
# Caller: VITE_PORT="$(./scripts/dev/port-for-worktree.sh)"
# Exits non-zero with explanatory message on the refuse path.

set -euo pipefail

cwd="$(pwd -P)"
name="$(basename "$cwd")"

case "$name" in
	Argos)
		echo 5174
		;;
	Argos-session-2)
		echo 5175
		;;
	Argos-session-10)
		echo 5190
		;;
	Argos-session-[0-9])
		n="${name##*-}"
		echo $((5180 + n))
		;;
	Argos-v1)
		echo "[port-for-worktree] $name is the production worktree (argos-final on :5173). Refusing dev." >&2
		exit 1
		;;
	*)
		echo 5191
		;;
esac
