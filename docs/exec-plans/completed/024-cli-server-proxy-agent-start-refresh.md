# CLI server proxy for agent start and refresh

```json taskmeta
{
  "id": "cli-server-proxy-agent-start-refresh",
  "title": "CLI server proxy for agent start and refresh",
  "order": 24,
  "status": "completed",
  "next_task_on_success": "health-running-server-mcp-url",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-fresh-operator-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "packages/core/src/capabilities.ts",
    "scripts/smoke-cli-controls.js",
    "scripts/smoke-http.js",
    "docs/product-specs/release-readiness-review-fixes.md",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "A mutating CLI command still bypasses a compatible running server without an explicit reason",
    "Agent bootstrap placeholder behavior regresses for permission-required or mcp-configuring agents",
    "Capability refresh writes different summaries depending on whether it runs through CLI or HTTP"
  ],
  "completed_at": "2026-06-29T09:35:00+09:00"
}
```

## Objective

Close the remaining normal-operator CLI mutation gaps after `register` and `ask`, especially visible agent bootstrap records and capability refresh, so mixed CLI/UI usage has one live state owner.

## Scope

- Audit CLI commands that mutate router state.
- For compatible running HTTP servers, make CLI agent start placeholders for `mair codex` and `mair claude` update the server-owned live state instead of only writing the state file.
- For compatible running HTTP servers, make capability refresh use a server mutation path or add the minimal server endpoint needed for the same effect.
- Confirm existing request action proxy behavior still works and does not need duplicate handling.
- Document any CLI mutation intentionally left as local-only, with a reason and a smoke/docs guard if user-visible.
- Add smoke coverage for at least one blocked agent bootstrap placeholder and one capability refresh while the HTTP server is running.

## Out of scope

- Reworking permission prompts or MCP setup flows beyond preserving their existing blocked/pending records.
- Building a general distributed state synchronization system.
- Changing command names or the public CLI contract.

## Exit criteria

1. A compatible running server sees CLI-created Codex/Claude placeholder records without restart.
2. Capability refresh performed from the CLI is reflected in `/api/state` when a compatible server is running.
3. No normal mutating CLI command identified in the audit can silently overwrite server-owned live state; either it proxies, is read-only, or is explicitly documented as local-only with a guard.
4. Agent bootstrap reliability docs remain accurate for blocked and pending states.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

Keep this task focused on state ownership consistency. If a command needs a new HTTP endpoint, prefer a narrow endpoint that reuses existing core helpers and response shapes.

## Progress log

- 2026-06-29: Seeded from fresh operator review Finding 1 "other mutating commands" guidance.
- 2026-06-29T09:35:00+09:00: routed CLI visible agent placeholder saves through a matching running HTTP server while leaving tmux session creation in the CLI process. Added server-side capability refresh endpoint and made CLI refresh proxy to it when the server owns live state. Smoke now covers visible placeholder state and capability refresh in `/api/state`. Required checks passed: `npm run test`, `npm run smoke:cli-controls`, `npm run smoke:http`, and `npm run smoke:docs`.
