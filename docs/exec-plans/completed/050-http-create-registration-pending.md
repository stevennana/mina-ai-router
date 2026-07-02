# HTTP create registration pending

```json taskmeta
{
  "id": "http-create-registration-pending",
  "title": "HTTP create registration pending",
  "order": 50,
  "status": "completed",
  "next_task_on_success": "cli-controls-dynamic-ports",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-oob-review.md",
    "apps/http-server/src/index.ts",
    "scripts/smoke-http.js"
  ],
  "required_commands": [
    "npm run smoke:http",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/http-server/src/index.ts",
    "scripts/smoke-http.js",
    "state/backlog.md"
  ],
  "completed_at": "2026-07-01T18:40:00+09:00"
}
```

## Objective

Align Web UI/API agent creation with CLI state transitions after the self-registration prompt is sent.

## Exit criteria

1. HTTP create-agent stores `bootstrapStatus: "registration-pending"` after sending the registration prompt.
2. The response agent and `/api/state` agree on the stored bootstrap and registration state.
3. Smoke HTTP covers the default `sendRegistrationPrompt` path with configured MCP.
4. Existing permission and MCP-blocked branches remain unchanged.

## Progress log

- 2026-07-01: Updated HTTP create-agent prompt-success branch and smoke coverage.
