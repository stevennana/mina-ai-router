# Mina AI Router

Mina AI Router turns multiple local Codex and Claude CLI sessions into a visible collaboration mesh.

It runs each AI agent in a `tmux` session on your computer, registers the session with a local MCP router, and gives you a browser console to route work, inspect status, open terminal previews, and watch request activity.

![Mina AI Router overview](docs/assets/mina-ai-router-overview.svg)

GitHub: [stevennana/mina-ai-router](https://github.com/stevennana/mina-ai-router)

## Why Use It

Use Mina AI Router when you want several CLI agents to work together across local projects:

- ask one Codex or Claude session to delegate work to another
- keep every agent visible in `tmux`
- route tasks through local MCP tools instead of copy-pasting between terminals
- see live agent status, capabilities, terminal previews, and request history in one browser console
- keep orchestration local-first on your machine

## Install

```sh
npm install -g @minasoft/mina-ai-router
mair version
```

## Start

```sh
mair server start --port 3333
mair server status
```

Open the Web UI:

```text
http://127.0.0.1:3333/
```

## Connect Codex or Claude

Codex:

```sh
codex mcp remove mina-ai-router
codex mcp add mina-ai-router --url http://127.0.0.1:3333/mcp
codex mcp get mina-ai-router
```

Claude:

```sh
claude mcp remove mina-ai-router
claude mcp add --transport http mina-ai-router http://127.0.0.1:3333/mcp
claude mcp get mina-ai-router
```

## Create an Agent

From a project directory:

```sh
mair codex
```

or:

```sh
mair claude
```

You can also create agents from the Web UI by right-clicking the `Live Agent Flow` area and choosing `Create tmux Agent`.

## Collaborate Between Agents

From a registered Codex or Claude session, ask it to use Mina AI Router:

```text
Use Mina AI Router to ask api_server:
Which REST endpoint should this frontend call for user lookup?
Summarize the method, endpoint, parameters, and source files.
```

The source agent calls MCP `list_agents`, selects a target, sends the task with `call_agent`, and waits for the routed answer.

## What You Get

- Local HTTP UI at `http://127.0.0.1:3333/`
- Local MCP endpoint at `http://127.0.0.1:3333/mcp`
- `mair` CLI for server and agent controls
- Browser operations console with live flow, inspector, terminal preview, and activity log
- Agent capability summaries and editable metadata
- MCP tools: `list_agents`, `register_agent`, `call_agent`, `get_request_status`
- Repo-local skill for agent self-registration

## Guides

- [Getting Started](https://github.com/stevennana/mina-ai-router/blob/main/docs/GETTING-STARTED.md)
- [User Start Guide](https://github.com/stevennana/mina-ai-router/blob/main/docs/USER-START-GUIDE.md)
- [MCP Client Setup](https://github.com/stevennana/mina-ai-router/blob/main/docs/MCP-CLIENT-SETUP.md)
- [Skill Install Guide](https://github.com/stevennana/mina-ai-router/blob/main/docs/SKILL-INSTALL-GUIDE.md)
- [HTTP UI and MCP Server](https://github.com/stevennana/mina-ai-router/blob/main/docs/HTTP-UI-MCP.md)
- [Troubleshooting](https://github.com/stevennana/mina-ai-router/blob/main/docs/TROUBLESHOOTING.md)
- [Release Guide](https://github.com/stevennana/mina-ai-router/blob/main/docs/RELEASE.md)

## Development

```sh
git clone https://github.com/stevennana/mina-ai-router.git
cd mina-ai-router
npm install
npm run verify
```
