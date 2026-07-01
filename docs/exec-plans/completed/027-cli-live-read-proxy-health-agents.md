# CLI live read proxy for health and agents

```json taskmeta
{
  "id": "cli-live-read-proxy-health-agents",
  "title": "CLI live read proxy for health and agents",
  "order": 27,
  "status": "completed",
  "next_task_on_success": "cli-live-read-offline-hardening",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-fresh-operator-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "README.md",
    "docs/USER-START-GUIDE.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "CLI read commands still reconstruct live status locally while a matching server is running",
    "The fix changes the public JSON shape of mair health or mair agents",
    "A running server for a different state file affects CLI reads for the current state file"
  ],
  "completed_at": "2026-06-29T10:25:00+09:00"
}
```

## Objective

Fix the deep operator review P2 finding: while a matching HTTP server is actively routing a request, CLI read commands must report the same live busy status as `/api/state` and `/api/health`.

## Scope

- Make `mair health` proxy to `/api/health` when `matchingLiveServerStatus()` finds a running server for the same resolved state path.
- Preserve the current health output shape as much as possible, including `version`, `statePath`, `tmuxAvailable`, `agents`, `requests`, and `mcp.httpUrl`.
- Make `mair agents` proxy to `/api/state` when the same matching server exists and print `{ agents: state.agents }`.
- Make `mair agent <id>` use the live server state when available, so detail status matches the UI during an active route.
- Keep local file fallback behavior when no matching server is running.
- Extend `scripts/smoke-cli-controls.js` with the review reproduction: hold a server-routed tmux request open, then assert `/api/health`, `mair health`, `/api/state`, `mair agents`, and `mair agent <id>` all report the target as `busy`.

## Out of scope

- Reworking `AgentRouter.busyAgents`.
- Adding new UI components.
- Changing MCP tool contracts.
- Changing request routing or cancellation semantics.

## Exit criteria

1. During an active server-routed request, `/api/health` and `mair health` both report `busy: 1` for the same state file.
2. During that same active request, `/api/state`, `mair agents`, and `mair agent <id>` report the target agent as `busy`.
3. CLI read commands ignore running servers whose pid file points at a different state path.
4. CLI read commands keep existing local fallback output when no matching server is running.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`

## Evaluator notes

Prefer reusing the existing matching-server helper and JSON fetch path introduced for CLI mutation proxying. The important product contract is simple: when the server owns live state, read commands should read from the server too.

## Progress log

- 2026-06-29: Seeded from deep operator review Finding 1.
- 2026-06-29T10:25:00+09:00: implemented live read proxying for `mair health`, `mair agents`, and `mair agent <id>` when a matching HTTP server owns the same state file. Added smoke coverage that holds a server-routed tmux request open and confirms `/api/health`, `mair health`, `/api/state`, `mair agents`, and `mair agent <id>` all report the target as busy. Required checks passed: `npm run test` and `npm run smoke:cli-controls`.
