# Review cleanup safe docs gate

```json taskmeta
{
  "id": "review-cleanup-safe-docs-gate",
  "title": "Review cleanup safe docs gate",
  "order": 33,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/exec-plans/active/index.md",
    "scripts/smoke-docs.js"
  ],
  "required_commands": [
    "npm run smoke:docs",
    "npm run verify",
    "git diff --check main...HEAD",
    "npm pack --dry-run"
  ],
  "required_files": [
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/exec-plans/active/index.md",
    "scripts/smoke-docs.js",
    "state/backlog.md",
    "state/run-log.md"
  ],
  "human_review_triggers": [
    "Docs smoke exact-matches a resolved review filename",
    "Product specs or active queue docs link to ephemeral review files",
    "Runtime history contains stale local Markdown links"
  ],
  "completed_at": "2026-06-30T10:45:00+09:00"
}
```

## Objective

Make review-file cleanup safe after resolved findings are summarized in durable product specs and completed exec plans.

## Scope

- Remove exact review filename assertions from `scripts/smoke-docs.js`.
- Allow `docs/reviews/` to be empty after resolved review files are deleted.
- Replace active/product links to ephemeral review files with durable summary wording.
- Fix the stale `state/run-log.md` link to the completed request-retry task path.
- Delete the resolved first-time user review file and verify docs smoke still passes.

## Out of scope

- Changing runtime behavior.
- Rewriting historical task metadata that stores old review paths as plain provenance.
- Starting a new milestone wave.

## Exit criteria

1. `npm run smoke:docs` passes with no files under `docs/reviews/`.
2. `npm run verify`, `git diff --check main...HEAD`, and `npm pack --dry-run` pass.
3. Product spec and active queue docs do not link to deleted review files.
4. The known stale `state/run-log.md` Markdown link points at the completed task path.
5. Ralph remains at `NONE`.

## Required checks

- `npm run smoke:docs`
- `npm run verify`
- `git diff --check main...HEAD`
- `npm pack --dry-run`

## Evaluator notes

Keep this as a release docs gate cleanup. Historical plain-text provenance in completed task metadata may continue to mention old review paths, but active docs and smoke assertions must not depend on ephemeral review files.

## Progress log

- 2026-06-30: Seeded from the follow-up documentation review finding that 032 still hard-required the current review file.
- 2026-06-30T10:45:00+09:00: removed exact review file assertions, switched active/product docs to durable source summaries, fixed the stale run-log Markdown link, and deleted the resolved review file.
