# Phase 0 Goals: Foundation

## Goal

Create the smallest TypeScript project that proves the router shape before touching a real live terminal backend.

This phase establishes the core abstractions and a deterministic `headless` transport.

## Scope

Phase 0 includes:

- TypeScript build setup
- CLI entry point
- MCP server entry point
- core router
- agent registry
- request store
- prompt envelope builder
- marker response parser
- transport interface
- `headless` transport
- docs for the current project shape

## Non-Goals

Phase 0 does not include:

- real tmux integration
- real helper agent sessions
- SQLite
- MCP SDK migration
- multi-agent operations
- production packaging

## Implementation Tasks

1. Create TypeScript project structure.
2. Add `packages/core`.
3. Define shared types.
4. Implement prompt envelope builder.
5. Implement marker parser.
6. Implement in-memory request store.
7. Add JSON file-backed state for POC use.
8. Add `headless` transport.
9. Add CLI commands: `register`, `agents`, `ask`, `requests`, `request`.
10. Add MCP tools: `list_agents`, `call_agent`, `get_request_status`.
11. Add smoke docs.

## Acceptance Criteria

Phase 0 passes when:

- `npm run build` succeeds.
- `mar register payment --transport headless ...` persists an agent.
- `mar agents` lists the registered agent.
- `mar ask payment "..."` returns a marker-parsed answer.
- `mar requests` lists the request with `answered` status.
- MCP `tools/list` exposes the three POC tools.
- MCP `tools/call` can call `call_agent` against `headless`.
- router core does not import any concrete transport implementation.

## Verification

```sh
npm run build
node dist/apps/cli/src/index.js register payment --agent gemini --transport headless --session payment --root ./payment
node dist/apps/cli/src/index.js agents
node dist/apps/cli/src/index.js ask payment "현재 payment flow를 요약해줘."
node dist/apps/cli/src/index.js requests
```

## Current Status

Mostly complete.

Known gaps that may be addressed in later phases:

- request failure states are not always persisted by the caller path
- CLI argument parsing is intentionally minimal
- MCP server uses hand-written stdio JSON-RPC framing
