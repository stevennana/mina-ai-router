# Claude MCP call_agent approval

```json taskmeta
{
  "id": "claude-mcp-call-agent-approval",
  "title": "Claude MCP call_agent approval",
  "order": 85,
  "status": "completed",
  "next_task_on_success": "doctor-client-scoped-oob-check",
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

Guide safe Claude `mina-ai-router - call_agent (MCP)` approvals during normal routed communication instead of leaving the user with a manual terminal-only approval.

## Scope

- Detect Claude `call_agent` MCP prompts from the latest interactive prompt segment.
- Classify trusted, scoped Mina `call_agent` prompts as `mcp-registration-approval` so the existing guided approval action can be reused.
- Require the prompt to be scoped to the current project root, agent id, or session fingerprint.
- Keep unknown MCP prompts on the generic manual permission path.
- Add core and HTTP smoke fixtures for a routed-work style `call_agent` approval prompt.

## Exit criteria

1. Claude `mina-ai-router - call_agent (MCP)` captures are classified as `mcp-registration-approval` when scoped to the current session/project.
2. The terminal action list exposes `approve-mcp-registration` with `call_agent` included in the guided action description.
3. Unknown MCP prompts still fall back to generic `permission-approval`.
4. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from the final release gate P1.
- Completed: Claude `call_agent` runtime approval prompts now reuse the scoped Mina MCP guided approval action while unknown MCP prompts remain manual.
