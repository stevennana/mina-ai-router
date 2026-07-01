# Live proxy stale pid diagnostics

```json taskmeta
{
  "id": "live-proxy-stale-pid-diagnostics",
  "title": "Live proxy stale pid diagnostics",
  "order": 30,
  "status": "completed",
  "next_task_on_success": "startup-diagnostics-release-hardening",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-fresh-operator-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/HTTP-UI-MCP.md",
    "docs/TROUBLESHOOTING.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "scripts/smoke-cli-controls.js",
    "state/backlog.md"
  ],
  "human_review_triggers": [
    "Non-Mina HTTP responses still surface raw JSON parser errors",
    "Mutating commands fall back to local writes when a matching pid file points to an invalid live server",
    "Read commands silently ignore a stale/non-Mina pid file without actionable operator guidance"
  ],
  "completed_at": "2026-06-30T09:55:00+09:00"
}
```

## Objective

Fix the deep operator review Finding 2: when a matching Mina pid file points at a live non-Mina server, CLI live read/proxy commands must produce actionable stale/non-Mina diagnostics instead of raw JSON parse errors.

## Scope

- Change live read/proxy helpers to read response text before parsing JSON.
- Wrap JSON parse failures with an error that includes the URL, pid file path, and a clear stale/non-Mina server explanation.
- For mutating commands, stop with a clear error instead of falling back to local state when a matching pid file claims server ownership but the server is not Mina.
- For read-only commands, choose and implement a deliberate behavior:
  - either clear error with remediation; or
  - local fallback plus explicit warning if the command output format can safely carry it.
- Add smoke coverage with a fake HTTP server and a pid file for the current state path.
- Assert `mair health`, `mair agents`, and `mair register` mention the stale/non-Mina pid condition and do not show raw parser text.

## Out of scope

- Automatically deleting user pid files.
- Supporting arbitrary third-party servers as Mina-compatible.
- Adding a new persistent pid schema unless needed for clear diagnostics.

## Exit criteria

1. A fake non-Mina server referenced by `MINA_SERVER_PID` does not cause raw `Unexpected token` JSON parse output.
2. The error mentions the offending URL and the pid file path or stale pid-file remediation.
3. Mutating commands do not split-brain write locally when the pid file claims a matching live owner but that owner is not Mina.
4. Read command behavior is intentional, tested, and documented in the task log.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`

## Evaluator notes

This task is primarily about operator diagnostics. Keep the code path simple and centralize response parsing so live read and live write helpers share the same stale/non-Mina message.

## Progress log

- 2026-06-30: Seeded from deep operator review Finding 2.
- 2026-06-30T09:55:00+09:00: centralized live-server response parsing through text-first JSON handling and Mina response shape checks. Non-Mina pid targets now report URL and stale pid remediation instead of raw parser errors. CLI controls smoke covers `mair health`, `mair agents`, and `mair register` against a fake non-Mina server. Required checks passed: `npm run test` and `npm run smoke:cli-controls`.
