# HTTP UI and MCP Server

Mina Agent Router now runs as a local HTTP server.

It serves both:

- management UI: `http://127.0.0.1:3333/`
- streamable HTTP MCP endpoint: `http://127.0.0.1:3333/mcp`

## MCP Tools

The HTTP MCP endpoint exposes:

- `list_agents`
- `register_agent`
- `call_agent`
- `get_request_status`

## Start

```sh
cd /Users/stevenna/WebstormProjects/mina-aimesh
npm run build
node dist/apps/cli/src/index.js server start --port 3333
node dist/apps/cli/src/index.js server status
```

Or, after `npm link`:

```sh
mar server start --port 3333
mar server status
```

Stop:

```sh
mar server stop
```

## Connect Codex CLI

```sh
codex mcp remove mina-agent-router
codex mcp add mina-agent-router --url http://127.0.0.1:3333/mcp
codex mcp get mina-agent-router
```

Expected transport:

```text
transport: streamable_http
url: http://127.0.0.1:3333/mcp
```

## Use the UI

Open:

```text
http://127.0.0.1:3333/
```

The page shows:

- a router-centered agent flow diagram
- registered agents as clickable nodes around the router
- each agent's short capability notice on the node
- agent status, project root, capability details, and tmux metadata in a modal
- per-agent request history in a modal opened from the agent context menu
- agent controls in the context menu: details, history, ask, attach commands, copy attach command, restart session, delete agent
- right-click flow background menu for creating a tmux-backed Codex or Claude agent from a project directory
- a `Connect Agent` guide instead of manual UI registration
- hidden `Developer Tools` for POC helpers such as the two-Codex demo and stale request cleanup

## Health

The server exposes a local health endpoint:

```text
http://127.0.0.1:3333/api/health
```

The CLI exposes the same operator view:

```sh
mar health
mar version
mar verify
```

## Visible Agent Commands

Start a visible Codex agent in the current directory:

```sh
mar codex
```

This derives the agent id and tmux session from the current directory. For example, from `/Users/stevenna/WebstormProjects/minasoftai`, it uses:

- agent id: `minasoftai`
- tmux session: `codex-minasoftai`
- project root: current directory

The started agent also receives a self-registration prompt. During registration it should inspect `CLAUDE.md`, `claude.md`, `AGENTS.md`, `agents.md`, `agent.md`, `README.md`, or project metadata and send `capabilitySummary` and `capabilitySources` to MCP `register_agent`.

Start a visible Claude agent:

```sh
mar claude
```

Override values when needed:

```sh
mar codex --id ralph --session mina-ralph-codex --root /Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs
```

## Verify

```sh
npm run smoke:http
```

## Current Test Flow

1. Start HTTP server with `mar server start --port 3333`.
2. Open the UI.
3. Click `Connect Agent` for the registration command guide.
4. Start an agent from its project directory with `mar codex` or `mar claude`.
5. Confirm the agent appears in the flow diagram.
6. Click the agent node and use the context menu to inspect details, view history, or delete it.

Alternative UI-created agent flow:

1. Right-click the `Live Agent Flow` background.
2. Choose `Create tmux Agent`.
3. Select `codex` or `claude`.
4. Enter the target project directory or use `Browse Directory` to select it.
5. Create the agent.
6. Use the agent context menu `Attach Commands` when direct terminal control is needed.
