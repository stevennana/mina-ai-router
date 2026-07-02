# Startup diagnostics release hardening

```json taskmeta
{
  "id": "startup-diagnostics-release-hardening",
  "title": "Startup diagnostics release hardening",
  "order": 31,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-fresh-operator-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "README.md",
    "docs/HTTP-UI-MCP.md",
    "docs/TROUBLESHOOTING.md"
  ],
  "required_commands": [
    "npm run verify",
    "npm run smoke:docs",
    "git diff --check main...HEAD",
    "npm pack --dry-run"
  ],
  "required_files": [
    "README.md",
    "docs/HTTP-UI-MCP.md",
    "docs/TROUBLESHOOTING.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "scripts/smoke-docs.js",
    "scripts/smoke-cli-controls.js",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "Docs do not explain what to do after server bind failure or stale pid diagnostics",
    "Release verification can pass while the reviewed startup/pid diagnostics regress",
    "Smoke tests rely on fixed ports that can collide on developer machines"
  ],
  "completed_at": "2026-06-30T09:55:00+09:00"
}
```

## Objective

Turn the startup readiness and stale-pid diagnostics fixes into durable release readiness coverage and operator documentation.

## Scope

- Update README, HTTP UI/MCP docs, and Troubleshooting with startup readiness failure behavior.
- Document stale/non-Mina pid-file diagnostics and the safe remediation path.
- Ensure docs smoke tracks the deep operator review's current findings and the 029-031 queue.
- Confirm `smoke:cli-controls` covers occupied-port startup and fake-server pid diagnostics without brittle fixed ports.
- Run the release-readiness checks for this wave.

## Out of scope

- Starting milestone 0.3 feature work.
- Changing release publication policy.
- Adding a full daemon supervisor.

## Exit criteria

1. Operator docs explain bind failure and stale/non-Mina pid-file remediation.
2. Smoke/docs coverage protects both reviewed findings.
3. Active queue and product spec point at the 2026-06-30 deep operator review findings.
4. `npm run verify`, `npm run smoke:docs`, `git diff --check main...HEAD`, and `npm pack --dry-run` pass.
5. Ralph can promote to `NONE`.

## Required checks

- `npm run verify`
- `npm run smoke:docs`
- `git diff --check main...HEAD`
- `npm pack --dry-run`

## Evaluator notes

This is a hardening task. Avoid adding new behavior beyond documentation, smoke coverage integration, and release-gate alignment after 029 and 030 land.

## Progress log

- 2026-06-30: Seeded as final hardening for the deep operator startup diagnostics review.
- 2026-06-30T09:55:00+09:00: documented startup readiness, occupied-port failure, and stale/non-Mina pid remediation in README, HTTP UI/MCP, and Troubleshooting. Updated docs smoke to track the startup diagnostics release gate. Required checks passed: `npm run verify`, `npm run smoke:docs`, `git diff --check main...HEAD`, and `npm pack --dry-run`.
