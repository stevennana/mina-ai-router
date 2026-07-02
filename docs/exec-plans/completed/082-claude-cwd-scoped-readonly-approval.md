# Claude cwd-scoped read-only approval

```json taskmeta
{
  "id": "claude-cwd-scoped-readonly-approval",
  "title": "Claude cwd-scoped read-only approval",
  "order": 82,
  "status": "completed",
  "next_task_on_success": null,
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-02-real-6repo-usage-review.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:docs",
    "npm run smoke:cli-controls"
  ],
  "required_files": [
    "packages/transports/src/tmux/tmux-client.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js"
  ]
}
```

## Objective

Guide Claude read-only context commands that rely on the tmux session cwd instead of an explicit `cd <projectRoot>` prefix.

## Scope

- Treat relative read-only context probes as scoped when they contain only allow-listed read operations.
- Keep unsafe, mutation, network, package-manager, parent traversal, and external redirection commands manual-only.
- Preserve project-root-scoped and tmux context probe behavior.
- Add a real-style fixture for the cwd-scoped `ls -la && echo ... for f ...` prompt.

## Exit criteria

1. Cwd-scoped read-only context prompts become `scoped-command-approval`.
2. Unsafe relative or project-root commands remain generic manual approval.
3. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`
- `npm run smoke:cli-controls`

## Progress log

- Seeded from the third real 6-repo follow-up P1.
- Completed: cwd-scoped Claude read-only file inspection prompts now expose the scoped guided approval action while unsafe commands remain manual-only.
