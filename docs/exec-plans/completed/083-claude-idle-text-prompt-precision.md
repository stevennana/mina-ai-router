# Claude idle text prompt precision

```json taskmeta
{
  "id": "claude-idle-text-prompt-precision",
  "title": "Claude idle text prompt precision",
  "order": 83,
  "status": "completed",
  "next_task_on_success": "claude-devnull-readonly-approval",
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
    "scripts/core-tests.js",
    "scripts/smoke-http.js"
  ]
}
```

## Objective

Stop treating Claude's final explanatory text or idle footer as an active permission prompt.

## Scope

- Require an interactive approval UI shape before generic Claude permission text becomes `permission-approval`.
- Keep real approval prompts with `Do you want to proceed?` and choices, `Enter to confirm`, folder trust, or `Press Enter to continue` detectable.
- Add fixtures for final narrative text containing "permission prompt" followed by idle Claude footer.
- Verify confirmed agents with only idle text clear stale `permission-required` during terminal capture.

## Exit criteria

1. Idle Claude footer and explanatory text do not produce `permission-approval`.
2. Actual Claude approval UI still produces a prompt.
3. A confirmed stale-permission Claude fixture clears to a non-blocked bootstrap state on terminal capture.
4. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from the fourth real 6-repo follow-up P1.
- Completed: generic Claude permission detection now requires interactive approval UI, and HTTP smoke verifies stale confirmed permission state clears for idle Claude text.
