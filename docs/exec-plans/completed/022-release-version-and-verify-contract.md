# Release version and verify contract

```json taskmeta
{
  "id": "release-version-and-verify-contract",
  "title": "Release version and verify contract",
  "order": 22,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-collaboration-reliability-branch-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "README.md",
    "docs/USER-START-GUIDE.md"
  ],
  "required_commands": [
    "npm run verify",
    "npm run smoke:docs",
    "git diff --check main...HEAD",
    "node dist/apps/cli/src/index.js version",
    "npm pack --dry-run"
  ],
  "required_files": [
    "package.json",
    "apps/cli/src/index.ts",
    "packages/mcp/src/provider.ts",
    "apps/mcp-server/src/index.ts",
    "scripts/smoke-docs.js",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "Runtime version is hard-coded in more than one place without smoke coverage",
    "verify omits docs smoke after docs are part of release readiness",
    "Package dry-run output shows missing runtime assets or docs"
  ],
  "completed_at": "2026-06-29T07:44:49.305Z"
}
```

## Objective

Fix branch review Findings 4 and 5 plus the docs-smoke verification observation so release diagnostics match the package and branch checks are clean.

## Scope

- Make CLI version output match `package.json.version`.
- Make MCP `serverInfo.version` surfaces match `package.json.version`.
- Add smoke coverage for CLI and MCP runtime version consistency.
- Add `npm run smoke:docs` to the release verification path, unless a better documented release gate already covers it.
- Remove the `state/backlog.md` EOF whitespace issue and keep branch diff whitespace clean.
- Run `npm pack --dry-run` as a release-readiness check.

## Out of scope

- Changing publish credentials or GitHub Actions release policy.
- Bumping the package version number beyond the current `package.json` value.
- Rewriting package layout.

## Exit criteria

1. `node dist/apps/cli/src/index.js version` reports the same version as `package.json`.
2. MCP initialize/server info reports the same version as `package.json`.
3. `npm run verify` includes docs smoke or another explicit docs release gate.
4. `git diff --check main...HEAD` passes.
5. `npm pack --dry-run` completes without missing expected runtime assets.

## Required checks

- `npm run verify`
- `npm run smoke:docs`
- `git diff --check main...HEAD`
- `node dist/apps/cli/src/index.js version`
- `npm pack --dry-run`

## Evaluator notes

Prefer reading package version from one source over updating several constants manually. If runtime import constraints make that too large for this release fix, add direct smoke assertions so future drift is caught.

## Progress log

- 2026-06-29: Seeded from branch review Findings 4 and 5 plus Additional Observations.
- 2026-06-29T08:34:00+09:00: added shared package version helper, wired CLI and MCP server info to package.json, added CLI/MCP version smoke assertions, included docs smoke in `npm run verify`, and cleaned the branch EOF whitespace issue. `npm run verify`, `npm run smoke:docs`, `node dist/apps/cli/src/index.js version`, and `npm pack --dry-run` passed. `git diff --check main...HEAD` requires the fix commit to be present because it checks committed HEAD, not the working tree.
- 2026-06-29T08:42:00+09:00: committed review fixes so `git diff --check main...HEAD` validates the corrected branch diff. Required checks passed after commit: `npm run verify`, `npm run smoke:docs`, `git diff --check main...HEAD`, `node dist/apps/cli/src/index.js version`, and `npm pack --dry-run`.
- 2026-06-29T07:32:52.564Z: restored as current task after cli-blocked-agent-placeholder promotion.
- 2026-06-29T07:44:49.305Z: automatically promoted after deterministic checks and evaluator approval.
