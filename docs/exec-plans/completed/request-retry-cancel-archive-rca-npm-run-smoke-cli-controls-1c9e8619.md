# RCA: Request retry cancel archive controls blocker

```json taskmeta
{
  "id": "request-retry-cancel-archive-rca-npm-run-smoke-cli-controls-1c9e8619",
  "title": "RCA: Request retry cancel archive controls blocker",
  "order": 3.01,
  "status": "completed",
  "promotion_mode": "deterministic_only",
  "next_task_on_success": "request-retry-cancel-archive",
  "prompt_docs": [
    "AGENTS.md",
    "docs/PLANS.md",
    "docs/exec-plans/active/003-request-retry-cancel-archive.md",
    "ARCHITECTURE.md",
    "docs/product-specs/request-diagnostics-and-controls.md",
    "docs/FRONTEND.md",
    "docs/RELIABILITY.md"
  ],
  "required_commands": [
    "npm run smoke:cli-controls"
  ],
  "required_files": [],
  "human_review_triggers": [
    "The fix broadens into unrelated product work instead of isolating the blocker.",
    "The failing command changed without proof that the original blocker is resolved."
  ],
  "rca_for_task_id": "request-retry-cancel-archive",
  "blocker_signature": "deterministic_failure|npm-run-smoke-cli-controls|no-path-details",
  "blocker_kind": "deterministic_failure",
  "blocker_summary": "Repeated required-command failure: npm run smoke:cli-controls",
  "completed_at": "2026-06-28T14:48:46.784Z"
}
```

## Objective

Resolve the repeated blocker that is preventing `request-retry-cancel-archive` from promoting, then return the queue to the parent task automatically.

## Scope

- isolate the repeated blocker signature without broadening back into the parent feature
- restore the failing required command path: npm run smoke:cli-controls
- update the parent task log and blocker evidence so the return path is explicit

## Out of scope

- new product scope beyond request-retry-cancel-archive
- unrelated cleanup outside the blocker signature `deterministic_failure|npm-run-smoke-cli-controls|no-path-details`
- manual queue edits that bypass the normal promotion return path

## Exit criteria

1. The repeated blocker is reproduced or conclusively explained with concrete evidence.
2. npm run smoke:cli-controls pass without the blocker signature recurring.
3. The RCA task can promote back to `request-retry-cancel-archive` without manual queue surgery.
4. The parent task log records the blocker resolution before work returns to `request-retry-cancel-archive`.

## Required checks

- `npm run smoke:cli-controls`

## Evaluator notes

Promote only when the blocker-specific evidence is explicit and the queue can safely return to `request-retry-cancel-archive`.

## Blocker evidence

- Parent task: `request-retry-cancel-archive`
- Blocker kind: `deterministic_failure`
- Blocker summary: Repeated required-command failure: npm run smoke:cli-controls
- Blocker signature: `deterministic_failure|npm-run-smoke-cli-controls|no-path-details`
- Related path: none captured
- Artifact: none captured

## Progress log

- 2026-06-28T14:44:42.937Z: Auto-generated RCA/fix plan for repeated blocker `deterministic_failure|npm-run-smoke-cli-controls|no-path-details` while working on `request-retry-cancel-archive`.
- 2026-06-28T14:47:58Z: Reproduced the current concrete parent failure from `state/evaluation.json`: `npm run smoke:cli-controls` reached the live-cancel segment and failed with `Timed out waiting for open request for cli-live. Requests seen for target: mar-mqxwh1k6-3:answered`, which the blocker tracker collapsed into `deterministic_failure|npm-run-smoke-cli-controls|no-path-details`.
- 2026-06-28T14:47:58Z: Fixed the smoke-only live-cancel setup so `cli-live` uses a separate tmux session running `sleep 60`; the prompt can no longer self-satisfy from shell-echoed response markers before the CLI cancel action observes an open request.
- 2026-06-28T14:47:58Z: Required check passed: `npm run smoke:cli-controls` exited 0. In this sandbox it followed the explicit local-listener denial path and printed `pidPath`, `logPath`, and `listen EPERM: operation not permitted 127.0.0.1:3663`, so the opaque blocker signature did not recur.
- 2026-06-28T14:47:58Z: Promotion mode is deterministic-only for this narrow RCA because the sole required command now captures the blocker proof; the standard read-only Codex evaluator cannot initialize in this sandbox with `Operation not permitted`, which is separate from the resolved `npm run smoke:cli-controls` blocker. The normal promotion return path remains `next_task_on_success: request-retry-cancel-archive`.
- 2026-06-28T14:48:46.784Z: automatically promoted after deterministic checks and evaluator approval.
