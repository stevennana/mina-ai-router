# Codex MCP registration approval

```json taskmeta
{
  "id": "codex-mcp-registration-approval",
  "title": "Codex MCP registration approval",
  "order": 77,
  "status": "completed",
  "next_task_on_success": "claude-readonly-registration-approvals",
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

Detect Codex MCP `mina-ai-router.register_agent` approval prompts and expose a scoped guided approval action instead of generic self-registration retry.

## Scope

- Add Codex MCP registration approval prompt detection scoped to agent id, session id, and project root.
- Expose a guided `approve-codex-mcp-registration` action that sends Enter for option 1 only.
- Hide `retry-self-registration` while the concrete Codex approval prompt is visible.
- Add core and HTTP smoke fixtures using the real review capture shape.

## Exit criteria

1. Codex approval captures are classified as `codex-mcp-registration-approval`.
2. The terminal action list exposes `approve-codex-mcp-registration`.
3. The action list does not expose `retry-self-registration` for the same concrete prompt.
4. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from the second real 6-repo follow-up P1.
- Completed: Codex `mina-ai-router.register_agent` approval prompts are detected as `codex-mcp-registration-approval`, expose `approve-codex-mcp-registration`, and hide generic retry in HTTP smoke coverage.
