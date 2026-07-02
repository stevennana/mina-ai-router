# Doctor blocked agent readiness

```json taskmeta
{
  "id": "doctor-blocked-agent-readiness",
  "title": "Doctor blocked agent readiness",
  "order": 45,
  "status": "completed",
  "next_task_on_success": "choose-one-setup-docs-ui",
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
  "completed_at": "2026-07-01T16:20:00+09:00"
}
```

## Objective

Make `mair doctor` fail when known agents are not route-ready, unless the operator explicitly asks for environment-only checks.

## Exit criteria

1. Doctor includes a top-level `route-ready agents` check.
2. Any blocked agent makes `ok: false` and exits non-zero by default.
3. `blockedAgents` includes a visible repair action.
4. `--ignore-blocked-agents` allows explicit environment-only diagnostics.
5. CLI smoke covers healthy clients plus a blocked agent.

## Progress log

- 2026-07-01: Added blocked-agent readiness to doctor semantics and smoke coverage.
