# MCP preflight for agent creation

```json taskmeta
{
  "id": "mcp-preflight-agent-create",
  "title": "MCP preflight for agent creation",
  "order": 11,
  "status": "completed",
  "next_task_on_success": "idempotent-registration-handshake",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/MCP-CLIENT-SETUP.md"
  ],
  "required_commands": [
    "npm run build",
    "npm run smoke:cli-controls",
    "npm run smoke:http"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "apps/http-server/src/index.ts",
    "apps/http-server/ui/src"
  ],
  "human_review_triggers": [
    "The task auto-edits unrelated global client config",
    "MCP setup is run without visible command output or status",
    "Unsupported MCP clients are treated as configured"
  ],
  "completed_at": "2026-06-29T05:36:38.374Z"
}
```

## Objective

Ensure Codex and Claude sessions have Mina MCP setup guidance before self-registration begins.

## Scope

- Introduce an MCP preflight boundary for agent creation.
- Detect configured, missing, stale, and unsupported MCP setup states.
- Generate the correct setup command for supported Codex and Claude flows.
- Run setup automatically only when an existing command path is already deterministic, visible to the operator, and scoped to the current project/session.
- Show `mcp-configuring` bootstrap status while setup is pending.

## Out of scope

- Remote MCP hosting.
- Multi-user MCP policy.
- Non-Codex and non-Claude client support beyond a clear unsupported result.

## Exit criteria

1. CLI and Web UI agent creation paths call the same MCP preflight boundary.
2. Missing MCP setup produces an exact next action for the operator or session.
3. Self-registration prompts are not sent before preflight completes or declares an intentional manual path.
4. Auto-run behavior, if implemented, is opt-in or already visible in command output; otherwise the task stops at exact command generation and `mcp-configuring` state.
5. Required checks pass.

## Required checks

- `npm run build`
- `npm run smoke:cli-controls`
- `npm run smoke:http`

## Evaluator notes

Prefer an adapter result object over client-specific branching scattered through command handlers. Do not turn this into a broad client configuration manager; the narrow success is preflight status plus exact next action.

## Progress log

- 2026-06-29: Seeded from pain point 2.
- 2026-06-29T05:24:16.670Z: restored as current task after permission-trust-readiness promotion.
- 2026-06-29: Added a shared MCP preflight boundary in core that returns `configured`, `missing`, `stale`, or `unsupported` plus exact Codex/Claude setup, verify, and remove commands. Web UI and CLI tmux agent creation now call the same preflight before sending self-registration prompts. Missing or stale MCP setup marks the agent `mcp-configuring`, records the setup command on the agent, and returns an actionable next step instead of sending the registration prompt. Configured MCP can be declared explicitly for deterministic flows. Inspector and create output surface MCP preflight state. Added core, HTTP, and CLI smoke assertions. Checks passed: `npm run build`, `npm run smoke:cli-controls`, `npm run smoke:http`, and `npm run test`.
- 2026-06-29T05:36:38.374Z: automatically promoted after deterministic checks and evaluator approval.
