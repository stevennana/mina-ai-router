# Claude MCP registration approval

```json taskmeta
{
  "id": "claude-mcp-registration-approval",
  "title": "Claude MCP registration approval",
  "order": 74,
  "status": "completed",
  "next_task_on_success": "claude-folder-trust-guided-action",
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

Detect Claude MCP `mina-ai-router - register_agent` approval prompts and expose a scoped guided approval action.

## Scope

- Match MCP approval prompts scoped to current agent id, session id, and project root.
- Send Enter for option 1 only.
- Keep unknown tool approvals manual or undetected.

## Exit criteria

1. Real-style Claude `register_agent` MCP approval returns a prompt kind and guided action.
2. The guided action sends Enter without injecting another self-registration prompt.
3. Prompt clearance does not falsely mark a still-visible MCP approval as resolved.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from real 6-repo follow-up P1.
- Completed: real-style Claude MCP `register_agent` approval prompts now expose a scoped guided `approve-mcp-registration` action.
