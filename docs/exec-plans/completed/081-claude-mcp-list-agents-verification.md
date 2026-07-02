# Claude MCP list_agents verification

```json taskmeta
{
  "id": "claude-mcp-list-agents-verification",
  "title": "Claude MCP list_agents verification",
  "order": 81,
  "status": "completed",
  "next_task_on_success": "claude-cwd-scoped-readonly-approval",
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

Treat Claude `list_agents` MCP verification approvals as scoped Mina MCP approvals so a confirmed registration is not left in a manual-only state.

## Scope

- Generalize Claude MCP approval detection from `register_agent` to `register_agent` or `list_agents`.
- Scope `list_agents` to the project root, current agent id, or session fingerprint when visible.
- Reuse the guided MCP approval action.
- Add real-style core and HTTP smoke fixtures for the post-registration verification prompt.

## Exit criteria

1. Claude `mina-ai-router - list_agents (MCP)` captures are classified as `mcp-registration-approval`.
2. The terminal action list exposes `approve-mcp-registration`.
3. Existing `register_agent` approval behavior remains intact.
4. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from the third real 6-repo follow-up P1.
- Completed: Claude `list_agents` verification approvals are guided through the same scoped Mina MCP approval action.
