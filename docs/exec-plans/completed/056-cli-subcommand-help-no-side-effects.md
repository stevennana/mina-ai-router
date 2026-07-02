# CLI subcommand help no side effects

```json taskmeta
{
  "id": "cli-subcommand-help-no-side-effects",
  "title": "CLI subcommand help no side effects",
  "order": 56,
  "status": "completed",
  "next_task_on_success": "session-fingerprint-display-name-dedupe",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-verify-docs-review.md",
    "apps/cli/src/index.ts"
  ],
  "required_commands": [
    "npm run smoke:cli-controls",
    "npm run smoke:docs",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "docs/product-specs/release-readiness-review-fixes.md"
  ],
  "completed_at": "2026-07-01T22:35:00+09:00"
}
```

## Objective

Make subcommand help inspection safe by ensuring `--help` and `-h` never execute the underlying action.

## Exit criteria

1. `mair server start --help` prints usage and does not start a server.
2. `mair doctor --help` prints usage and does not run doctor checks.
3. Setup, visible-agent, and request help flags print usage before side effects.
4. CLI controls smoke verifies help output and absence of server pid side effects.

## Progress log

- 2026-07-01: Added pre-dispatch help handling before context creation.
- 2026-07-01: Added command-specific usage output and smoke assertions for server, doctor, setup, codex, and request help.
