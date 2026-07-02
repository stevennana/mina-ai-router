# Orphan archive semantics

```json taskmeta
{
  "id": "orphan-archive-semantics",
  "title": "Orphan archive semantics",
  "order": 20,
  "status": "completed",
  "next_task_on_success": "cli-blocked-agent-placeholder",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-collaboration-reliability-branch-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/product-specs/request-diagnostics-and-controls.md",
    "docs/product-specs/agent-bootstrap-reliability.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:tmux"
  ],
  "required_files": [
    "packages/core/src/request-store.ts",
    "packages/core/src/router.ts",
    "apps/http-server/src/index.ts",
    "apps/http-server/ui/src/features/RequestDetail.tsx",
    "apps/cli/src/index.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "Archive hides an orphaned request while leaving the agent attached to it",
    "UI offers an action that API or CLI rejects with different semantics",
    "Archive deletes recovery history instead of preserving an audit trail"
  ],
  "completed_at": "2026-06-29T07:27:32.786Z"
}
```

## Objective

Fix branch review Finding 2 by making archive behavior for orphaned requests explicit and consistent.

## Scope

- Implement release-on-archive for orphaned requests.
- Clear the request lease, agent `activeRequestId`, and live router busy lock when an orphaned request is archived.
- Record an auditable recovery/archive event explaining that an orphaned lease was released by archive.
- Keep UI, HTTP API, and CLI behavior aligned.
- Add regression coverage for orphaned request archive followed by a successful new route to the same agent.

## Out of scope

- Removing Archive from answered/failed historical requests.
- Changing retry lineage behavior.
- Bulk archive policy changes.

## Exit criteria

1. Orphaned request -> archive results in `status: "archived"` and no remaining orphaned lease.
2. The target agent no longer has `activeRequestId` after archive.
3. A new request to the same agent succeeds in the same process after archive.
4. Recovery/archive history records why the lease was released.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:tmux`

## Evaluator notes

The branch review offered two product choices: disallow archive until recovery, or release-on-archive. Use release-on-archive for this queue because the current UI already exposes Archive on orphaned requests and this is more operator-friendly.

## Progress log

- 2026-06-29: Seeded from branch review Finding 2.
- 2026-06-29T08:05:00+09:00: implemented release-on-archive for orphaned requests. Archive now releases orphaned leases, records an archive recovery event, and routes HTTP/CLI archive through `AgentRouter.archiveRequest()` so live busy locks are cleared. Added core and HTTP smoke regressions proving same-process routing succeeds after orphan archive. Required checks passed: `npm run test`, `npm run smoke:http`, `npm run smoke:tmux`.
- 2026-06-29T07:21:40.711Z: restored as current task after router-recovery-lock-release promotion.
- 2026-06-29T07:27:32.786Z: automatically promoted after deterministic checks and evaluator approval.
