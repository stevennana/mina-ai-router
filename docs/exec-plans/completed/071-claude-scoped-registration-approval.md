# Claude scoped registration approval

```json taskmeta
{
  "id": "claude-scoped-registration-approval",
  "title": "Claude scoped registration approval",
  "order": 71,
  "status": "completed",
  "next_task_on_success": null,
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/design-docs/agent-bootstrap-reliability.md"
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
  ],
  "human_review_triggers": [
    "Claude command approval is broadly auto-approved",
    "Scoped approval does not verify projectRoot",
    "Unknown Claude permission prompts stop being manual"
  ]
}
```

## Objective

Add a guided action for Mina-owned Claude registration command approvals only when they are scoped to the selected project root.

## Scope

- Add a specific Claude prompt kind for scoped registration command approval.
- Expose a guided approval action for project-root-scoped Mina registration commands.
- Keep broad or unknown Claude permission prompts manual.
- Add deterministic fixtures for scoped and unscoped Claude command approval prompts.

## Out of scope

- Full autonomous Claude permission management.
- Approving arbitrary Bash prompts.
- Real Claude account-dependent CI.

## Exit criteria

1. Project-root-scoped Mina registration command approvals produce a guided action.
2. Unscoped or unknown Claude approvals remain manual.
3. HTTP smoke proves the guided action sends only the approval input and does not immediately inject a duplicate registration prompt.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

Do not promote if scoped approval is based only on the word `Claude` or `permission`. It must include command evidence scoped to `agent.projectRoot` and Mina registration intent.

## Progress log

- Seeded from real 6-repo usage review P2: Claude registration can stop on a scoped Bash approval with only a manual terminal path.
- Completed: Claude scoped Mina registration command approvals now surface a guided action only when the command is project-root scoped and registration-related.
