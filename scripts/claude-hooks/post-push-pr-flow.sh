#!/usr/bin/env bash
# post-push-pr-flow.sh — PostToolUse hook for Bash `git push` on PR branches.
#
# When Claude pushes a feature branch that has an open PR, CodeRabbit kicks off
# an auto-review in the background (~60-120 s). This hook injects
# `additionalContext` telling next-turn Claude to run coderabbit:autofix once
# the review lands, fix mechanical issues, iterate, then auto-merge to `dev`.
#
# Matches the solo-repo workflow documented in the "Argos solo review + merge
# workflow" memory entry. Auto-merges ONLY to `dev`; `main` merges stay manual.
#
# Input: JSON on stdin with .tool_input.command and .tool_name.
# Output: JSON on stdout with hookSpecificOutput.additionalContext, OR nothing.

set -u

input=$(cat)

tool_name=$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null || echo "")
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Only act on Bash tool + git push commands.
if [ "$tool_name" != "Bash" ]; then exit 0; fi
case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

# We need gh + jq in PATH. If either missing, no-op rather than fail.
command -v gh >/dev/null 2>&1 || exit 0
command -v jq >/dev/null 2>&1 || exit 0

# Resolve current branch. Fail-quiet if not a git repo.
branch=$(git -C "${CLAUDE_PROJECT_DIR:-$PWD}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ -z "$branch" ] || [ "$branch" = "HEAD" ]; then exit 0; fi

# Skip if pushing main/dev/master directly — no PR expected for those.
case "$branch" in
  main|dev|master) exit 0 ;;
esac

# Check for an open PR on this branch. `gh pr view --json` returns non-zero
# when no PR exists; suppress and exit clean in that case.
# CLAUDE_HOOK_INTERNAL=1 exempts this gh call from gh-cli-restrict.sh
# (workflow Rule 4 hard-lock — hooks bypass via env-var seal).
pr_json=$(cd "${CLAUDE_PROJECT_DIR:-$PWD}" && CLAUDE_HOOK_INTERNAL=1 gh pr view "$branch" --json number,state,baseRefName 2>/dev/null || true)
if [ -z "$pr_json" ]; then exit 0; fi

pr_number=$(printf '%s' "$pr_json" | jq -r '.number // empty')
pr_state=$(printf '%s' "$pr_json" | jq -r '.state // empty')
pr_base=$(printf '%s' "$pr_json" | jq -r '.baseRefName // empty')

if [ -z "$pr_number" ] || [ "$pr_state" != "OPEN" ]; then exit 0; fi

# Safety gate: only drive the auto-merge flow for PRs targeting `dev`. Any
# other base (main, release/*, etc.) is explicitly out of scope per the
# project_review_workflow memory rule — emitting merge guidance for those
# bases would conflict with the "main merges stay manual" policy.
if [ "$pr_base" != "dev" ]; then exit 0; fi

# Emit additionalContext. Wrapped in jq to safely escape the prompt payload.
message="Push to PR #${pr_number} ('${branch}' → '${pr_base}') just completed. CodeRabbit is scanning now (typical 60-120 s). You MUST invoke the coderabbit:autofix skill once the review lands — poll via ScheduleWakeup with delaySeconds=90 to stay inside the prompt cache window. Process every actionable CodeRabbit comment; apply mechanical fixes directly; surface non-mechanical suggestions via superpowers:receiving-code-review for technical-rigor judgment. Iterate until review-clean AND all CI checks green. Then auto-merge to '${pr_base}' via 'mcp__github__merge_pull_request' (pullNumber: ${pr_number}, mergeMethod: \"merge\", deleteBranch: true) — this is the standing workflow for dev merges (no user approval gate). Use 'mcp__github__pull_request_read' for status-check rollup, NOT 'gh pr view' (workflow Rule 4 hard-lock). Do NOT auto-merge to main — main merges are always a separate, explicit user decision. Do NOT end the turn until the loop completes (merged) or a blocker needs user input (e.g. conflicting non-mechanical review feedback, failed CI that can't be autofixed)."

jq -n --arg msg "$message" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $msg
  }
}'
