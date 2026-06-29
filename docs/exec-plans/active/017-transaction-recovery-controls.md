# Transaction recovery controls

```json taskmeta
{
  "id": "transaction-recovery-controls",
  "title": "Transaction recovery controls",
  "order": 17,
  "status": "queued",
  "next_task_on_success": "bootstrap-docs-and-smoke-hardening",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/product-specs/request-diagnostics-and-controls.md"
  ],
  "required_commands": [
    "npm run build",
    "npm run smoke:http",
    "npm run smoke:tmux"
  ],
  "required_files": [
    "packages/core/src",
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "apps/http-server/ui/src"
  ],
  "human_review_triggers": [
    "The task sends terminal interrupts without an explicit operator action",
    "Cancel request and interrupt terminal are collapsed into one action",
    "The UI clears an orphaned-running state without preserving an audit trail"
  ]
}
```

## Objective

Add explicit operator controls for long transactions that outlive router timeout.

## Scope

- Detect or surface post-timeout session activity as `needs-attention` or orphaned-running detail.
- Add explicit actions for cancel request only, send interrupt, and mark recovered.
- Surface recovery state in Web UI request detail, agent detail, and CLI controls.
- Record an auditable event when an operator recovery action is taken.

## Out of scope

- Autonomous interruption without user action.
- Full workflow engine.
- Changing the lease persistence contract except where required to consume it.

## Exit criteria

1. Continued terminal activity after timeout is visible to the operator.
2. Cancel request, interrupt terminal, and mark recovered are separate actions with clear labels.
3. Recovery actions preserve an audit trail or request history entry.
4. Required checks pass.

## Required checks

- `npm run build`
- `npm run smoke:http`
- `npm run smoke:tmux`

## Evaluator notes

This task depends on `request-lease-state`. Keep request cancellation and terminal interruption separate.

## Progress log

- 2026-06-29: Split from the broader transaction lease monitor plan.
