# Request lease state

```json taskmeta
{
  "id": "request-lease-state",
  "title": "Request lease state",
  "order": 16,
  "status": "completed",
  "next_task_on_success": "transaction-recovery-controls",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/product-specs/request-diagnostics-and-controls.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http"
  ],
  "required_files": [
    "packages/core/src",
    "apps/http-server/src/index.ts",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "Timed-out requests lose raw evidence",
    "Agent busy state is cleared while a lease is still active",
    "The task adds terminal interrupt behavior"
  ],
  "completed_at": "2026-06-29T06:30:19.886Z"
}
```

## Objective

Persist the relationship between a routed request and the target agent session so long-running work can be reasoned about after timeout.

## Scope

- Add request lease fields such as `activeRequestId`, `leaseStartedAt`, `leaseExpiresAt`, and lease status.
- Preserve request raw prompt, terminal evidence, parsed answer, and lifecycle diagnostics.
- Mark timed-out requests with enough lease state to distinguish router timeout from session recovery.
- Expose lease state through HTTP request and agent detail responses.

## Out of scope

- UI recovery buttons.
- Sending terminal interrupts.
- Terminal activity diffing beyond storing lease state.

## Exit criteria

1. A routed request can create and clear a lease relationship with the target agent.
2. Timeout keeps lease evidence instead of erasing the relationship immediately.
3. HTTP responses expose lease state for request detail or agent detail consumers.
4. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:http`

## Evaluator notes

This is the state slice only. Do not add operator recovery actions here.

## Progress log

- 2026-06-29: Split from the broader transaction lease monitor plan.
- 2026-06-29T06:14:06.287Z: restored as current task after capability-profile-ui-cli promotion.
- 2026-06-29T06:24:55.000Z: added request and agent lease fields, prompt evidence capture, active/released/orphaned lease lifecycle handling, timeout lease preservation, HTTP state exposure, and deterministic core/HTTP smoke coverage.
- 2026-06-29T06:30:19.886Z: automatically promoted after deterministic checks and evaluator approval.
