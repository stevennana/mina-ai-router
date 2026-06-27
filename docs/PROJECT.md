# Mina Agent Router

Mina Agent Router is a local proof of concept for letting a primary CLI AI agent ask a live helper agent in another project for context-specific guidance.

The POC is intentionally small:

- `packages/core`: router, registry, request store, prompt envelope, response parser, shared types
- `packages/transports`: transport registry, headless transport, tmux transport, future adapter boundaries
- `apps/cli`: local `mar` command for manual testing
- `apps/mcp-server`: stdio MCP server exposing router tools

The immediate validation target is whether a main agent can call a registered helper agent, receive a marker-wrapped answer, parse it, and continue its own workflow.

## Current Development Target

Phase 1 focuses on adding a real `tmux` transport that can send prompts into live helper agent sessions and capture marker-wrapped answers. See [PHASE-1-GOALS.md](./PHASE-1-GOALS.md).

The TypeScript stack remains appropriate for this scope. See [TECH-STACK-DECISION.md](./TECH-STACK-DECISION.md).

The full PRD implementation sequence is tracked in [GOALS-ROADMAP.md](./GOALS-ROADMAP.md).

Setup and operation docs:

- [MCP-SETUP.md](./MCP-SETUP.md)
- [HTTP-UI-MCP.md](./HTTP-UI-MCP.md)
- [TWO-CODEX-TEST.md](./TWO-CODEX-TEST.md)
- [TMUX-SMOKE.md](./TMUX-SMOKE.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [POC-COMPLETION-REPORT.md](./POC-COMPLETION-REPORT.md)
- [PRODUCTIZATION.md](./PRODUCTIZATION.md)
