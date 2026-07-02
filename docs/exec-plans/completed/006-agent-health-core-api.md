# Agent health core API

```json taskmeta
{
  "id": "agent-health-core-api",
  "title": "Agent health core and API",
  "order": 6,
  "status": "completed",
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
  ],
  "completed_at": "2026-06-29T03:02:21.399Z",
  "manual_override": {
    "reason": "manual completion of 006 after required core/API health checks passed",
    "artifact": null,
    "previous_evaluation_status": "done",
    "promoted_at": "2026-06-29T03:02:21.399Z"
  }
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
- 2026-06-29T02:47:06.797Z: restored as current task after capability-freshness-ui promotion.
- 2026-06-29T12:01:56+09:00: added core/API health semantics for available, busy, stale, missing, needs-attention, and unknown agents. `AgentStatus` now carries `lastSeenAt`, `lastActivityAt`, `healthCheckedAt`, and `staleAfterMs`; router health classification combines transport reachability, active busy state, stale timestamps, and failed/timeout last requests without relying on UI labels. HTTP and CLI health summaries now count stale and needs-attention agents, while HTTP state exposes missing tmux and stale headless fixtures in smoke coverage. Required checks passed: `npm run test`, `npm run smoke:http`, `npm run smoke:tmux`, and `git diff --check`.
- 2026-06-29T03:02:21.399Z: manually promoted by operator override. Reason: manual completion of 006 after required core/API health checks passed
