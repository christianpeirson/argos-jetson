#!/usr/bin/env bash
# gh-cli-restrict.sh — PreToolUse hook for Bash commands invoking `gh` CLI.
# Workflow Rule 4 (GitHub MCP hard-lock) restricts gh to a narrow allow-list:
#   - gh workflow run|list|view (workflow dispatch, github MCP actions toolset is read-only re: dispatch)
#   - gh secret  set|list|delete (github MCP has no secret-write surface)
#   - gh auth    status|login|logout (auth probes)
# All other gh subcommands (pr, issue, api, release, repo, run) must use mcp__github__*.
#
# Hook self-exemption: any caller that sets CLAUDE_HOOK_INTERNAL=1 is allowed
# (so other bash hooks like post-push-pr-flow.sh can keep calling `gh pr view`
# internally — hooks run in bash and have no access to MCP tools).
#
# Pattern from scripts/claude-hooks/block-sensitive-files.sh + anchored regex
# from ~/.claude/hooks/github-url-block.sh:14-22 (prevents chained-bypass).
set -euo pipefail

# Hook-internal exemption — let other bash hooks keep using gh.
if [[ "${CLAUDE_HOOK_INTERNAL:-0}" = "1" ]]; then
  exit 0
fi

INPUT=$(cat) || exit 0
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)
if [[ "$TOOL_NAME" != "Bash" ]]; then exit 0; fi

CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)
if [[ -z "$CMD" ]]; then exit 0; fi

# Anchored match — only fires if `gh` is the FIRST token (prevents
# `echo gh pr ...` or `git log | grep gh` false-positives).
if ! printf '%s' "$CMD" | grep -qE '^[[:space:]]*gh([[:space:]]|$)'; then
  exit 0
fi

# Extract the subcommand (token after `gh`). Strip leading whitespace, split.
SUB=$(printf '%s' "$CMD" | sed -E 's/^[[:space:]]*gh[[:space:]]+([A-Za-z_-]+).*/\1/' )

case "$SUB" in
  workflow|secret|auth)
    # Allowed.
    exit 0
    ;;
  *)
    REASON="BLOCKED: \`gh ${SUB}\` is restricted by workflow Rule 4 (GitHub MCP hard-lock).

Use \`mcp__github__*\` (github-mcp-server) for GitHub API ops:
  gh pr      → mcp__github__create_pull_request / pull_request_read / merge_pull_request / list_pull_requests
  gh issue   → mcp__github__issue_write / issue_read / list_issues
  gh api     → matching mcp__github__* tool (most REST endpoints are covered)
  gh release → mcp__github__list_releases / get_latest_release / get_release_by_tag
  gh repo    → mcp__github__search_repositories / get_file_contents
  gh run     → mcp__github__ actions toolset (run/job/artifact)

Allow-list (CLI-only, github-mcp-server has no equivalent):
  gh workflow run|list|view  — workflow dispatch
  gh secret set|list|delete  — secret management
  gh auth status|login|logout — auth probe

Hooks (\`scripts/claude-hooks/*.sh\`) bypass this gate via CLAUDE_HOOK_INTERNAL=1.
See: .claude/rules/workflow.md Rule 4."
    jq -n --arg reason "$REASON" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
    exit 0
    ;;
esac
