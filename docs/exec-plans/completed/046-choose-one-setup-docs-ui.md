# Choose-one setup docs and UI

```json taskmeta
{
  "id": "choose-one-setup-docs-ui",
  "title": "Choose-one setup docs and UI",
  "order": 46,
  "status": "completed",
  "next_task_on_success": "getting-started-oob-cleanup",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-oob-review.md",
    "README.md",
    "docs/USER-START-GUIDE.md",
    "apps/http-server/ui/src/features/ConnectGuide.tsx"
  ],
  "required_commands": [
    "npm run smoke:docs",
    "npm run smoke:http",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "README.md",
    "docs/USER-START-GUIDE.md",
    "docs/MCP-CLIENT-SETUP.md",
    "docs/HTTP-UI-MCP.md",
    "docs/SKILL-INSTALL-GUIDE.md",
    "apps/http-server/ui/src/features/ConnectGuide.tsx"
  ],
  "completed_at": "2026-07-01T16:20:00+09:00"
}
```

## Objective

Stop first-user docs and UI from implying that users must configure both Codex and Claude.

## Exit criteria

1. README and user docs show Codex and Claude as separate choose-one command paths.
2. `mair doctor --client all` is documented only for users who use both clients.
3. The Web UI Connect guide separates Codex and Claude checks.
4. Docs smoke protects the choose-one language.

## Progress log

- 2026-07-01: Updated docs and Connect Guide to default to single-client setup.
