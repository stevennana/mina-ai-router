# Claude devnull read-only approval

```json taskmeta
{
  "id": "claude-devnull-readonly-approval",
  "title": "Claude devnull read-only approval",
  "order": 84,
  "status": "completed",
  "next_task_on_success": null,
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/release-readiness-review-fixes.md"
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

Allow stderr suppression to `/dev/null` for otherwise read-only Claude registration scans.

## Scope

- Treat `2>/dev/null` and equivalent descriptor redirection to `/dev/null` as safe for read-only context commands.
- Continue rejecting writes to project, home, parent, or other absolute paths.
- Preserve mutation, network, package-manager, and traversal blockers.
- Add real-style fixtures for `cat CLAUDE.md 2>/dev/null || echo "none"` command shapes.

## Exit criteria

1. Read-only project-root scans using `/dev/null` stderr suppression become `scoped-command-approval`.
2. Unsafe redirection and mutation commands remain manual-only.
3. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`
- `npm run smoke:cli-controls`

## Progress log

- Seeded from the fourth real 6-repo follow-up P1.
- Completed: `/dev/null` stderr suppression is stripped before unsafe redirection checks for otherwise read-only registration context commands.
