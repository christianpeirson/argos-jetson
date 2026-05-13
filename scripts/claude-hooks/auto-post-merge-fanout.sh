#!/usr/bin/env bash
# auto-post-merge-fanout.sh — PostToolUse hook on mcp__github__merge_pull_request.
#
# Automatically fans out the freshly-merged dev tip to every sibling aoe
# worktree (L2 of the conflict-avoidance design). This is the mechanical
# guarantee that complements post-push-pr-flow.sh, which only TELLS Claude
# to run worktree-refresh.sh — if Claude forgets, parallel sessions go
# stale. This hook removes that human/agent-in-the-loop dependency.
#
# Input: JSON on stdin with .tool_input.{pullNumber} and .tool_response.
# Effect: spawns scripts/claude-hooks/worktree-refresh.sh in the background
#         so the hook returns immediately (PostToolUse hooks block the turn).
# Output: empty JSON object (hook completed, no additionalContext needed).

set -u

input=$(cat)

tool_name=$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null || echo "")
if [ "$tool_name" != "mcp__github__merge_pull_request" ]; then
    echo '{}'
    exit 0
fi

# Best-effort: pull the merged head branch out of the tool response so the
# fan-out script can skip it (and delete the orphan local ref). Falls back
# to empty, which makes worktree-refresh.sh default to the current branch.
merged_branch=$(printf '%s' "$input" \
    | jq -r '.tool_response.head_ref // .tool_input.headBranch // ""' 2>/dev/null \
    || echo "")

project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"
script="$project_dir/scripts/claude-hooks/worktree-refresh.sh"
[ -x "$script" ] || { echo '{}'; exit 0; }

# Detach: PostToolUse hooks block the next tool call, so we background.
( bash "$script" "$merged_branch" >/tmp/argos-fanout.log 2>&1 ) &
disown 2>/dev/null || true

echo '{}'
