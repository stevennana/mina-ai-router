# First-run doctor command

```json taskmeta
{
  "id": "first-run-doctor-command",
  "title": "First-run doctor command",
  "order": 41,
  "status": "completed",
  "next_task_on_success": "first-run-setup-codex-claude",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-oob-review.md",
    "apps/cli/src/index.ts",
    "scripts/smoke-cli-controls.js"
  ],
  "required_commands": [
    "npm run smoke:cli-controls",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "state/backlog.md"
  ],
  "completed_at": "2026-07-01T15:30:00+09:00"
}
```

## Objective

Add a first-run readiness diagnostic that can explain server, MCP, client, skill, and blocked-agent state without requiring users to inspect files manually.

## Exit criteria

1. `mair doctor` reports a machine-readable pass/fail matrix.
2. `--client codex|claude|all` and `--project <path>` scope client and skill checks.
3. The command prefers the matching running server's MCP URL.
4. Smoke coverage verifies doctor output after fake Codex and Claude setup.

## Progress log

- 2026-07-01: Implemented `mair doctor` and CLI smoke coverage.
