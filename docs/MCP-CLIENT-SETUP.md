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

## Collaboration Prompt Example

After two or more agents are registered, ask one of them:

```text
Use Mina AI Router to ask docs:
Review the README changes and summarize what a first-time user should understand.
```

The source agent should call `list_agents`, choose the target agent, send the work with `call_agent`, and check progress with `get_request_status`.

For a stronger first test, ask for both the routed answer and the request id:

```text
Use Mina AI Router to ask api_server:
Which endpoint should the frontend call for user lookup?
Return the routed answer and the Mina request id you used.
```

Then open the browser console and inspect that request in the activity panel. The request detail should show lifecycle status, parsed answer or error, parser diagnostics, and raw terminal evidence.

If the target is stale, missing, or needs attention, ask the source agent to call `list_agents` again and select another available target or tell you which session needs repair.

## Available MCP Tools

- `list_agents`: list known agents and their statuses
- `register_agent`: register or update the current visible agent
- `call_agent`: send a task to another registered agent
- `get_request_status`: check a routed request
