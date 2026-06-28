# Design

Mina AI Router is designed around visible local collaboration.

## Central Metaphor

The router is a local hub. Codex and Claude CLI sessions are visible agents around it. Requests move through MCP, while the user can still inspect the terminal at any point.

## Interaction Model

- Create or connect agents.
- Inspect each agent's capability and terminal state.
- Ask one agent to route work to another.
- Watch the request lifecycle in the activity panel.
- Diagnose failures from structured request detail rather than raw logs alone.

## Design Constraints

- Avoid hiding state in autonomous background jobs.
- Keep local state inspectable and recoverable.
- Prefer explicit request protocols over ambiguous prompts.
- Preserve operator controls for attach, restart, delete, retry, archive, and refresh.
