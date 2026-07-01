# Installed CLI version source

```json taskmeta
{
  "id": "installed-cli-version-source",
  "title": "Installed CLI version source",
  "order": 52,
  "status": "completed",
  "next_task_on_success": "installed-cli-verify-contract",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-installed-cli-review.md",
    "packages/core/src/version.ts"
  ],
  "required_commands": [
    "npm run smoke:installed-cli",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "packages/core/src/version.ts",
    "scripts/smoke-installed-cli.js",
    "docs/product-specs/release-readiness-review-fixes.md"
  ],
  "completed_at": "2026-07-01T19:20:00+09:00"
}
```

## Objective

Make installed CLI and MCP version surfaces report the Mina package version instead of a consumer project's `package.json.version`.

## Exit criteria

1. Version lookup is anchored to the installed Mina package root.
2. Consumer cwd package metadata is ignored.
3. Installed `mair version` reports the Mina package version in a temporary consumer project.
4. Installed MCP `serverInfo.version` reports the same Mina package version.

## Progress log

- 2026-07-01: Reworked package version lookup to scan from the Mina runtime package path and require `name: "@minasoft/mina-ai-router"`.
- 2026-07-01: Added installed tarball smoke coverage for consumer version contamination and MCP initialize version output.
