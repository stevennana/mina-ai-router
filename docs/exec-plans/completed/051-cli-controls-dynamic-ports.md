# CLI controls dynamic ports

```json taskmeta
{
  "id": "cli-controls-dynamic-ports",
  "title": "CLI controls dynamic ports",
  "order": 51,
  "status": "completed",
  "next_task_on_success": "NONE",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-01-first-user-oob-review.md",
    "scripts/smoke-cli-controls.js"
  ],
  "required_commands": [
    "npm run smoke:cli-controls",
    "git diff --check main...HEAD"
  ],
  "required_files": [
    "scripts/smoke-cli-controls.js",
    "state/backlog.md"
  ],
  "completed_at": "2026-07-01T18:40:00+09:00"
}
```

## Objective

Make CLI controls smoke resilient to common local port occupancy and improve helper-server diagnostics.

## Exit criteria

1. Main, occupied-port, and fake-server ports are allocated dynamically from loopback free ports.
2. Occupied-port scenario still tests a genuinely occupied dynamic port.
3. Plain helper server stderr is captured and surfaced for listen failures.
4. Smoke CLI controls passes without relying on fixed macOS-sensitive port ranges.

## Progress log

- 2026-07-01: Replaced fixed derived ports with dynamic free ports and helper-server stderr diagnostics.
