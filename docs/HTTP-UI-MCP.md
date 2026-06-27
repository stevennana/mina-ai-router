# HTTP UI and MCP Server

Mina Agent Router now runs as a local HTTP server.

It serves both:

- management UI: `http://127.0.0.1:3333/`
- streamable HTTP MCP endpoint: `http://127.0.0.1:3333/mcp`

## Start

```sh
cd /Users/stevenna/WebstormProjects/mina-aimesh
npm run build
node dist/apps/cli/src/index.js serve --port 3333
```

Or, after `npm link`:

```sh
mar serve --port 3333
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
