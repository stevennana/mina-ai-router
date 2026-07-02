# Doctor MCP repair action

```json taskmeta
{
  "id": "doctor-mcp-repair-action",
  "title": "Doctor MCP repair action",
  "order": 49,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-oob-agent-start-review.md",
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
  "completed_at": "2026-07-01T17:15:00+09:00"
}
```

## Objective

Make doctor MCP blockers return concrete setup commands instead of repeating route-blocked reason text.

## Exit criteria

1. MCP blockers prefer `mair setup <client> --project <root>` repair text.
2. Repair text also includes `mair doctor --client <client> --project <root>`.
3. Permission and registration blockers keep their specific repair actions.
4. CLI smoke asserts an MCP-blocked Codex agent receives setup-command repair guidance.

## Progress log

- 2026-07-01: Reordered doctor repair guidance and strengthened smoke assertions.
