# Pending registration retry confirmed-at

```json taskmeta
{
  "id": "pending-registration-retry-confirmed-at",
  "title": "Pending registration retry confirmed-at",
  "order": 73,
  "status": "completed",
  "next_task_on_success": "claude-mcp-registration-approval",
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
    "apps/http-server/src/index.ts",
    "scripts/smoke-http.js"
  ]
}
```

## Objective

Keep self-registration retry available whenever `registrationStatus` is still `pending`, even if an old `confirmedByAgentAt` timestamp exists.

## Scope

- Make `registrationStatus: confirmed` the durable registration signal.
- Do not let `confirmedByAgentAt` alone hide retry actions.
- Add HTTP smoke coverage for pending plus `confirmedByAgentAt`.

## Exit criteria

1. Pending tmux agents with `confirmedByAgentAt` still expose `retry-self-registration`.
2. Confirmed agents do not expose retry.
3. Retry remains hidden for active MCP blockers.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from real 6-repo follow-up P1.
- Completed: pending registration state now keeps retry available even when an old `confirmedByAgentAt` timestamp exists.
