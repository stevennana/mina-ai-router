# Route readiness enforcement

```json taskmeta
{
  "id": "route-readiness-enforcement",
  "title": "Route readiness enforcement",
  "order": 39,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-30-first-user-route-readiness-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "packages/core/src/router.ts",
    "packages/core/src/types.ts",
    "apps/http-server/ui/src/features/Inspector.tsx",
    "apps/http-server/ui/src/features/Menus.tsx",
    "scripts/core-tests.js",
    "scripts/smoke-http.js",
    "scripts/smoke-mcp.js"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:mcp",
    "npm run smoke:cli-controls",
    "npm run smoke:docs",
    "npm run verify",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "packages/core/src/router.ts",
    "packages/core/src/types.ts",
    "apps/http-server/ui/src/domain/types.ts",
    "apps/http-server/ui/src/domain/helpers.ts",
    "apps/http-server/ui/src/features/Inspector.tsx",
    "apps/http-server/ui/src/features/Menus.tsx",
    "apps/http-server/ui/src/App.tsx",
    "scripts/core-tests.js",
    "scripts/smoke-http.js",
    "scripts/smoke-mcp.js",
    "docs/product-specs/release-readiness-review-fixes.md",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "Non-ready agents can still receive normal routed work",
    "MCP call_agent creates requests for mcp-configuring or registration-pending agents",
    "Web UI exposes an enabled Ask action for routeBlocked agents"
  ],
  "completed_at": "2026-06-30T23:55:00+09:00"
}
```

## Objective

Prevent normal routing controls from sending work to agents that are visible but not ready for collaboration.

## Scope

- Add shared route-readiness metadata to `AgentStatus`.
- Reject `callAgent` before request creation when the target has known bootstrap, registration, MCP, missing, stale, busy, or attention blockers.
- Return an actionable HTTP 409 for `/api/ask` readiness failures.
- Expose `routeReady` and `routeBlockedReason` through MCP `list_agents`, CLI/API state, and UI state.
- Disable Web UI Inspector and context-menu `Ask` actions for non-route-ready agents and show the blocker reason.
- Add core, HTTP, MCP, and UI source smoke coverage.

## Out of scope

- Adding a separate diagnostic override route.
- Filtering non-ready agents out of `list_agents`.
- Changing MCP setup or permission approval flows.
- Starting milestone 0.3 work.

## Exit criteria

1. `callAgent` rejects MCP-blocked or registration-pending targets before creating a request.
2. `/api/ask` returns an actionable readiness error for an MCP-blocked target and leaves request state unchanged.
3. MCP `list_agents` exposes `routeReady: false` for a blocked target, and MCP `call_agent` returns the same readiness error.
4. Web UI Inspector and context-menu Ask controls are disabled for non-route-ready agents.
5. Existing recovery, timeout, CLI proxy, and ready-agent routing smoke checks still pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:mcp`
- `npm run smoke:cli-controls`
- `npm run smoke:docs`
- `npm run verify`
- `git diff --check main...HEAD`

## Evaluator notes

The goal is to keep blocked agents visible and actionable while preventing accidental normal routing. Do not hide setup guidance or regress recovered-timeout routing after an operator marks the request recovered.

## Progress log

- 2026-06-30: Seeded from `docs/reviews/2026-06-30-first-user-route-readiness-review.md`.
- 2026-06-30T23:55:00+09:00: added route readiness metadata, core preflight rejection, HTTP 409 mapping, disabled UI Ask controls, and core/HTTP/MCP/CLI smoke coverage for blocked versus ready routing.
