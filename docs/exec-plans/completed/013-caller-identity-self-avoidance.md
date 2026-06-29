# Caller identity and self avoidance

```json taskmeta
{
  "id": "caller-identity-self-avoidance",
  "title": "Caller identity and self-call avoidance",
  "order": 13,
  "status": "completed",
  "next_task_on_success": "capability-profile-schema-scoring",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/MCP-CLIENT-SETUP.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:mcp"
  ],
  "required_files": [
    "packages/mcp/src",
    "packages/core/src",
    "scripts/smoke-mcp.js"
  ],
  "human_review_triggers": [
    "The task makes caller identity depend only on display name",
    "Self-calls are silently rerouted",
    "The MCP API response shape changes without docs or compatibility handling"
  ],
  "completed_at": "2026-06-29T05:57:08.488Z"
}
```

## Objective

Let an agent recognize its own registry entry and prevent accidental self-targeted calls.

## Scope

- Add caller identity inference or explicit caller context to MCP handling.
- Mark the caller's own entry as `isSelf` in `list_agents` results when known.
- Make `call_agent` reject self-targets by default with a clear error.
- Allow an explicit override such as `allowSelfCall: true` for diagnostic cases.
- Update collaboration prompt docs.

## Out of scope

- Authentication.
- Cross-machine identity.
- Team routing policies.

## Exit criteria

1. MCP `list_agents` can mark the current caller as self.
2. MCP `call_agent` blocks accidental self-calls with actionable output.
3. The first implementation uses explicit `sourceAgent` or a persisted session fingerprint before falling back to unknown; display name alone is not a valid identity source.
4. Existing callers without identity remain backward compatible.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:mcp`

## Evaluator notes

Prefer a stable session fingerprint or explicit source id over fragile name matching.

## Progress log

- 2026-06-29: Seeded from pain point 4.
- 2026-06-29T05:50:08.686Z: restored as current task after idempotent-registration-handshake promotion.
- 2026-06-29T05:56:27.300Z: added explicit MCP caller identity fields, self markers in list_agents, default self-call rejection, diagnostic allowSelfCall override, and deterministic core/MCP smoke coverage.
- 2026-06-29T05:57:08.488Z: automatically promoted after deterministic checks and evaluator approval.
