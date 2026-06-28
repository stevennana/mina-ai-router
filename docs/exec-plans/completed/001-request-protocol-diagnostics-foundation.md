# Request protocol diagnostics foundation

```json taskmeta
{
  "id": "request-protocol-diagnostics-foundation",
  "title": "Request protocol diagnostics foundation",
  "order": 1,
  "status": "completed",
  "next_task_on_success": "request-detail-diagnostics",
  "prompt_docs": [
    "AGENTS.md",
    "ARCHITECTURE.md",
    "docs/PRODUCT_SENSE.md",
    "docs/RELIABILITY.md",
    "docs/product-specs/request-diagnostics-and-controls.md",
    "docs/design-docs/collaboration-reliability.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:tmux",
    "npm run smoke:mcp"
  ],
  "required_files": [
    "packages/core/src/types.ts",
    "packages/core/src/request-store.ts",
    "packages/core/src/response-parser.ts",
    "packages/core/src/prompt-envelope.ts",
    "scripts/core-tests.js"
  ],
  "human_review_triggers": [
    "Request diagnostics are only present in UI state",
    "Raw evidence is stored without clear size or sensitivity boundaries",
    "The protocol change breaks existing call_agent behavior"
  ],
  "completed_at": "2026-06-28T13:42:43.899Z"
}
```

## Objective

Add the core request diagnostics foundation needed for reliable agent-to-agent debugging before changing UI surfaces.

## Scope

- Review request lifecycle fields, prompt envelope creation, response parsing, and request persistence.
- Add narrow fields for parser diagnostics, raw evidence pointers, or failure classification where the current model cannot distinguish failure modes.
- Preserve existing `call_agent`, `get_request_status`, and smoke behavior.
- Add focused core coverage for timeout, parse failure, answered, and archived/request status behavior where practical.

## Out of scope

- UI request detail layout.
- Retry/cancel/archive action redesign.
- Capability refresh.
- Long-term transcript search or export.

## Exit criteria

1. Core state can represent enough diagnostic information for UI/API request detail to explain answered, failed, timeout, cancelled, archived, and parse-related failures when available.
2. Existing MCP and tmux smoke flows still pass.
3. The added diagnostics do not require users to inspect `data/router-state.json` to understand basic failure class.
4. New or updated tests protect the diagnostic fields or parser classification.

## Required checks

- `npm run test`
- `npm run smoke:tmux`
- `npm run smoke:mcp`

## Evaluator notes

Promote only if this is a core/protocol foundation. Do not implement retry controls or capability refresh in this task.

## Progress log

- Added after exec-plan quality review to split core protocol work from UI request detail work.
- 2026-06-28: Added core request diagnostic status, parser diagnostics, and bounded raw transport capture evidence on answered, parse failure, timeout, cancelled, and archived request paths. Exposed diagnostics through MCP `get_request_status` and added focused core tests for parser classification, answered evidence, parse failure, timeout, cancelled, and archived behavior.
- 2026-06-28: `npm run test` passed. `npm run smoke:tmux` and `npm run smoke:mcp` rebuilt successfully but could not start tmux sessions in this sandbox because tmux returned `error connecting to /private/tmp/tmux-501/default (Operation not permitted)`.
- 2026-06-28T13:42:43.899Z: automatically promoted after deterministic checks and evaluator approval.
