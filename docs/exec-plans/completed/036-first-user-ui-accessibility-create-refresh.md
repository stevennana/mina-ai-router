# First user UI accessibility and create refresh

```json taskmeta
{
  "id": "first-user-ui-accessibility-create-refresh",
  "title": "First user UI accessibility and create refresh",
  "order": 36,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-30-first-user-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "apps/http-server/ui/src/features/AskAgentForm.tsx",
    "apps/http-server/ui/src/features/AgentDetailsForm.tsx",
    "apps/http-server/ui/src/features/CreateTmuxAgentForm.tsx",
    "apps/http-server/ui/src/App.tsx",
    "scripts/smoke-http.js"
  ],
  "required_commands": [
    "npm run smoke:http",
    "npm run smoke:docs",
    "npm run verify",
    "git diff --check main...HEAD",
    "npm pack --dry-run"
  ],
  "required_files": [
    "apps/http-server/ui/src/features/AskAgentForm.tsx",
    "apps/http-server/ui/src/features/AgentDetailsForm.tsx",
    "apps/http-server/ui/src/features/CreateTmuxAgentForm.tsx",
    "apps/http-server/ui/src/App.tsx",
    "scripts/smoke-http.js",
    "docs/product-specs/release-readiness-review-fixes.md",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "Ask dialog task label is not programmatically associated with its textarea",
    "UI-created tmux agent does not appear until manual refresh",
    "Smoke coverage cannot prove form-label accessibility or create-agent state refresh"
  ],
  "completed_at": "2026-06-30T12:30:00+09:00"
}
```

## Objective

Fix the first-user review accessibility and Web UI create-agent feedback findings.

## Scope

- Give the Ask dialog task textarea an explicit `id` and associated `htmlFor` label.
- Apply the same explicit label/input association to capability edit fields.
- Have `CreateTmuxAgentForm` return the create API's updated state to `App`.
- Apply the returned state immediately and keep the created agent selected, instead of relying on a manual or asynchronous top-level refresh.
- Add HTTP smoke assertions for these reviewed regressions.

## Out of scope

- Redesigning modal layout.
- Adding a full browser automation suite.
- Changing tmux startup or MCP preflight behavior.
- Starting milestone 0.3 work.

## Exit criteria

1. The Ask dialog `Task` label is explicitly associated with exactly one textarea in source and bundled UI.
2. Capability edit fields have explicit label/input associations.
3. UI-created tmux agents update the in-memory React state from the create API response immediately.
4. The created agent remains selected after creation.
5. Required commands pass.

## Required checks

- `npm run smoke:http`
- `npm run smoke:docs`
- `npm run verify`
- `git diff --check main...HEAD`
- `npm pack --dry-run`

## Evaluator notes

Keep the fix focused on first-user confidence and accessibility. The create API already returns the updated state; the UI should consume it directly instead of adding another server round trip.

## Progress log

- 2026-06-30: Seeded from `docs/reviews/2026-06-30-first-user-review.md` Findings 1 and 2.
- 2026-06-30T12:30:00+09:00: added explicit form label associations, wired create-agent callbacks to apply returned state immediately, and added HTTP smoke source/bundle assertions. `npm run build` and `npm run smoke:http` passed before final verification.
