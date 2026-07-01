# Installed verify success details

```json taskmeta
{
  "id": "installed-verify-success-details",
  "title": "Installed verify success details",
  "order": 54,
  "status": "completed",
  "next_task_on_success": "installed-web-ui-asset-verify",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-installed-cli-verify-output-review.md",
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
    "docs/product-specs/release-readiness-review-fixes.md"
  ],
  "completed_at": "2026-07-01T21:45:00+09:00"
}
```

## Objective

Make installed `mair verify` success output read like a successful installation check.

## Exit criteria

1. Successful install checks use success-language detail strings.
2. Failure-language details are reserved for failed checks.
3. Installed CLI smoke fails if any successful check detail contains terms such as missing, required, or not found.

## Progress log

- 2026-07-01: Split install verify check details into success and failure messages.
- 2026-07-01: Added smoke assertions for successful detail wording and specific user guide/registration skill success details.
