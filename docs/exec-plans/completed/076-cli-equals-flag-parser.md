# CLI equals flag parser

```json taskmeta
{
  "id": "cli-equals-flag-parser",
  "title": "CLI equals flag parser",
  "order": 76,
  "status": "completed",
  "next_task_on_success": null,
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-02-real-6repo-usage-review.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls",
    "npm run smoke:docs"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "scripts/smoke-cli-controls.js"
  ]
}
```

## Objective

Support common `--flag=value` CLI syntax so project paths are not silently ignored.

## Scope

- Teach flag parsing to split `--key=value`.
- Preserve existing `--key value` and boolean flag behavior.
- Add CLI smoke coverage for `--project=<path>`.

## Exit criteria

1. `--project=/path` is parsed as `project`.
2. Existing spaced flag syntax still works.
3. CLI smoke fails if setup falls back to cwd for equals syntax.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`
- `npm run smoke:docs`

## Progress log

- Seeded from real 6-repo follow-up P3.
- Completed: CLI flag parsing now supports `--key=value`; CLI controls smoke verifies `--project=<path>` setup dry-run.
