#!/usr/bin/env bash
# block-octocode-github.sh — PreToolUse hook for mcp__octocode__github*
# Forces use of mcp__github__* (github-mcp-server) for ALL GitHub API operations.
# octocode `lsp*` and `local*` namespaces remain allowed (LSP / local code search).
# Pattern from scripts/claude-hooks/block-sensitive-files.sh — JSON-in / JSON-out via jq -n.
set -euo pipefail

INPUT=$(cat) || exit 0
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null)

# Match anything starting with mcp__octocode__github (Get, View, Search*).
case "$TOOL_NAME" in
  mcp__octocode__github*)
    REASON="BLOCKED: \`${TOOL_NAME}\` is forbidden by workflow Rule 4 (GitHub MCP hard-lock).

Use \`mcp__github__*\` (github-mcp-server) instead. Direct equivalents:
  mcp__octocode__githubGetFileContent     → mcp__github__get_file_contents
  mcp__octocode__githubViewRepoStructure  → mcp__github__get_file_contents (path='')
  mcp__octocode__githubSearchCode         → mcp__github__search_code
  mcp__octocode__githubSearchPullRequests → mcp__github__search_pull_requests / list_pull_requests
  mcp__octocode__githubSearchRepositories → mcp__github__search_repositories

octocode \`lsp*\` and \`local*\` tools remain allowed (LSP / local code search).
See: .claude/rules/workflow.md Rule 4."
    jq -n --arg reason "$REASON" \
      '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
    exit 0
    ;;
esac

exit 0
