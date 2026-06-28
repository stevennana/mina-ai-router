# Agent health core API

```json taskmeta
{
  "id": "agent-health-core-api",
  "title": "Agent health core and API",
  "order": 6,
  "status": "queued",
  "next_task_on_success": "agent-health-ui-cli",
  "prompt_docs": [
    "AGENTS.md",
    "ARCHITECTURE.md",
    "docs/product-specs/agent-health-and-heartbeat.md",
    "docs/RELIABILITY.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:tmux"
  ],
  "required_files": [
    "packages/core/src/registry.ts",
    "packages/core/src/types.ts",
    "apps/http-server/src/index.ts"
  ],
  "human_review_triggers": [
    "Health status is inconsistent with tmux reachability",
    "Missing tmux sessions still appear available in API state",
    "The task attempts full terminal prompt semantic detection"
  ]
}
```

## Objective

Add core/API health semantics for stale or missing local agent sessions.

## Scope

- Track last seen or last activity fields where practical.
- Add core classification for available, busy, stale, missing, and needs-attention where the data supports it.
- Expose consistent health data through HTTP APIs.
- Extend tmux or HTTP smoke coverage for health behavior.

## Out of scope

- UI rendering polish.
- CLI watch mode.
- Full semantic prompt detection.
- Hosted monitoring.

## Exit criteria

1. API/core state can identify stale or missing agents without relying on UI-only labels.
2. Existing available/busy behavior remains compatible.
3. Required tests pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:tmux`

## Evaluator notes

Do not promote if health status is only a UI label with no core/API backing.

## Progress log

- Split from broad `agent-heartbeat-health` after exec-plan quality review.
