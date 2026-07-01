# Demo helper demotion

```json taskmeta
{
  "id": "demo-helper-demotion",
  "title": "Demo helper demotion",
  "order": 44,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-oob-review.md",
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts"
  ],
  "required_commands": [
    "npm run smoke:cli-controls",
    "npm run smoke:docs",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "README.md",
    "docs/USER-START-GUIDE.md"
  ],
  "completed_at": "2026-07-01T15:30:00+09:00"
}
```

## Objective

Prevent the specialized Codex pair helper from looking like the normal onboarding path or creating maintainer-local sessions by default.

## Exit criteria

1. `setup-codex-pair` requires explicit `--main-root` and `--helper-root`.
2. The HTTP helper endpoint also rejects missing roots.
3. CLI help labels the command as a developer/demo helper.
4. README, user guide, MCP setup, and skill docs prefer `mair setup codex|claude`.

## Progress log

- 2026-07-01: Removed maintainer-local defaults and updated docs/help to prefer general setup commands.
