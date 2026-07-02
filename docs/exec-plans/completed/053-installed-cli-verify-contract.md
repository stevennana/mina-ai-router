# Installed CLI verify contract

```json taskmeta
{
  "id": "installed-cli-verify-contract",
  "title": "Installed CLI verify contract",
  "order": 53,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-installed-cli-review.md",
    "apps/cli/src/index.ts"
  ],
  "required_commands": [
    "npm run smoke:installed-cli",
    "npm run smoke:docs",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "scripts/smoke-installed-cli.js",
    "docs/USER-START-GUIDE.md",
    "docs/DEVELOPER-START-GUIDE.md",
    "docs/HTTP-UI-MCP.md"
  ],
  "completed_at": "2026-07-01T19:25:00+09:00"
}
```

## Objective

Separate installed `mair verify` from consumer project npm scripts while preserving checkout verification through `npm run verify`.

## Exit criteria

1. Installed `mair verify` performs a Mina package self-check.
2. `mair verify` does not execute the current project's `npm run verify`.
3. A consumer project without a `verify` script does not fail because of missing consumer npm scripts.
4. Docs distinguish checkout `npm run verify` from installed CLI `mair verify`.

## Progress log

- 2026-07-01: Changed `mair verify` to run the full checkout test suite only when the Mina checkout scripts are present under the package root.
- 2026-07-01: Added installed package self-checks for CLI/MCP/HTTP dist files, packaged docs, and registration skill.
- 2026-07-01: Added installed tarball smoke cases for consumer projects with and without their own `verify` script.
