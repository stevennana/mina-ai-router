# Bootstrap docs and smoke hardening

```json taskmeta
{
  "id": "bootstrap-docs-and-smoke-hardening",
  "title": "Bootstrap documentation and smoke hardening",
  "order": 18,
  "status": "queued",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "README.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/USER-START-GUIDE.md",
    "docs/MCP-CLIENT-SETUP.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:docs"
  ],
  "required_files": [
    "README.md",
    "docs/USER-START-GUIDE.md",
    "docs/MCP-CLIENT-SETUP.md",
    "scripts/smoke-docs.js"
  ],
  "human_review_triggers": [
    "Docs claim an automatic permission or MCP setup path that the code does not implement",
    "Smoke docs become coupled to generated asset hashes",
    "The active queue still describes completed tasks as next work"
  ]
}
```

## Objective

Update operator-facing documentation and smoke checks after the bootstrap reliability wave lands.

## Scope

- Document Web UI and CLI agent creation readiness states.
- Explain MCP preflight, idempotent registration, self-call avoidance, capability quality, and long transaction recovery.
- Refresh `scripts/smoke-docs.js` so docs tests guard the new user journey.
- Ensure active queue and roadmap wording reflect the completed bootstrap wave.

## Out of scope

- New product features.
- Screenshots unless existing assets are already available and current.

## Exit criteria

1. A first-time user can understand when a newly created agent is ready to collaborate.
2. Docs accurately describe the implemented bootstrap reliability states and controls.
3. `npm run smoke:docs` verifies the new journey.
4. `npm run test` passes.

## Required checks

- `npm run test`
- `npm run smoke:docs`

## Evaluator notes

This task closes the queue. Do not promote it until docs match actual implementation from tasks 009-017.

## Progress log

- 2026-06-29: Renumbered as final documentation and smoke hardening task after splitting capability and transaction work into smaller slices.
