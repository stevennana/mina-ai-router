# Server start readiness and bind failure

```json taskmeta
{
  "id": "server-start-readiness-and-bind-failure",
  "title": "Server start readiness and bind failure",
  "order": 29,
  "status": "completed",
  "next_task_on_success": "live-proxy-stale-pid-diagnostics",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-fresh-operator-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/HTTP-UI-MCP.md",
    "docs/TROUBLESHOOTING.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "mair server start can still print running:true before /api/health is reachable",
    "A port conflict leaves a pid file that looks like a healthy Mina server",
    "The readiness check makes normal server startup flaky or much slower"
  ],
  "completed_at": "2026-06-30T09:55:00+09:00"
}
```

## Objective

Fix the deep operator review Finding 1: `mair server start` must not report success when the child HTTP server fails to bind, especially on `EADDRINUSE`.

## Scope

- Change `mair server start` so it waits for a Mina readiness signal before reporting success.
- Use `GET /api/health` or an equivalent local readiness probe against the requested host and port.
- If the child exits early or readiness never succeeds, return a non-zero CLI error with an actionable message and a short log excerpt when available.
- Avoid writing a healthy-looking pid file until readiness is confirmed.
- Add or improve HTTP server `error` handling so bind failures are logged intentionally.
- Extend CLI smoke coverage with an occupied-port case.

## Out of scope

- Adding daemon supervision or automatic port selection.
- Changing the public `mair server start/status/stop` command names.
- Reworking MCP or UI routes.
- Changing production logging beyond startup failure clarity.

## Exit criteria

1. Starting Mina on an occupied port does not print `running: true`.
2. The failed start exits non-zero or returns a clearly failed status with an actionable `EADDRINUSE`/bind diagnostic.
3. The failed start does not leave a pid file that `mair server status` treats as a healthy Mina server.
4. Normal `mair server start --port <free>` still returns the same healthy status shape after readiness is confirmed.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`

## Evaluator notes

Prefer a bounded readiness loop over a fixed sleep. The implementation should remain local and deterministic: no external network, no long waits, and no false success when the child is already gone.

## Progress log

- 2026-06-30: Seeded from deep operator review Finding 1.
- 2026-06-30T09:55:00+09:00: implemented bounded `/api/health` readiness before writing/reporting a healthy pid file, added startup failure log excerpts, and added HTTP server startup error logging. CLI controls smoke now occupies a port and verifies `server start` fails clearly without reporting `running: true`. Required checks passed: `npm run test` and `npm run smoke:cli-controls`.
