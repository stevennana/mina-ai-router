# UI setup surface

```json taskmeta
{
  "id": "ui-setup-surface",
  "title": "UI setup surface",
  "order": 43,
  "status": "completed",
  "next_task_on_success": "demo-helper-demotion",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-out-of-box-automation-review.md",
    "apps/http-server/ui/src/features/ConnectGuide.tsx",
    "apps/http-server/ui/src/features/Inspector.tsx"
  ],
  "required_commands": [
    "npm run smoke:http",
    "npm run smoke:docs",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/http-server/ui/src/features/ConnectGuide.tsx",
    "apps/http-server/ui/src/features/Inspector.tsx",
    "docs/HTTP-UI-MCP.md"
  ],
  "completed_at": "2026-07-01T15:30:00+09:00"
}
```

## Objective

Make the Web UI first-run path point users to setup and verification commands for both Codex and Claude.

## Exit criteria

1. Connect Agent shows `mair setup codex`, `mair setup claude`, and `mair doctor`.
2. Connect Agent includes both Codex and Claude MCP repair commands with the live MCP URL.
3. Inspector surfaces MCP verify and reset commands alongside setup guidance for blocked agents.
4. Docs smoke protects the new UI/documentation language.

## Progress log

- 2026-07-01: Updated ConnectGuide, Inspector, and HTTP UI docs.
