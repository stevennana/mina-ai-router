# Architecture

Mina AI Router is a local Node.js package that connects visible CLI AI agents through MCP.

## Runtime Shape

- `mair` CLI starts/stops the local router, launches tmux-backed agents, and exposes operator commands.
- HTTP server serves the React operations console and local REST APIs.
- MCP server exposes streamable HTTP tools at `/mcp`.
- Core packages own agent registry, request store, routing, response parsing, and prompt envelope logic.
- Transport packages own tmux/headless/zmux session IO.
- Runtime state is local JSON by default.

## Main Layers

- CLI: `apps/cli/src/index.ts`
- HTTP server: `apps/http-server/src/index.ts`
- Browser UI: `apps/http-server/ui/src`
- MCP provider: `packages/mcp/src/provider.ts`
- Core domain: `packages/core/src`
- Transports: `packages/transports/src`
- Agent registration skill: `skills/mina-ai-router-agent/SKILL.md`
- Ralph loop: `scripts/ralph`

## Core Entities

- Agent: a registered CLI session with id, agent type, transport, session id, project root, status, and capability metadata.
- Request: a routed task from a source to a target agent with lifecycle status, timestamps, answer, and errors.
- Transport: the mechanism used to send prompts to an agent and read output.
- Capability summary: user- or agent-maintained metadata describing what an agent can do.

## Boundaries

- Core should not know browser UI details.
- UI should call HTTP APIs instead of reading state files directly.
- MCP tools should delegate to core services rather than duplicating routing logic.
- Transport-specific behavior belongs under `packages/transports`.
- Publish and release automation belongs in GitHub Actions, not local manual npm publish.

## Verification Contract

The current hard gate is:

```sh
npm run verify
```

It covers build, core tests, HTTP smoke, CLI controls, tmux, MCP, and multi-agent smoke flows.
Ralph task contracts may add narrower checks while iterating, but promotion is blocked if required checks fail.
