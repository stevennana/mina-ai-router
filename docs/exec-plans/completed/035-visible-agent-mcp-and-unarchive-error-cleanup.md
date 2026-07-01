# Visible agent MCP and unarchive error cleanup

```json taskmeta
{
  "id": "visible-agent-mcp-and-unarchive-error-cleanup",
  "title": "Visible agent MCP and unarchive error cleanup",
  "order": 35,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-30-full-user-functional-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "apps/cli/src/index.ts",
    "packages/core/src/request-store.ts",
    "apps/http-server/ui/src/features/RequestDetail.tsx",
    "scripts/core-tests.js",
    "scripts/smoke-cli-controls.js"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls",
    "npm run smoke:docs",
    "npm run verify",
    "git diff --check main...HEAD",
    "npm pack --dry-run"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "packages/core/src/request-store.ts",
    "scripts/core-tests.js",
    "scripts/smoke-cli-controls.js",
    "docs/product-specs/release-readiness-review-fixes.md",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "CLI-created visible agents emit MCP setup guidance for the default port while a matching server runs on a non-default port",
    "Unarchived answered requests still display archive-only reasons as active errors",
    "Smoke coverage cannot reproduce the reviewed non-default visible-agent MCP and unarchive cleanup flows"
  ],
  "completed_at": "2026-06-30T12:00:00+09:00"
}
```

## Objective

Fix the full user functional review findings around visible-agent MCP preflight guidance and archive-only request errors.

## Scope

- Make `mair codex` and `mair claude` visible-agent startup prefer the matching running server's MCP URL when building MCP preflight guidance.
- Preserve the existing `MINA_HTTP_HOST` / `MINA_HTTP_PORT` fallback when no matching live server owns the current state file.
- Clear archive-only error text when an archived answered/non-error request is unarchived.
- Preserve real failure/timeout errors through archive and unarchive.
- Add core and CLI smoke assertions for both reviewed regressions.

## Out of scope

- Changing MCP client configuration storage.
- Redesigning request recovery metadata.
- Hiding true parser, timeout, or transport errors in request detail.
- Starting milestone 0.3 work.

## Exit criteria

1. With a matching server running on a non-default port, `mair codex --no-attach --no-register` returns MCP preflight setup guidance using that server's `mcpUrl`.
2. Visible-agent placeholder state persisted through the server carries the same non-default MCP URL.
3. An answered request archived and then unarchived returns to `answered` without archive-only `error` text.
4. A failed request archived and then unarchived preserves the original failure error.
5. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`
- `npm run smoke:docs`
- `npm run verify`
- `git diff --check main...HEAD`
- `npm pack --dry-run`

## Evaluator notes

Keep this task focused on the two reviewed user-facing defects. The right URL source is the same matching live-server status used by `mair health`; the right unarchive behavior is to remove archive-only reasons without erasing real request failures.

## Progress log

- 2026-06-30: Seeded from `docs/reviews/2026-06-30-full-user-functional-review.md` Findings 1 and 2.
- 2026-06-30T12:00:00+09:00: updated visible-agent MCP preflight to prefer the matching live server URL, cleared archive-only errors on non-error unarchive, and added core/CLI smoke regressions. `npm run test` and `npm run smoke:cli-controls` passed before final verification.
