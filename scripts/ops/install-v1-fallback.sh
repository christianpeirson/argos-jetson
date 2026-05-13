#!/usr/bin/env bash
# install-v1-fallback.sh — bootstrap the v1 fallback worktree for :5173.
#
# Creates a sibling git worktree pointing at the last pre-Mk-II commit, gives
# it its own node_modules + database, and produces a production build/ ready
# for argos-final.service to serve. Run BEFORE scripts/ops/install-services.sh
# so the v1 drop-in (30-v1-source.conf) installs and argos-final picks v1 up.
#
# This script is USER-LEVEL — does NOT require root. Systemd unit installation
# is handled by install-services.sh (separate script, requires sudo).
#
# Usage:
#   bash scripts/ops/install-v1-fallback.sh
#
# Environment overrides:
#   V1_REF=<ref>            git ref to check out — branch or sha (default: v1)
#                            The `v1` branch lives on origin and is seeded from
#                            the last pre-Mk-II commit + cherry-picks (GNU Radio,
#                            Carbon-CSS-fix, etc.). Using a branch (not a SHA)
#                            so `git pull` inside Argos-v1 picks up new v1
#                            commits without re-running this script.
#   V1_COMMIT=<sha>         DEPRECATED alias for V1_REF (still honored).
#   V1_PROJECT_DIR=<path>   target worktree path (default: <project>-v1)
#   FORCE_REBUILD=1         remove existing v1 worktree + rebuild from scratch
#
# What it does (idempotent unless FORCE_REBUILD=1):
#   1. Verifies cwd is inside an Argos checkout
#   2. Creates git worktree at V1_PROJECT_DIR tracking V1_REF
#   3. Copies .env (NOT symlink — per-machine isolation)
#   4. npm install --ignore-scripts (skips node-gyp; bypasses node-pty
#      compile bug on aarch64 Linux + Node 22)
#   5. Copies pre-compiled native binaries from main checkout's node_modules
#      (better-sqlite3 + node-pty) — same Node ABI = drop-in compatible
#   6. Checkpoints main DB's WAL into the .db file, then copies to v1 so v1
#      sees migrations table fully populated (avoids singleton-race in
#      RFDatabase.getInstance() running migrations from scratch)
#   7. Runs npm run build to produce v1's adapter-node bundle
#   8. Prints next-step instructions
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# V1_REF preferred; V1_COMMIT alias kept for back-compat (if set, wins).
V1_REF="${V1_REF:-${V1_COMMIT:-v1}}"
V1_PROJECT_DIR="${V1_PROJECT_DIR:-${PROJECT_DIR}-v1}"
FORCE_REBUILD="${FORCE_REBUILD:-0}"

if [[ $EUID -eq 0 ]]; then
  echo "Error: Do NOT run as root. This script needs to operate as the user that owns the project (git, npm, .env)." >&2
  echo "       Run systemd install separately: sudo bash scripts/ops/install-services.sh" >&2
  exit 1
fi

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  echo "Error: $PROJECT_DIR is not a git checkout. Cannot create worktree." >&2
  exit 1
fi

echo "Argos v1 fallback installer"
echo "  Project:    $PROJECT_DIR"
echo "  V1 dir:     $V1_PROJECT_DIR"
echo "  V1 ref:     $V1_REF"
echo ""

# Step 1: Worktree
if [[ -d "$V1_PROJECT_DIR" ]]; then
  if [[ "$FORCE_REBUILD" == "1" ]]; then
    echo "[1/7] FORCE_REBUILD=1 — removing existing $V1_PROJECT_DIR..."
    git -C "$PROJECT_DIR" worktree remove --force "$V1_PROJECT_DIR" 2>/dev/null || rm -rf "$V1_PROJECT_DIR"
  else
    echo "[1/7] Worktree already exists at $V1_PROJECT_DIR (set FORCE_REBUILD=1 to recreate)"
  fi
fi
if [[ ! -d "$V1_PROJECT_DIR" ]]; then
  echo "[1/7] Creating worktree at $V1_PROJECT_DIR (ref $V1_REF)..."
  # Branch refs: track origin/<branch> if it exists, so `git pull` works.
  # SHA refs: detached HEAD (same as before).
  if git -C "$PROJECT_DIR" show-ref --verify --quiet "refs/heads/$V1_REF"; then
    git -C "$PROJECT_DIR" worktree add "$V1_PROJECT_DIR" "$V1_REF"
  elif git -C "$PROJECT_DIR" show-ref --verify --quiet "refs/remotes/origin/$V1_REF"; then
    git -C "$PROJECT_DIR" fetch origin "$V1_REF":"$V1_REF" 2>/dev/null || true
    git -C "$PROJECT_DIR" worktree add "$V1_PROJECT_DIR" "$V1_REF"
  else
    git -C "$PROJECT_DIR" worktree add "$V1_PROJECT_DIR" "$V1_REF"
  fi
fi

# Step 2: .env (copy, not symlink — v1 may diverge per-machine)
echo "[2/7] Copying .env into v1 worktree..."
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo "  Error: $PROJECT_DIR/.env not found. Bootstrap your .env in the main checkout first." >&2
  exit 1
fi
cp "$PROJECT_DIR/.env" "$V1_PROJECT_DIR/.env"

# Step 3: npm install --ignore-scripts (skip native compile)
echo "[3/7] Installing dependencies in v1 (--ignore-scripts to skip node-gyp)..."
(cd "$V1_PROJECT_DIR" && npm install --ignore-scripts --no-audit --no-fund)

# Step 4: Copy pre-compiled native binaries from main → v1
echo "[4/7] Copying compiled native binaries (better-sqlite3 + node-pty)..."
for pkg in better-sqlite3 node-pty; do
  src_dir="$PROJECT_DIR/node_modules/$pkg/build/Release"
  dest_dir="$V1_PROJECT_DIR/node_modules/$pkg/build/Release"
  if [[ ! -d "$src_dir" ]]; then
    echo "  Error: source binary dir missing: $src_dir" >&2
    echo "         Build $pkg in the main checkout first (npm rebuild $pkg)." >&2
    exit 1
  fi
  mkdir -p "$dest_dir"
  cp "$src_dir"/*.node "$dest_dir/"
  echo "  copied $pkg → $dest_dir"
done

# Step 5: Checkpoint main DB then copy to v1 (so v1 sees migrations applied)
echo "[5/7] Checkpointing main DB WAL + copying to v1..."
MAIN_DB="$PROJECT_DIR/rf_signals.db"
V1_DB="$V1_PROJECT_DIR/rf_signals.db"
if [[ ! -f "$MAIN_DB" ]]; then
  echo "  [WARN] $MAIN_DB not found — v1 will bootstrap an empty DB on first start"
  echo "         (may hit migration-runner singleton race; reboot service if so)"
else
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$MAIN_DB" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null
  fi
  cp "$MAIN_DB" "$V1_DB"
  echo "  copied $MAIN_DB → $V1_DB ($(stat -c%s "$V1_DB") bytes)"
fi

# Step 6: Production build
echo "[6/7] Running production build in v1 (this takes 2-5 min on Jetson)..."
(cd "$V1_PROJECT_DIR" && npm run build)

if [[ ! -f "$V1_PROJECT_DIR/build/index.js" ]]; then
  echo "Error: build/ did not produce index.js. Check build output above." >&2
  exit 1
fi

# Step 7: Done
echo "[7/7] v1 fallback ready."
echo ""
echo "Next step — install systemd units (requires sudo):"
echo "  sudo bash $SCRIPT_DIR/install-services.sh"
echo ""
echo "After that:"
echo "  http://localhost:5173/  → v1 (this worktree, prod-build)"
echo "  http://localhost:5174/  → dev branch (vite-dev with HMR)"
