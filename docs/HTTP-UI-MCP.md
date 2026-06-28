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

- registered agents
- tmux session status
- request history
- request retry, cancel, archive, and stale cleanup controls
- request status filtering and search
- agent attach command copy
- tmux session restart controls
- health summary
- MCP URL and Codex registration command
- quick two-Codex setup for `minasoftai` and `mina-ralph-loop-bootstrap-nextjs`
- manual agent registration
- manual ask flow

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

1. Start HTTP server with `mar serve --port 3333`.
2. Open the UI.
3. Click `Create tmux Session & Register`.
4. Confirm `ralph` appears as available.
5. Run `codex mcp add mina-agent-router --url http://127.0.0.1:3333/mcp`.
6. Restart main Codex in `/Users/stevenna/WebstormProjects/minasoftai`.
7. Ask main Codex to call `call_agent` with `target=ralph`.
