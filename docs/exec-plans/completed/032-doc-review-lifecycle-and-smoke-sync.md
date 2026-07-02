# Doc review lifecycle and smoke sync

```json taskmeta
{
  "id": "doc-review-lifecycle-and-smoke-sync",
  "title": "Doc review lifecycle and smoke sync",
  "order": 32,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-30-first-user-docs-review.md",
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
    "docs/reviews/2026-06-30-first-user-docs-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/exec-plans/active/index.md",
    "scripts/smoke-docs.js",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "Docs smoke requires a deleted review document",
    "Product specs or active queue source links point at missing files",
    "Release verification can pass while local Markdown links are broken"
  ],
  "completed_at": "2026-06-30T10:20:00+09:00"
}
```

## Objective

Fix the first-time documentation review finding by aligning release docs and `smoke:docs` with the current review lifecycle.

## Scope

- Stop requiring deleted historical review files in `scripts/smoke-docs.js`.
- Treat existing files under `docs/reviews/` as the current review corpus.
- Update release-readiness product docs and active queue source review references so they point at existing documents.
- Add local Markdown link validation for the required release docs.

## Out of scope

- Reintroducing old review documents only to satisfy a stale smoke assertion.
- Changing runtime behavior for server startup, live proxying, or CLI state ownership.
- Starting milestone 0.3 planning.

## Exit criteria

1. `npm run smoke:docs` no longer fails because `docs/reviews/2026-06-29-fresh-operator-review.md` was removed.
2. Release-readiness docs and active queue docs point at existing review material.
3. Docs smoke validates current review docs and broken local Markdown links in the required docs set.
4. `npm run smoke:docs`, `npm run verify`, `git diff --check main...HEAD`, and `npm pack --dry-run` pass.
5. Ralph remains at `NONE` because this hardening follow-up is complete.

## Required checks

- `npm run smoke:docs`
- `npm run verify`
- `git diff --check main...HEAD`
- `npm pack --dry-run`

## Evaluator notes

This is a release-gate synchronization task. Keep the change focused on review-document lifecycle and docs verification, not on application runtime behavior.

## Progress log

- 2026-06-30: Seeded from `docs/reviews/2026-06-30-first-user-docs-review.md`.
- 2026-06-30T10:20:00+09:00: updated docs smoke to discover current review docs, added local Markdown link validation, and replaced stale source review references in release-readiness docs and active queue index.
