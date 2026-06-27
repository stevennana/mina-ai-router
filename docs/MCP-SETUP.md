# MCP Setup

Mina Agent Router exposes these MCP tools:

- `list_agents`
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

## Register a Tmux Helper Agent

```sh
tmux new-session -d -s payment -c ~/work/payment
MINA_ROUTER_STATE=/Users/stevenna/WebstormProjects/mina-aimesh/data/router-state.json \
  node dist/apps/cli/src/index.js register payment \
  --agent gemini \
  --transport tmux \
  --session payment \
  --root ~/work/payment
```

Attach to the helper session and start the desired CLI agent manually:

```sh
tmux attach -t payment
```

## Verify MCP Compatibility

```sh
npm run smoke:mcp
```

The smoke test starts a temporary tmux helper session, registers it through the CLI, calls the MCP server over stdio, and verifies that `call_agent` returns the marker-parsed answer.
