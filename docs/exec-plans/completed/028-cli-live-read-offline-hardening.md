# CLI live read offline hardening

```json taskmeta
{
  "id": "cli-live-read-offline-hardening",
  "title": "CLI live read offline hardening",
  "order": 28,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-fresh-operator-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/HTTP-UI-MCP.md",
    "docs/USER-START-GUIDE.md"
  ],
  "required_commands": [
    "npm run verify",
    "npm run smoke:docs",
    "git diff --check main...HEAD",
    "npm pack --dry-run"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "packages/core/src/router.ts",
    "scripts/smoke-cli-controls.js",
    "scripts/smoke-docs.js",
    "README.md",
    "docs/HTTP-UI-MCP.md",
    "docs/USER-START-GUIDE.md",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "Offline CLI status disagrees with persisted active lease state in a way that can mislead operators",
    "Docs still promise CLI/UI health agreement without explaining live-server read ownership",
    "Release verification does not cover the deep review busy-status reproduction"
  ],
  "completed_at": "2026-06-29T10:25:00+09:00"
}
```

## Objective

Harden the CLI/UI health agreement after live read proxying, including offline fallback semantics and release documentation.

## Scope

- Evaluate whether one-shot offline CLI classification should treat `activeRequestId` plus `leaseStatus: "active"` plus an open last request as `busy`.
- If that fallback is safe, implement it in the core health classification path and add focused coverage.
- If it is not safe, document why live-server proxy is the supported source of truth and add a smoke/doc guard for that behavior.
- Update README, User Start Guide, and HTTP UI/MCP docs to say that read and write CLI commands use the matching running server as the live state owner.
- Update docs smoke assertions for the deep operator review and the active 027-028 queue.
- Run release-readiness checks.

## Out of scope

- Changing the persisted router state schema.
- Adding cross-process shared memory for `busyAgents`.
- Building a general event stream or watch mode.
- Starting milestone 0.3 feature work.

## Exit criteria

1. The repository has a deliberate offline fallback story for active leases, either implemented or explicitly documented with rationale.
2. Operator docs state that matching running server state is the live source of truth for CLI read and write commands.
3. The deep review reproduction is covered by repeatable smoke checks.
4. Active queue and docs smoke reference the deep operator review wave.
5. Required checks pass and Ralph can promote to `NONE`.

## Required checks

- `npm run verify`
- `npm run smoke:docs`
- `git diff --check main...HEAD`
- `npm pack --dry-run`

## Evaluator notes

Keep this task narrow. The goal is not to make file-only snapshots perfectly live; it is to prevent misleading CLI output in normal server-owned operation and to make the fallback contract explicit.

## Progress log

- 2026-06-29: Seeded from deep operator review follow-up guidance.
- 2026-06-29T10:25:00+09:00: hardened offline classification so an active lease with an open request is reported as busy even without a live server. Updated README, User Start Guide, HTTP UI/MCP docs, and docs smoke to describe read/write live-server ownership. Required checks passed: `npm run verify`, `npm run smoke:docs`, `git diff --check main...HEAD`, and `npm pack --dry-run`.
