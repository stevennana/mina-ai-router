# MCP Setup

Mina Agent Router exposes these MCP tools:

- `list_agents`
- `register_agent`
- `call_agent`
- `get_request_status`

## Build

```sh
npm run build
```

## Shared State

Set `MINA_ROUTER_STATE` so the local CLI and MCP server read the same agent registry and request history.

```sh
export MINA_ROUTER_STATE=/Users/stevenna/WebstormProjects/mina-aimesh/data/router-state.json
```

## MCP Server Command

Use the built MCP server:

```sh
node /Users/stevenna/WebstormProjects/mina-aimesh/dist/apps/mcp-server/src/index.js
```

Set the same environment variable in the MCP client configuration:

```text
MINA_ROUTER_STATE=/Users/stevenna/WebstormProjects/mina-aimesh/data/router-state.json
```

## Register a Tmux Helper Agent Through MCP

The product-style flow is:

1. Start Codex inside tmux for a project.
2. Ask that Codex session to call Mina MCP `register_agent`.
3. Mina Router shows that Codex session as an agent.

Example helper session:

```sh
tmux new-session -d -s payment -c ~/work/payment 'codex --no-alt-screen'
tmux attach -t payment
```

Inside Codex, ask:

```text
Use Mina Agent Router MCP register_agent to register this session.

Use:
- id: payment
- name: payment
- agentType: codex
- transport: tmux
- sessionId: payment
- projectRoot: ~/work/payment
- startupCommand: codex --no-alt-screen
```

The CLI `mar register` command remains useful for debugging and non-Codex agents, but the preferred visible Codex flow is self-registration through MCP.

## Verify MCP Compatibility

```sh
npm run smoke:mcp
```

The smoke test starts a temporary tmux helper session, registers it through MCP `register_agent`, calls `call_agent`, and verifies that the marker-parsed answer returns.
