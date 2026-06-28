# Capability refresh command

```json taskmeta
{
  "id": "capability-refresh-command",
  "title": "Capability refresh command",
  "order": 4,
  "status": "queued",
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
  ]
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
