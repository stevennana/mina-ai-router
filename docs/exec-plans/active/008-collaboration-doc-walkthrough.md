# Collaboration doc walkthrough

```json taskmeta
{
  "id": "collaboration-doc-walkthrough",
  "title": "Collaboration documentation walkthrough",
  "order": 8,
  "status": "active",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "README.md",
    "docs/USER-START-GUIDE.md",
    "docs/MCP-CLIENT-SETUP.md",
    "docs/product-specs/request-diagnostics-and-controls.md"
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
    "The walkthrough does not explain a two-agent collaboration",
    "Docs describe UI controls that no longer exist",
    "The task changes application code"
  ]
}
```

## Objective

Update user-facing docs after 0.2 reliability features land so first-time users can run and inspect a two-agent collaboration.

## Scope

- Add or revise a two-agent collaboration walkthrough.
- Explain request diagnostics, retry/recovery, capability freshness, and health states.
- Remove obsolete UI wording.

## Out of scope

- Application code changes.
- New screenshots unless needed and already available.

## Exit criteria

1. Docs describe the current 0.2 collaboration flow accurately.
2. The walkthrough can be followed from install to routed request inspection.
3. Docs image links and required walkthrough phrases are verified by `npm run smoke:docs`.
4. `npm run test` passes.

## Required checks

- `npm run test`
- `npm run smoke:docs`

## Evaluator notes

This is deterministic-only because docs plus existing tests should be sufficient.

## Progress log

- Queue seeded for milestone 0.2 Ralph setup.
- 2026-06-29T03:22:26.880Z: restored as current task after agent-health-ui-cli promotion.
