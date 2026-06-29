# Capability profile UI and CLI

```json taskmeta
{
  "id": "capability-profile-ui-cli",
  "title": "Capability profile UI and CLI",
  "order": 15,
  "status": "completed",
  "next_task_on_success": "request-lease-state",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/product-specs/agent-capability-refresh.md"
  ],
  "required_commands": [
    "npm run build",
    "npm run smoke:http",
    "npm run smoke:tmux"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "apps/http-server/ui/src"
  ],
  "human_review_triggers": [
    "Thin capability summaries are presented as strong",
    "Manual capability editing is removed",
    "The UI hides the evidence behind the capability profile"
  ],
  "completed_at": "2026-06-29T06:14:06.287Z"
}
```

## Objective

Expose structured capability profile quality and evidence in the UI and CLI while preserving manual edit paths.

## Scope

- Show capability quality (`strong`, `thin`, `missing`) in CLI and Web UI agent detail surfaces.
- Display capability evidence and answerable domains where space allows.
- Keep manual capability editing and generated refresh flows compatible with structured profile fields.
- Update HTTP responses needed by the UI.

## Out of scope

- New capability scoring algorithms.
- Deep code indexing.
- Replacing manual capability summaries.

## Exit criteria

1. CLI output exposes capability quality and evidence for an agent.
2. Web UI agent detail exposes capability quality without hiding manual capability controls.
3. Thin capability profiles are visibly distinct from strong profiles.
4. Required checks pass.

## Required checks

- `npm run build`
- `npm run smoke:http`
- `npm run smoke:tmux`

## Evaluator notes

This task depends on `capability-profile-schema-scoring`. It should not change the scoring contract except to consume it.

## Progress log

- 2026-06-29: Split from the broader capability profiler quality gate plan.
- 2026-06-29T06:01:40.037Z: restored as current task after capability-profile-schema-scoring promotion.
- 2026-06-29T06:08:22.300Z: exposed capability quality, can-answer domains, and evidence in Web UI inspector/details; extended CLI refresh to parse/store structured profile data; added HTTP and tmux smoke coverage for profile surfaces.
- 2026-06-29T06:14:06.287Z: automatically promoted after deterministic checks and evaluator approval.
