# MCP blocked agent readiness

```json taskmeta
{
  "id": "mcp-blocked-agent-readiness",
  "title": "MCP blocked agent readiness",
  "order": 38,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-30-first-user-revalidation-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "packages/core/src/router.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js",
    "scripts/smoke-cli-controls.js"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:cli-controls",
    "npm run smoke:docs",
    "npm run verify",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "packages/core/src/router.ts",
    "scripts/core-tests.js",
    "scripts/smoke-http.js",
    "scripts/smoke-cli-controls.js",
    "docs/product-specs/release-readiness-review-fixes.md",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "MCP-blocked tmux agents are counted as available",
    "Registration-pending agents appear route-ready in CLI or Web UI health",
    "Web UI create-agent or CLI visible-agent smoke cannot prove the blocked agent is non-available"
  ],
  "completed_at": "2026-06-30T23:20:00+09:00"
}
```

## Objective

Ensure reachable tmux sessions are not reported as route-ready while bootstrap, MCP preflight, or self-registration blockers are still known.

## Scope

- Pass bootstrap, registration, and MCP preflight state into the shared core health classifier.
- Classify `mcp-configuring`, `permission-required`, `registration-pending`, `registrationStatus: pending`, and `mcpPreflightStatus: missing|stale` as `needs-attention` before `available`.
- Add core coverage for a transport-reachable but MCP-blocked Codex session.
- Add HTTP and CLI smoke assertions that MCP-blocked Web UI/CLI-created tmux agents are not counted as available.

## Out of scope

- Adding a new route-readiness enum beyond the existing `AgentHealthStatus`.
- Changing the MCP setup commands or preflight discovery rules.
- Changing route selection beyond the shared status model.
- Starting milestone 0.3 work.

## Exit criteria

1. A tmux agent with `bootstrapStatus: "mcp-configuring"` and `mcpPreflightStatus: "missing"` reports `status: "needs-attention"`.
2. A `registrationStatus: "pending"` agent is not reported as `available`.
3. `/api/health` does not increment `available` for a Web UI-created MCP-blocked tmux agent.
4. `mair agents`, `mair agent <id>`, and `mair health` agree that a CLI-created MCP-blocked visible agent needs attention.
5. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:cli-controls`
- `npm run smoke:docs`
- `npm run verify`
- `git diff --check main...HEAD`

## Evaluator notes

The goal is to separate transport reachability from collaboration readiness. Do not hide the session or remove setup guidance; keep the agent visible, but do not let it inflate the available count until registration and MCP setup are complete.

## Progress log

- 2026-06-30: Seeded from `docs/reviews/2026-06-30-first-user-revalidation-review.md`.
- 2026-06-30T23:20:00+09:00: core health classification now prioritizes known bootstrap, registration, and MCP preflight blockers before `available`; core, HTTP, and CLI smoke coverage assert MCP-blocked agents need attention.
