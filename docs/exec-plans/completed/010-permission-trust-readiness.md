# Permission trust readiness

```json taskmeta
{
  "id": "permission-trust-readiness",
  "title": "Permission and trust readiness",
  "order": 10,
  "status": "completed",
  "next_task_on_success": "mcp-preflight-agent-create",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/product-specs/agent-health-and-heartbeat.md"
  ],
  "required_commands": [
    "npm run build",
    "npm run smoke:http",
    "npm run smoke:cli-controls"
  ],
  "required_files": [
    "packages/transports/src/tmux/tmux-client.ts",
    "apps/http-server/src/index.ts",
    "apps/http-server/ui/src"
  ],
  "human_review_triggers": [
    "The task grants permissions outside the requested project root",
    "Permission prompts are hidden instead of surfaced",
    "The implementation assumes Codex and Claude use identical prompt text"
  ],
  "completed_at": "2026-06-29T05:24:16.670Z"
}
```

## Objective

Classify newly started agents that are blocked on permission or trust prompts so they do not appear ready for routed work.

## Scope

- Add terminal-output detection hints for common Codex and Claude trust or permission prompts.
- Map detected prompts to `permission-required` bootstrap state or `needs-attention` health detail.
- Add a local direct workspace read startup profile only where the underlying CLI already exposes a safe project-scoped flag or command shape.
- Surface actionable permission text in Web UI and CLI agent detail output.

## Out of scope

- Fully bypassing vendor permission systems.
- System-wide permission grants.
- MCP preflight.

## Exit criteria

1. Terminal evidence can classify a permission/trust blocked agent.
2. Web UI and CLI do not show a permission-blocked newly created agent as simply available.
3. Classification is covered by deterministic fixture-like terminal excerpts for at least one Codex-style and one Claude-style blocked prompt, or the task documents why one client cannot be classified safely yet.
4. Direct workspace read profile is explicit, scoped to the agent work directory, and marked unsupported when the CLI has no known safe project-scoped command shape.
5. Required checks pass.

## Required checks

- `npm run build`
- `npm run smoke:http`
- `npm run smoke:cli-controls`

## Evaluator notes

This task should stop at detection, state mapping, and visible startup profile metadata. If real Codex or Claude prompt strings are not stable, keep matching conservative and document unknowns rather than broadening the task into vendor-specific automation.

## Progress log

- 2026-06-29: Seeded from pain point 1.
- 2026-06-29T05:10:28.533Z: restored as current task after bootstrap-state-model promotion.
- 2026-06-29: Added deterministic Codex and Claude permission prompt detection in the tmux transport layer. tmux status now reports permission-blocked sessions as `needs-attention` with `permission-required` bootstrap status and actionable attach guidance. HTTP terminal capture, Web UI create flow, TerminalPanel, Inspector, and CLI start/detail output now surface the same prompt/profile metadata. Added an explicit `direct-workspace-read` permission profile that is marked unsupported when Mina has no known safe project-scoped startup flag. Added core prompt fixtures plus HTTP and CLI smoke assertions. Checks passed: `npm run build`, `npm run smoke:http`, `npm run smoke:cli-controls`, and `npm run test`.
- 2026-06-29T05:24:16.670Z: automatically promoted after deterministic checks and evaluator approval.
