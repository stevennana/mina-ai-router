# Claude folder trust guided action

```json taskmeta
{
  "id": "claude-folder-trust-guided-action",
  "title": "Claude folder trust guided action",
  "order": 75,
  "status": "completed",
  "next_task_on_success": "cli-equals-flag-parser",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-02-real-6repo-usage-review.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "packages/transports/src/tmux/tmux-client.ts",
    "apps/http-server/src/index.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js"
  ]
}
```

## Objective

Expose a guided action for deterministic Claude folder trust prompts scoped to the selected project root.

## Scope

- Split Claude folder trust from generic permission approval.
- Require current project root evidence or its `/private`-resolved equivalent.
- Continue self-registration recovery after approval when registration is still pending.

## Exit criteria

1. Scoped Claude folder trust prompts expose `approve-claude-project-trust`.
2. Unscoped Claude trust remains manual.
3. Approval can continue into self-registration retry without empty actions.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from real 6-repo follow-up P2.
- Completed: Claude folder trust prompts scoped to the selected project root now expose a guided approval action and can continue registration recovery.
