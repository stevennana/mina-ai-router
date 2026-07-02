# First-run setup for Codex and Claude

```json taskmeta
{
  "id": "first-run-setup-codex-claude",
  "title": "First-run setup for Codex and Claude",
  "order": 42,
  "status": "completed",
  "next_task_on_success": "ui-setup-surface",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-oob-review.md",
    "apps/cli/src/index.ts",
    "skills/mina-ai-router-agent/SKILL.md"
  ],
  "required_commands": [
    "npm run smoke:cli-controls",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "docs/MCP-CLIENT-SETUP.md",
    "docs/SKILL-INSTALL-GUIDE.md"
  ],
  "completed_at": "2026-07-01T15:30:00+09:00"
}
```

## Objective

Replace the manual first-run MCP and skill setup path with `mair setup codex` and `mair setup claude`.

## Exit criteria

1. Setup discovers the matching running server's MCP URL unless `--mcp-url` is supplied.
2. Codex setup removes, adds, verifies, and reports `codex mcp` config.
3. Claude setup removes, adds, verifies, and reports `claude mcp` config.
4. Codex and Claude registration skill targets are installed or linked.
5. CLI smoke uses fake client binaries so real local user profiles are not modified.

## Progress log

- 2026-07-01: Implemented `mair setup codex|claude` with dry-run, JSON reports, MCP verification, and skill linking.
