# CLI server proxy for register and ask

```json taskmeta
{
  "id": "cli-server-proxy-register-ask",
  "title": "CLI server proxy for register and ask",
  "order": 23,
  "status": "completed",
  "next_task_on_success": "cli-server-proxy-agent-start-refresh",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-fresh-operator-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/HTTP-UI-MCP.md",
    "docs/USER-START-GUIDE.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls",
    "npm run smoke:http"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "packages/core/src/file-state.ts",
    "scripts/smoke-cli-controls.js",
    "scripts/smoke-http.js",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "CLI mutating commands write directly to the state file while a matching HTTP server is running",
    "The fix requires changing the router state file format in a way that breaks existing state files",
    "Server proxy fallback prevents offline CLI register or ask from working when no server is running"
  ],
  "completed_at": "2026-06-29T09:35:00+09:00"
}
```

## Objective

Fix the fresh operator review P1 reproduction for `mair register` and `mair ask`: when a compatible HTTP server is already running for the same state file, these CLI mutations must go through the server so the UI/API and persisted file stay in sync.

## Scope

- Detect a running HTTP server whose recorded state path resolves to the current CLI state path.
- Proxy CLI `register` to the server's register API when that compatible server is running.
- Proxy CLI `ask` to the server's ask API when that compatible server is running.
- Preserve the existing local file behavior when no compatible server is running.
- Add smoke coverage that starts the server with isolated state, runs CLI `register alpha`, verifies `/api/state` sees `alpha`, then registers `beta` through HTTP and verifies the file contains both agents.
- Add smoke coverage that starts the server, runs CLI `ask`, and verifies `/api/state` sees the resulting request.

## Out of scope

- Auditing every other mutating CLI command.
- Redesigning the full file-state concurrency model.
- Adding multi-process file locks or a state revision format unless required to complete this narrow proxy path safely.

## Exit criteria

1. With a running matching HTTP server, CLI `register alpha` is visible in `/api/state` without restarting the server.
2. A later HTTP `/api/register beta` preserves `alpha` in the persisted state file.
3. With a running matching HTTP server, CLI `ask alpha ...` creates a request visible through `/api/state`.
4. With no compatible server running, CLI `register` and `ask` keep their existing local behavior.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`
- `npm run smoke:http`

## Evaluator notes

Prefer extending the existing server-status and request-action proxy patterns over introducing a second state synchronization mechanism. The result should make the server the live state owner while it is running, but it must not make ordinary offline CLI usage depend on the HTTP server.

## Progress log

- 2026-06-29: Seeded from fresh operator review Finding 1.
- 2026-06-29T09:35:00+09:00: implemented matching-server proxy helpers for CLI `register` and `ask`, preserving offline fallback behavior. Added smoke coverage proving CLI register appears in `/api/state`, later HTTP register preserves the CLI agent, and CLI ask appears in server-owned request state. Required checks passed: `npm run test`, `npm run smoke:cli-controls`, and `npm run smoke:http`.
