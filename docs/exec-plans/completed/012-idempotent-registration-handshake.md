# Idempotent registration handshake

```json taskmeta
{
  "id": "idempotent-registration-handshake",
  "title": "Idempotent registration handshake",
  "order": 12,
  "status": "completed",
  "next_task_on_success": "caller-identity-self-avoidance",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:cli-controls"
  ],
  "required_files": [
    "packages/core/src/registry.ts",
    "apps/http-server/src/index.ts",
    "apps/http-server/ui/src"
  ],
  "human_review_triggers": [
    "The task changes public agent ids for existing records",
    "Duplicate session fingerprints delete records automatically",
    "The registration prompt asks agents to create a new id after a UI placeholder exists"
  ],
  "completed_at": "2026-06-29T05:50:08.686Z"
}
```

## Objective

Make Web UI-created placeholder records and agent self-registration converge into one confirmed agent.

## Scope

- Distinguish placeholder creation from agent-confirmed registration.
- Add idempotent merge behavior for matching agent id or session fingerprint.
- Update startup/self-registration prompt text to confirm an existing record.
- Warn on suspicious duplicate session fingerprints.

## Out of scope

- Automatic destructive deduplication.
- Workspace profile design.
- Capability profiling beyond preserving or refreshing metadata.

## Exit criteria

1. Creating an agent from the UI records a placeholder status.
2. Agent self-registration confirms or updates that record instead of creating a duplicate flow.
3. Repeated registration attempts update `lastRegistrationAttemptAt` and keep a clear source/status history.
4. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:cli-controls`

## Evaluator notes

Use deterministic tests for merge behavior and preserve current agent ids unless explicitly changed by the user.

## Progress log

- 2026-06-29: Seeded from pain point 6.
- 2026-06-29T05:36:38.374Z: restored as current task after mcp-preflight-agent-create promotion.
- 2026-06-29T05:49:02.300Z: implemented sessionFingerprint-based idempotent registration, confirmation history, duplicate warnings, and updated HTTP/CLI/MCP self-registration tests.
- 2026-06-29T05:50:08.686Z: automatically promoted after deterministic checks and evaluator approval.
