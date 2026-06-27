# Mina Agent Router POC

This repository contains a small TypeScript proof of concept for routing a request from one local CLI agent workflow to another registered project-scoped agent.

## What Works Now

- Register helper agents in `data/router-state.json`.
- List registered agents.
- Ask a registered agent through the shared router.
- Track request lifecycle states.
- Build marker-based prompt envelopes.
- Parse marker-wrapped responses.
- Run the same core flow through a minimal stdio MCP server.
- Use `headless`/`mock` transport for local testing.

## Local Smoke Test

```sh
npm run build
node dist/apps/cli/src/index.js register payment --agent gemini --transport headless --session payment --root ./payment
node dist/apps/cli/src/index.js ask payment "현재 payment flow를 요약해줘."
```

For the real tmux transport:

```sh
npm run smoke:http
npm run smoke:tmux
npm run smoke:mcp
npm run smoke:multi
```

## CLI

```sh
mar register payment --agent gemini --transport headless --session payment --root ~/work/payment
mar agents
mar ask payment "현재 payment flow를 요약해줘."
mar requests
mar request <request-id>
```

## MCP Tools

The MCP server binary is `mar-mcp`.

Tools:

- `list_agents`
- `call_agent`
- `get_request_status`

The implementation uses MCP-compatible JSON-RPC framing over stdio and returns JSON payloads as text tool content.

## Transport Notes

The router core only depends on the `AgentTransport` interface. `headless` works for POC verification. Phase 1 targets `tmux` as the first real live-session transport because it is already available locally and does not require an extra compiler toolchain.

## Phase 1

See [PHASE-1-GOALS.md](./PHASE-1-GOALS.md) for the first development target. The short version: Phase 1 is complete when `call_agent` works end-to-end against a real live `tmux` session from both CLI and MCP.

See [TECH-STACK-DECISION.md](./TECH-STACK-DECISION.md) for why the project remains TypeScript-first.

See [GOALS-ROADMAP.md](./GOALS-ROADMAP.md) for the full development sequence and pass criteria.

The completed POC report is in [POC-COMPLETION-REPORT.md](./POC-COMPLETION-REPORT.md).

For the real two-Codex scenario using `minasoftai` and `mina-ralph-loop-bootstrap-nextjs`, see [TWO-CODEX-TEST.md](./TWO-CODEX-TEST.md).
