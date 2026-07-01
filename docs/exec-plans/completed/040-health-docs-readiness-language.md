# Health docs readiness language

```json taskmeta
{
  "id": "health-docs-readiness-language",
  "title": "Health docs readiness language",
  "order": 40,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-health-docs-review.md",
    "docs/USER-START-GUIDE.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "scripts/smoke-docs.js"
  ],
  "required_commands": [
    "npm run smoke:docs",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "docs/USER-START-GUIDE.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "scripts/smoke-docs.js",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "User guide says needs-attention only means failed or timed-out routed requests",
    "First-run MCP setup blockers appear inconsistent with health state docs",
    "Docs do not explain newly created blocked agents can need attention before routing"
  ],
  "completed_at": "2026-07-01T14:45:00+09:00"
}
```

## Objective

Align first-user health documentation with the current readiness model.

## Scope

- Update the Web UI agent creation section to explain that newly created blocked agents may show `needs-attention`.
- Update the health state definition so `needs-attention` includes both routed-request failures and first-run readiness blockers.
- Add docs smoke coverage for the broader wording.
- Record the resolved review in the release-readiness product spec.

## Out of scope

- Changing health classification behavior.
- Changing route readiness enforcement.
- Adding new UI states.
- Starting milestone 0.3 work.

## Exit criteria

1. `docs/USER-START-GUIDE.md` explains `needs-attention` for failed/time-out requests and permission/MCP/registration blockers.
2. The Web UI create-agent section tells first users that a blocked new agent may show `needs-attention` until setup is completed.
3. `scripts/smoke-docs.js` protects the updated wording.
4. Required commands pass.

## Required checks

- `npm run smoke:docs`
- `git diff --check main...HEAD`

## Evaluator notes

This is a documentation alignment task. Do not change runtime health or routing logic unless a fresh code defect is found.

## Progress log

- 2026-07-01: Seeded from `docs/reviews/2026-07-01-first-user-health-docs-review.md`.
- 2026-07-01T14:45:00+09:00: updated User Start Guide and release-readiness docs so `needs-attention` covers both request failures and first-run readiness blockers.
