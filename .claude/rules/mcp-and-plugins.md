# MCP Servers + Installed Plugins

Loaded into every session (no `paths:` — these tools are referenced regardless of which file is open).

## Active MCP Servers

Verify with `claude mcp list`. Authoritative config: `~/.claude.json` + each plugin's `.claude-plugin/plugin.json`.

| Namespace                                  | When to use                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `mcp__serena__*`                           | Known symbol → prefer over Grep/Glob                                              |
| `mcp__github__*`                           | **Any GitHub API operation** (workflow Rule 4 — hard-locked)                      |
| `mcp__octocode__lsp*` + `local*`           | LSP (findReferences/hover/gotoDefinition) + local code search ONLY                |
| `mcp__plugin_svelte_svelte__*` + `LSP`     | Every `.svelte` edit (workflow Rule 3). Needs `npm i -g svelte-language-server`.  |
| `mcp__chrome-devtools__*`                  | Frontend debug (workflow Rule 1). Headless chromium pre-launched on :9222.        |
| `mcp__plugin_claude-mem_mcp-search__*`     | Prior-work check (workflow Rule 2): `smart_search`, `timeline`, `knowledge-agent` |
| `mcp__plugin_context-mode_context-mode__*` | `ctx_batch_execute`/`ctx_search`/`ctx_execute` for >20-line outputs               |
| `mcp__plugin_context7-plugin_context7__*`  | Library/framework docs (workflow Rule 5)                                          |
| `mcp__plugin_sentrux_sentrux__*`           | Session bracketing + rules check (workflow Rule 6)                                |

**context-mode enforcement reality**: the `<context_window_protection>` system-reminder is prompt guidance, NOT hook-enforced. PreToolUse only rewrites curl/wget without redirect, inline HTTP in `bash -c`/heredoc, gradle/mvn. Everything else (npm, cat, tail) passes through. Self-discipline is the only gate.

**Project-scoped MCP** (requires `npm run dev` on :5173): `tailwindcss`, `argos-system-inspector`, `argos-database-inspector`, `argos-api-debugger`. They hit HTTP only — cannot import SvelteKit internals. `argos-final.service` (`node build`) lacks Vite dev middleware (`/terminal-ws` is dev-only).

**On-demand profiles**: `--mcp-profile hardware` adds `hardware-debugger`. `--mcp-profile full` adds `streaming-inspector`, `gsm-evil`, `test-runner`.

**Jetson aarch64 chrome-devtools wiring**: Google does not ship Chrome for aarch64 — pre-launch snap chromium on :9222 then register user-scope MCP with `--browserUrl http://127.0.0.1:9222` (camelCase). Plugin-scope namespace fails on Jetson; ignore it.

## Installed Plugins

`/plugin list` to verify. `/plugin install <name>` to add (marketplace via `/plugin marketplace add <repo>`).

| Plugin                | Provides                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `context-mode`        | ctx\_\* MCP + skills `ctx-stats`, `ctx-doctor`, `ctx-upgrade`, `ctx-purge`, `context-mode-ops`               |
| `claude-mem`          | smart_search/timeline MCP + `mem-search`, `make-plan`, `do`, `knowledge-agent`, `version-bump`               |
| `caveman`             | `caveman`, `caveman-review`, `caveman-commit`, `compress`                                                    |
| `superpowers`         | `brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, etc. |
| `context7-plugin`     | Library-docs MCP + `context7-mcp`, `find-docs`                                                               |
| `coderabbit`          | `code-review`, `autofix`                                                                                     |
| `chrome-devtools-mcp` | Duplicate namespace; ignore on Jetson                                                                        |
| `svelte-skills`       | 10 passive skills (`svelte-runes`, `sveltekit-data-flow`, `layerchart-svelte5`, etc.)                        |

Skill names must match the system-reminder `available-skills` list. Editing plugin config requires `/reload-plugins` to respawn subprocesses; kill stale `pgrep chrome-devtools-mcp` if needed.

## Svelte MCP + LSP sequence

Plugin `svelte` v1.0.4+. One-time: `npm i -g svelte-language-server`. Sequence on every `.svelte` edit:

1. `LSP findReferences` PRE-edit — lock the consumer set (line/character 1-based).
2. `list-sections` → analyze `use_cases` to pick docs to fetch.
3. `get-documentation` — token-expensive; only after autofixer flags.
4. `svelte-autofixer` — keep calling until `issues: []`. `$effect`-calls-function suggestions can be ignored if the function is verifiably non-mutating.
5. `LSP hover` POST-edit — confirm type narrowing on a sample of consumers.
6. `playground-link` — only if no project file was modified.
