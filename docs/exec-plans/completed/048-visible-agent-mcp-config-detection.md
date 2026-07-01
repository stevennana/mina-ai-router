# Visible agent MCP config detection

```json taskmeta
{
  "id": "visible-agent-mcp-config-detection",
  "title": "Visible agent MCP config detection",
  "order": 48,
  "status": "completed",
  "next_task_on_success": "doctor-mcp-repair-action",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-oob-agent-start-review.md",
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "scripts/smoke-http.js"
  ],
  "required_commands": [
    "npm run smoke:cli-controls",
    "npm run smoke:http",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "scripts/smoke-http.js",
    "state/backlog.md"
  ],
  "completed_at": "2026-07-01T17:15:00+09:00"
}
```

## Objective

Make `mair codex`, `mair claude`, and Web UI create-agent consume the MCP configuration that `mair setup` already verified.

## Exit criteria

1. CLI visible-agent creation inspects `codex mcp get` or `claude mcp get` before preflight.
2. Web UI create-agent inspects the same client MCP config before preflight.
3. Explicit deterministic flags still override detection.
4. CLI smoke verifies setup followed by Codex and Claude visible-agent start reaches configured preflight.
5. HTTP smoke verifies Web UI create-agent uses configured client MCP without a hidden `mcpConfigured` body flag.

## Progress log

- 2026-07-01: Added client MCP URL detection to CLI and HTTP create flows with smoke coverage.
