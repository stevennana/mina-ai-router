# Mina AI Router

Mina AI Router is a local control plane for visible CLI AI agents.

It runs Codex or Claude sessions in `tmux`, registers them as project-scoped agents, exposes them through a local MCP server, and gives you a browser UI to inspect and control the live sessions.

GitHub: [stevennana/mina-ai-router](https://github.com/stevennana/mina-ai-router)

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

## What You Get

- Local HTTP UI at `http://127.0.0.1:3333/`
- Local MCP endpoint at `http://127.0.0.1:3333/mcp`
- `mair` CLI for server and agent controls
- Browser terminal preview for tmux-backed agents
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
