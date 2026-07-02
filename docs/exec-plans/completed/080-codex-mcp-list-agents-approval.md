# Codex MCP list_agents approval

```json taskmeta
{
  "id": "codex-mcp-list-agents-approval",
  "title": "Codex MCP list_agents approval",
  "order": 80,
  "status": "completed",
  "next_task_on_success": "claude-mcp-list-agents-verification",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/release-readiness-review-fixes.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "packages/transports/src/tmux/tmux-client.ts",
    "apps/http-server/src/index.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js"
  ]
}
```

## Objective

Guide Codex MCP `list_agents` verification approvals with the same safe flow used for `register_agent`.

## Scope

- Generalize Codex MCP approval detection from `register_agent` to `register_agent` or `list_agents`.
- Scope `list_agents` approval to the current agent id and session fingerprint.
- Reuse the guided Codex MCP approval action and hide generic retry while the concrete prompt is visible.
- Add real-style core and HTTP smoke fixtures.

## Exit criteria

1. Codex `mina-ai-router.list_agents` captures are classified as `codex-mcp-registration-approval`.
2. The terminal action list exposes `approve-codex-mcp-registration`.
3. The action list does not expose `retry-self-registration` for the concrete `list_agents` prompt.
4. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from the third real 6-repo follow-up P1.
- Completed: Codex `list_agents` approval prompts now reuse the scoped MCP approval action and suppress generic retry.
