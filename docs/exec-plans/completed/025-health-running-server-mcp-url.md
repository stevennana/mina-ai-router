# Health running server MCP URL

```json taskmeta
{
  "id": "health-running-server-mcp-url",
  "title": "Health running server MCP URL",
  "order": 25,
  "status": "completed",
  "next_task_on_success": "fresh-operator-smoke-hardening",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-fresh-operator-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/MCP-CLIENT-SETUP.md",
    "docs/USER-START-GUIDE.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls",
    "npm run smoke:docs"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "docs/MCP-CLIENT-SETUP.md",
    "docs/USER-START-GUIDE.md",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "health reports an MCP URL that disagrees with a running matching server status",
    "health uses a stale pid file for a different state path",
    "The fix changes server start/status output shape in a breaking way"
  ],
  "completed_at": "2026-06-29T09:35:00+09:00"
}
```

## Objective

Fix fresh operator review Finding 2 so `mair health` reports the running server's actual MCP URL when `mair server start --port` was used for the same state file.

## Scope

- Have health inspect server status before falling back to `MINA_HTTP_HOST` / `MINA_HTTP_PORT` defaults.
- Use the running server's `mcpUrl` only when its state path resolves to the same state path as the current CLI invocation.
- Keep existing default URL behavior when no matching server is running.
- Add CLI smoke coverage for a non-default server port.
- Update docs only if health output examples or MCP setup instructions need clarification.

## Out of scope

- Changing the server pid file format except for backward-compatible additions.
- Making health perform network calls to validate every MCP client.
- Changing default host or port values.

## Exit criteria

1. Start the server on a non-default port with isolated pid/state files.
2. `mair server status` reports the non-default MCP URL.
3. `mair health` reports the same MCP URL for the same state path.
4. A stale or different-state pid file does not override the configured/default health URL.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`
- `npm run smoke:docs`

## Evaluator notes

This task should be smaller than the state ownership tasks. Prefer a direct same-state server-status lookup inside the health path and keep fallback behavior obvious.

## Progress log

- 2026-06-29: Seeded from fresh operator review Finding 2.
- 2026-06-29T09:35:00+09:00: changed `mair health` to prefer the matching running server's recorded MCP URL and added CLI smoke coverage for a non-default server port. Required checks passed: `npm run test`, `npm run smoke:cli-controls`, and `npm run smoke:docs`.
