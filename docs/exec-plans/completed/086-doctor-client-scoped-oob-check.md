# Doctor client-scoped OOB check

```json taskmeta
{
  "id": "doctor-client-scoped-oob-check",
  "title": "Doctor client-scoped OOB check",
  "order": 86,
  "status": "completed",
  "next_task_on_success": null,
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/release-readiness-review-fixes.md"
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

Make first-run `mair doctor <client>` answer whether the selected client and project are ready without failing because of unrelated clients or agents.

## Scope

- Treat positional `mair doctor codex|claude|all` as equivalent to `--client`.
- Preserve explicit `--client` and `--clients` precedence over positional arguments.
- Scope route-ready blockers to selected client and selected project when doctor is client-specific.
- Keep `--client all` as the global health gate.
- Add CLI controls smoke coverage for positional client doctor output.

## Exit criteria

1. `mair doctor codex --project <path> --json` reports only Codex client checks.
2. Client-specific doctor output uses selected project/client route-ready detail.
3. `mair doctor --client all` still fails on known blocked agents unless `--ignore-blocked-agents` is supplied.
4. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`
- `npm run smoke:docs`

## Progress log

- Seeded from the final release gate P2.
- Completed: doctor now resolves positional client filters and scopes route-ready blockers to the selected project/client for client-specific doctor runs.
