# Capability profile schema and scoring

```json taskmeta
{
  "id": "capability-profile-schema-scoring",
  "title": "Capability profile schema and scoring",
  "order": 14,
  "status": "queued",
  "next_task_on_success": "capability-profile-ui-cli",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/product-specs/agent-capability-refresh.md"
  ],
  "required_commands": [
    "npm run test"
  ],
  "required_files": [
    "packages/core/src"
  ],
  "human_review_triggers": [
    "The scoring labels generic file mentions as strong",
    "Manual capability summaries can no longer be preserved",
    "The task depends on live LLM output for deterministic tests"
  ]
}
```

## Objective

Add structured capability profile storage and deterministic quality scoring so shallow summaries can be identified before UI work.

## Scope

- Add capability profile fields such as project purpose, languages, key areas, can answer, cannot answer, evidence, and quality.
- Preserve existing manual capability summaries and generated summaries during migration.
- Add deterministic quality scoring for `strong`, `thin`, and `missing`.
- Add unit fixtures for generic file-only summaries and evidence-backed summaries.

## Out of scope

- UI and CLI display changes.
- Deep semantic code indexing.
- Mandatory live LLM generation during tests.

## Exit criteria

1. Agent records can store structured capability profile data without losing existing capability summaries.
2. Generic summaries that only mention docs or directories are classified as `thin`.
3. Evidence-backed summaries with answerable domains can be classified as `strong`.
4. Unit tests cover scoring and backward-compatible storage.
5. Required checks pass.

## Required checks

- `npm run test`

## Evaluator notes

This slice intentionally stops before UI. Keep the quality gate deterministic and fixture-backed.

## Progress log

- 2026-06-29: Split from the broader capability profiler quality gate plan.
