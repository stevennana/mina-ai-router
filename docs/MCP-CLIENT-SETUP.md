# MCP Client Setup

Mina AI Router exposes a local HTTP MCP endpoint:

```text
http://127.0.0.1:3333/mcp
```

Start the router first:

```sh
mair server start --port 3333
```

## Codex

Register the MAIR MCP server with Codex:

```sh
codex mcp remove mina-ai-router
codex mcp add mina-ai-router --url http://127.0.0.1:3333/mcp
codex mcp get mina-ai-router
```

Expected result:

```text
transport: streamable_http
url: http://127.0.0.1:3333/mcp
```

Then start Codex inside a project with MAIR:

```sh
cd /path/to/project
mair codex
```

## Claude

Register the MAIR MCP server with Claude Code:

```sh
claude mcp remove mina-ai-router
claude mcp add --transport http mina-ai-router http://127.0.0.1:3333/mcp
claude mcp get mina-ai-router
```

Then start Claude inside a project with MAIR:

```sh
cd /path/to/project
mair claude
```

## Verify From the AI CLI

In Codex or Claude, ask:

```text
Use Mina AI Router MCP list_agents and summarize the registered agents.
```

If the MCP setup is working, the agent should call `list_agents`.

## Available MCP Tools

- `list_agents`: list known agents and their statuses
- `register_agent`: register or update the current visible agent
- `call_agent`: send a task to another registered agent
- `get_request_status`: check a routed request
