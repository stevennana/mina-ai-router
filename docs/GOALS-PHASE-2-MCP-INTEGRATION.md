# Phase 2 Goals: MCP Integration

## Goal

Make Mina Agent Router usable from Codex CLI through MCP, using the same `call_agent` path that works from the local CLI.

Phase 1 proves the transport. Phase 2 proves the main-agent integration.

## Scope

Phase 2 includes:

- stable MCP server startup command
- shared state path configuration
- MCP tool schema cleanup
- MCP smoke tests
- Codex CLI setup documentation
- compatibility decision on hand-written MCP framing versus `@modelcontextprotocol/sdk`

## Non-Goals

Phase 2 does not include:

- changing the core routing model
- adding a web UI
- adding permissions
- adding autonomous planning
- supporting remote/cloud MCP

## Implementation Tasks

1. Add explicit runtime configuration for router state path.
2. Ensure CLI and MCP server can read the same registry.
3. Make `list_agents`, `call_agent`, and `get_request_status` schemas strict and documented.
4. Add an MCP stdio smoke script.
5. Test `call_agent` through MCP against `headless`.
6. Test `call_agent` through MCP against `tmux`.
7. Decide whether the hand-written MCP server is enough.
8. If compatibility is weak, migrate to `@modelcontextprotocol/sdk`.
9. Document Codex CLI MCP configuration.

## Acceptance Criteria

Phase 2 passes when:

- `npm run build` succeeds.
- MCP `initialize` succeeds.
- MCP `tools/list` returns exactly `list_agents`, `call_agent`, and `get_request_status`.
- MCP `call_agent` works against a registered `headless` agent.
- MCP `call_agent` works against a registered `tmux` agent.
- MCP and CLI use the same state file when configured.
- `get_request_status` returns the persisted state for a request created through MCP.
- setup docs let a developer connect Codex CLI without reading source code.

## Verification

Manual or scripted verification must cover:

```text
initialize
tools/list
tools/call list_agents
tools/call call_agent
tools/call get_request_status
```

The `tmux` verification must return an answer body parsed from Mina response markers.

## Known Risks

- hand-written MCP framing may miss edge cases that the SDK handles.
- Codex CLI may run the MCP server from a different working directory than the local CLI.
- long-running `call_agent` requests may need careful timeout handling.
