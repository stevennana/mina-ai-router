# Request retry cancel archive

```json taskmeta
{
  "id": "request-retry-cancel-archive",
  "title": "Request retry cancel archive controls",
  "order": 3,
  "status": "queued",
  "next_task_on_success": "capability-refresh-command",
  "prompt_docs": [
    "AGENTS.md",
    "ARCHITECTURE.md",
    "docs/product-specs/request-diagnostics-and-controls.md",
    "docs/FRONTEND.md",
    "docs/RELIABILITY.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:cli-controls"
  ],
  "required_files": [
    "packages/core/src/request-store.ts",
    "apps/http-server/ui/src/features/RequestDetail.tsx"
  ],
  "human_review_triggers": [
    "Retry creates ambiguous request lineage",
    "Cancel/archive behavior is not reflected in activity",
    "CLI and UI request semantics diverge"
  ]
}
```

## Objective

Add reliable request recovery controls after request diagnostics are visible.

## Scope

- Ensure retry, cancel, archive, and unarchive semantics are explicit in core and API behavior.
- Show actions in request detail when valid for the current status.
- Preserve or record lineage when retry creates a new request.
- Extend smoke coverage for changed request actions.

## Out of scope

- Team fanout.
- Capability refresh.
- Long-term transcript search.

## Exit criteria

1. Users can recover or clean up requests from UI or CLI without ambiguous state.
2. Invalid actions fail clearly.
3. Activity and request detail reflect the updated status.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:cli-controls`

## Evaluator notes

Do not promote if request action semantics are only implemented in the UI.

## Progress log

- Queue seeded for milestone 0.2 Ralph setup.
