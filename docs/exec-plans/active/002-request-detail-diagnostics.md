# Request detail diagnostics

```json taskmeta
{
  "id": "request-detail-diagnostics",
  "title": "Request detail diagnostics",
  "order": 2,
  "status": "active",
  "next_task_on_success": "request-retry-cancel-archive",
  "prompt_docs": [
    "AGENTS.md",
    "ARCHITECTURE.md",
    "docs/PRODUCT_SENSE.md",
    "docs/FRONTEND.md",
    "docs/RELIABILITY.md",
    "docs/product-specs/request-diagnostics-and-controls.md",
    "docs/design-docs/collaboration-reliability.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http"
  ],
  "required_files": [
    "apps/http-server/ui/src/features/RequestDetail.tsx",
    "apps/http-server/ui/src/domain/types.ts",
    "packages/core/src/types.ts",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "The UI hides request failure reasons instead of surfacing them",
    "Request diagnostics require opening data/router-state.json",
    "The task broadens into retry or capability refresh work"
  ]
}
```

## Objective

Upgrade request detail so a user can understand what happened during a routed agent request without reading raw state files.

## Scope

- Review current request detail modal and API/UI request shape after the protocol diagnostics foundation task.
- Surface source, target, status, task, timestamps, answer, error, parser diagnostics, and raw evidence pointers when available.
- Add parsed/raw answer sections using fields created by the foundation task.
- Add focused HTTP smoke coverage for request detail data returned by APIs where practical.
- Keep the activity panel and existing request actions working.

## Out of scope

- Core diagnostic model changes beyond small UI type alignment.
- Retry/cancel/archive action redesign.
- Capability refresh.
- Agent heartbeat status.
- Transcript search.

## Exit criteria

1. Request detail clearly distinguishes answered, failed, timeout, cancelled, archived, and parse-related failures when data is available.
2. The UI gives enough evidence and diagnostics to debug a bad route without opening `data/router-state.json`.
3. Existing HTTP smoke still passes and covers request detail data returned by APIs where practical.
4. `npm run test` and `npm run smoke:http` pass.

## Required checks

- `npm run test`
- `npm run smoke:http`

## Evaluator notes

Promote only if this is a narrow UI/API diagnostics slice. Do not promote core routing, retry, or capability refresh work under this task.

## Progress log

- Queue seeded for milestone 0.2 Ralph setup.
- 2026-06-28T13:42:43.899Z: restored as current task after request-protocol-diagnostics-foundation promotion.
- 2026-06-28T13:46:25Z: aligned UI request types with diagnosticStatus, parserDiagnostics, and rawEvidence; expanded request detail to show lifecycle, parsed answer, parser diagnostics, raw evidence, error, and timestamps.
- 2026-06-28T13:46:25Z: added HTTP smoke assertions that /api/state carries answered and archived request detail diagnostics for routed requests.
