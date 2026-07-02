# Bootstrap state model

```json taskmeta
{
  "id": "bootstrap-state-model",
  "title": "Bootstrap state model",
  "order": 9,
  "status": "completed",
  "next_task_on_success": "permission-trust-readiness",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/references/main-branch-usage-feedback-2026-06-29.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http"
  ],
  "required_files": [
    "packages/core/src/types.ts",
    "packages/core/src/registry.ts",
    "apps/http-server/src/index.ts"
  ],
  "human_review_triggers": [
    "The task changes request routing behavior beyond bootstrap fields",
    "The migration would discard existing router-state agent records",
    "The implementation introduces a new storage backend"
  ],
  "completed_at": "2026-06-29T05:10:28.533Z"
}
```

## Objective

Add the persistent bootstrap state fields needed to distinguish a created agent record from a ready collaborator.

## Scope

- Define bootstrap state values and registration metadata in the shared core types.
- Default existing agents to a backward-compatible ready or unknown bootstrap state.
- Persist bootstrap metadata in the registry without breaking existing router-state files.
- Expose bootstrap state through the HTTP agent list response.

## Out of scope

- Prompt detection.
- MCP setup execution.
- UI redesign beyond making the field available to existing consumers.

## Exit criteria

1. Agent records can store `bootstrapStatus`, `registrationSource`, `registrationStatus`, `lastRegistrationAttemptAt`, `confirmedByAgentAt`, and optional `sessionFingerprint`.
2. Existing state files continue to load without manual migration.
3. HTTP agent list output includes bootstrap metadata.
4. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:http`

## Evaluator notes

This is deterministic-only because type, registry, and HTTP smoke coverage should prove the state model exists and remains compatible.

## Progress log

- 2026-06-29: Seeded from main-branch pain point gap review.
- 2026-06-29: Added bootstrap and registration metadata fields to shared Agent and AgentStatus types. AgentRegistry now normalizes older agent records with backward-compatible `ready` / `confirmed` defaults, preserves metadata across capability and health updates, and HTTP agent status responses include the new fields. `/api/register` marks direct registrations ready/confirmed, while Web UI tmux creation records a created/pending web-ui placeholder. Added core and HTTP smoke assertions for state compatibility and response exposure. Required checks passed: `npm run test`, `npm run smoke:http`.
- 2026-06-29T05:10:28.533Z: automatically promoted after deterministic checks and evaluator approval.
