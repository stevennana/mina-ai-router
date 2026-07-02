# Getting Started OOB cleanup

```json taskmeta
{
  "id": "getting-started-oob-cleanup",
  "title": "Getting Started OOB cleanup",
  "order": 47,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-oob-review.md",
    "docs/GETTING-STARTED.md",
    "scripts/smoke-docs.js"
  ],
  "required_commands": [
    "npm run smoke:docs",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "docs/GETTING-STARTED.md",
    "scripts/smoke-docs.js",
    "state/backlog.md"
  ],
  "completed_at": "2026-07-01T16:20:00+09:00"
}
```

## Objective

Make Getting Started point to the automated OOB path first and treat manual MCP/skill guides as references.

## Exit criteria

1. Getting Started no longer labels manual MCP or skill installation as required for the normal path.
2. Recommended path uses `mair setup <client>` and `mair doctor --client <client>`.
3. Manual setup guides are described as repair/reference material.
4. Docs smoke covers the OOB language.

## Progress log

- 2026-07-01: Reframed Getting Started around automated setup and doctor checks.
