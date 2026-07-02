# Codex latest prompt segment detection

```json taskmeta
{
  "id": "codex-latest-prompt-segment-detection",
  "title": "Codex latest prompt segment detection",
  "order": 72,
  "status": "completed",
  "next_task_on_success": "pending-registration-retry-confirmed-at",
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

Classify Codex update blockers from the latest interactive prompt state, not stale menu text in tmux scrollback.

## Scope

- Treat a normal Codex `›` prompt after an update menu as usable.
- Keep active update menus classified as `client-update`.
- Add real-style fixtures with stale update menu text above a normal prompt.

## Exit criteria

1. Stale update menu text followed by a normal `›` prompt does not produce `client-update`.
2. Latest active update menus still produce `client-update`.
3. HTTP smoke prevents `skip-codex-update` from appearing on a normal Codex prompt.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Progress log

- Seeded from real 6-repo follow-up P1.
- Completed: Codex update classification now anchors to the latest interactive segment, so stale update menus above a normal prompt do not block registration.
