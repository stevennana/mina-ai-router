# Capability refresh command

```json taskmeta
{
  "id": "capability-refresh-command",
  "title": "Capability refresh command",
  "order": 4,
  "status": "completed",
  "next_task_on_success": "capability-freshness-ui",
  "prompt_docs": [
    "AGENTS.md",
    "ARCHITECTURE.md",
    "docs/product-specs/agent-capability-refresh.md",
    "docs/RELIABILITY.md",
    "skills/mina-ai-router-agent/SKILL.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls",
    "npm run smoke:tmux",
    "npm run smoke:mcp"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "packages/core/src/registry.ts",
    "packages/mcp/src/provider.ts"
  ],
  "human_review_triggers": [
    "Refresh requires recreating the agent",
    "Manual edits are overwritten without an explicit user action",
    "Capability freshness fields are not persisted"
  ],
  "completed_at": "2026-06-28T15:02:43.787Z"
}
```

## Objective

Add a CLI-driven capability refresh path for one registered agent.

## Scope

- Add metadata needed to track capability freshness.
- Add a command such as `mair agent refresh-capabilities <id>` or a clearly documented equivalent.
- Prompt the target agent to inspect local project docs and update its registration.
- Preserve manual edit semantics.

## Out of scope

- Scheduled refresh.
- Team presets.
- UI freshness indicators beyond what is needed for API support.

## Exit criteria

1. A user can refresh one agent without deleting or recreating it.
2. Capability freshness data persists in local state.
3. CLI controls smoke covers the command or its underlying API.
4. tmux or MCP smoke proves the refresh path remains compatible with live agent routing.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`
- `npm run smoke:tmux`
- `npm run smoke:mcp`

## Evaluator notes

Promote only when the command is useful from a terminal, not just an internal helper.

## Progress log

- Queue seeded for milestone 0.2 Ralph setup.
- 2026-06-28T14:52:01.636Z: restored as current task after request-retry-cancel-archive promotion.
- 2026-06-28T14:59:00Z: added `mair agent refresh-capabilities <id>` to prompt one registered agent through the router, parse a JSON capability notice, and update persisted capability freshness metadata without recreating the agent. Added `capabilitySource`, `capabilityUpdatedAt`, and `lastCapabilityRefreshAt` metadata, with manual CLI/HTTP edits marked manual and MCP/refresh updates marked generated. Extended CLI controls smoke to cover the refresh command, tmux smoke to exercise live refresh when tmux is available, and MCP smoke to assert generated freshness metadata. Required checks run: `npm run test` passed; `npm run smoke:cli-controls` exited 0 after covering refresh and reporting sandbox HTTP `listen EPERM`; `npm run smoke:tmux` and `npm run smoke:mcp` exited 0 with explicit sandbox tmux socket `Operation not permitted` skip evidence.
- 2026-06-28T15:02:43.787Z: automatically promoted after deterministic checks and evaluator approval.
