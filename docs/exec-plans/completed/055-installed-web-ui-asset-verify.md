# Installed Web UI asset verify

```json taskmeta
{
  "id": "installed-web-ui-asset-verify",
  "title": "Installed Web UI asset verify",
  "order": 55,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-installed-cli-verify-output-review.md",
    "apps/cli/src/index.ts",
    "scripts/smoke-installed-cli.js"
  ],
  "required_commands": [
    "npm run smoke:installed-cli",
    "npm run smoke:docs",
    "npm run verify",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "scripts/smoke-installed-cli.js",
    "docs/product-specs/release-readiness-review-fixes.md"
  ],
  "completed_at": "2026-07-01T21:50:00+09:00"
}
```

## Objective

Make installed `mair verify` defend the first browser screen by checking packaged Web UI assets.

## Exit criteria

1. Installed verify checks the packaged Web UI `index.html`.
2. Installed verify checks that at least one built JavaScript and CSS asset is packaged.
3. Installed smoke starts the packaged server and verifies `/` returns 200 HTML.
4. Installed smoke removes Web UI assets from an installed package and confirms `mair verify` fails with actionable Web UI asset checks.

## Progress log

- 2026-07-01: Added install checks for Web UI index, JavaScript assets, and CSS assets.
- 2026-07-01: Extended installed CLI smoke to start the packaged server, fetch `/`, and cover missing Web UI asset failure.
