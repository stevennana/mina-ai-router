# Router recovery lock release

```json taskmeta
{
  "id": "router-recovery-lock-release",
  "title": "Router recovery lock release",
  "order": 19,
  "status": "completed",
  "next_task_on_success": "orphan-archive-semantics",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-collaboration-reliability-branch-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/product-specs/request-diagnostics-and-controls.md",
    "docs/design-docs/collaboration-reliability.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http"
  ],
  "required_files": [
    "packages/core/src/router.ts",
    "packages/core/src/request-store.ts",
    "apps/http-server/src/index.ts",
    "apps/cli/src/index.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "The fix only clears persisted JSON state but leaves AgentRouter busyAgents untouched",
    "Recovery clears an unrelated agent lock or request lease",
    "Recover and interrupt are collapsed into one action"
  ],
  "completed_at": "2026-06-29T07:21:40.711Z"
}
```

## Objective

Fix branch review Finding 1: recovering an orphaned timeout request must clear both persisted lease state and the live `AgentRouter` busy lock in the same process.

## Scope

- Move or expose recovery-aware lease release through the core router/domain boundary.
- Ensure HTTP and CLI `recover` paths use that boundary instead of only mutating `RequestStore` and `AgentRegistry`.
- Preserve the existing operator-visible recovery event history.
- Add regression coverage proving a second request to the same agent succeeds after recovery without restarting the process.

## Out of scope

- Autonomous terminal interruption.
- Changing timeout creation or prompt-envelope behavior.
- Archive semantics for orphaned requests; that is handled by the next task.

## Exit criteria

1. A timed-out request becomes `leaseStatus: "orphaned"` and keeps the agent attached.
2. `recover` releases the request lease, clears the agent `activeRequestId`, and clears the in-memory router busy lock.
3. A new request to the same agent succeeds immediately in the same `AgentRouter` / HTTP server process.
4. Recovery events remain auditable.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:http`

## Evaluator notes

Prefer a router-owned method such as `recoverRequestLease(requestId, source, message)` over duplicating lock clearing in HTTP and CLI. The regression must fail on the reviewed branch shape and pass after the fix.

## Progress log

- 2026-06-29: Seeded from branch review Finding 1.
- 2026-06-29T07:52:00+09:00: added `AgentRouter.recoverRequestLease()` so recover clears request lease, agent lease fields, and the live busy lock through one domain boundary. Updated HTTP/CLI recover paths to use it. Added core regression coverage and HTTP smoke coverage proving a same-process route can succeed after recovery. Required checks passed: `npm run test`, `npm run smoke:http`.
- 2026-06-29T07:21:40.711Z: automatically promoted after deterministic checks and evaluator approval.
