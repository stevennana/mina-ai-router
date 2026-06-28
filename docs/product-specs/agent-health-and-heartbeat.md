# Agent Health and Heartbeat

## User Story

As a developer operating several visible agents, I want health states to reflect real session reachability before I route work.

## Scope

- Track last seen and terminal activity where available.
- Distinguish available, busy, stale, missing, and needs attention.
- Show health consistently in CLI and UI.
- Add watchable health command if needed.

## Out of Scope

- Full terminal prompt semantic detection.
- Remote process supervision.
- Hosted monitoring.

## Acceptance

- Missing or stale tmux sessions are obvious.
- The UI and CLI use the same health semantics.
