# Fresh operator smoke hardening

```json taskmeta
{
  "id": "fresh-operator-smoke-hardening",
  "title": "Fresh operator smoke hardening",
  "order": 26,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-fresh-operator-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "README.md",
    "docs/USER-START-GUIDE.md",
    "docs/HTTP-UI-MCP.md"
  ],
  "required_commands": [
    "npm run verify",
    "npm run smoke:docs",
    "git diff --check main...HEAD",
    "npm pack --dry-run"
  ],
  "required_files": [
    "README.md",
    "docs/USER-START-GUIDE.md",
    "docs/HTTP-UI-MCP.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "scripts/smoke-docs.js",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "Fresh operator mixed CLI/UI flow is not covered by a repeatable smoke test",
    "Docs still tell users to mix CLI and UI without explaining server-owned live state",
    "Release verification passes while the review's P1 reproduction can still overwrite state"
  ],
  "completed_at": "2026-06-29T09:35:00+09:00"
}
```

## Objective

Turn the fresh operator review fixes into durable release readiness coverage and documentation so the branch cannot regress to stale mixed CLI/UI state behavior.

## Scope

- Ensure `npm run verify` covers the mixed CLI/server state ownership smoke path or document the dedicated command if it remains separate.
- Update docs to explain that, while the HTTP server is running, it owns live router state and compatible CLI mutations route through it.
- Keep README/User Start Guide instructions aligned with non-default server ports and health output.
- Update docs smoke assertions to track the fresh operator review wave.
- Run the full release-readiness checks for this wave.

## Out of scope

- Starting milestone 0.3 feature work.
- Changing publish policy or npm/GitHub release mechanics.
- Adding unrelated UI polish.

## Exit criteria

1. The fresh operator P1 and P2 reproductions are represented by repeatable smoke or verify checks.
2. Operator docs explain the live-state ownership model for mixed CLI/UI usage.
3. Active queue and product specs point at the fresh operator review, not the superseded branch review file.
4. `npm run verify`, `npm run smoke:docs`, `git diff --check main...HEAD`, and `npm pack --dry-run` pass.
5. Ralph current task can promote to `NONE`.

## Required checks

- `npm run verify`
- `npm run smoke:docs`
- `git diff --check main...HEAD`
- `npm pack --dry-run`

## Evaluator notes

This is the release hardening task for the fresh operator wave. Keep it focused on documentation and verification glue after the functional fixes land.

## Progress log

- 2026-06-29: Seeded as the final fresh operator review hardening task.
- 2026-06-29T09:35:00+09:00: documented the server-owned live state model in README, User Start Guide, and HTTP UI/MCP docs; expanded docs smoke assertions; verified fresh operator P1/P2 coverage in `smoke:cli-controls`. Required checks passed: `npm run verify`, `npm run smoke:docs`, `git diff --check main...HEAD`, and `npm pack --dry-run`.
