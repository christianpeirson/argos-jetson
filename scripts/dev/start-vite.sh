#!/usr/bin/env bash
# start-vite.sh — guarded vite dev launcher.
#
# 1. Derives port from worktree name via port-for-worktree.sh.
# 2. Refuses to start if any other process already owns that port (systemd
#    unit, stray tmux, another worktree's npm run dev, etc.) — preventing
#    silent fallback or socket fights.
# 3. Delegates to vite-oom-protect.sh once port is free.

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd -P)"

if ! VITE_PORT="$("$here/port-for-worktree.sh")"; then
	exit 1
fi
export VITE_PORT

if ss -tnlp 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${VITE_PORT}$"; then
	echo "[start-vite] :$VITE_PORT already in use. Refusing to start." >&2
	echo "[start-vite] If a systemd unit owns it, use systemctl. Otherwise:" >&2
	echo "[start-vite]   ss -tnlp | grep :$VITE_PORT   # find owner" >&2
	exit 1
fi

echo "[start-vite] starting vite on :$VITE_PORT (worktree: $(basename "$(pwd -P)"))"
exec "$here/vite-oom-protect.sh"
