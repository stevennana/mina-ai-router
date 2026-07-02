# Claude read-only registration approvals

```json taskmeta
{
  "id": "claude-readonly-registration-approvals",
  "title": "Claude read-only registration approvals",
  "order": 78,
  "status": "completed",
  "next_task_on_success": "six-repo-bootstrap-revalidation-docs",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/release-readiness-review-fixes.md"
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

Classify Claude read-only registration context Bash approvals as scoped guided actions when they are safe enough to approve from Mina.

## Scope

- Extend Claude scoped command approval detection for real prompt phrases such as `Contains simple_expansion`, `This command requires approval`, and shell-operator approval text.
- Allow project-scoped read-only context commands and tmux session context probes.
- Keep mutation, network, package-manager, and unsafe commands manual-only.
- Continue the registration loop after approving a scoped read-only registration command.

## Exit criteria

1. Real-style Claude read-only context prompts become `scoped-command-approval`.
2. Unsafe commands under the project root remain `permission-approval`.
3. Approving a scoped registration command resumes self-registration when the agent remains pending.
4. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from the second real 6-repo follow-up P1.
- Completed: Claude read-only context prompts for project file scans and tmux context probes are guided when safe, unsafe commands remain manual, and scoped approvals resume registration.
