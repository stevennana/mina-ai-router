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

Example helper session using the dedicated command:

```sh
cd ~/work/payment
mar codex --id payment --session codex-payment
```

The command starts tmux, launches Codex, sends a short self-registration prompt, and attaches to the session.

If automatic registration did not run, ask Codex:

```text
Register this session with Mina Agent Router.
```

The CLI `mar register` command remains useful for debugging and non-Codex agents, but the preferred visible Codex flow is self-registration through MCP.

## Agent Registration Skill

This repo includes a skill at:

```text
skills/mina-agent-router-agent/SKILL.md
```

The skill tells Codex or Claude to infer:

- project root from `pwd`
- tmux session from `tmux display-message -p '#S'`
- agent id from the project directory name
- agent type from the current CLI
- capability summary from `CLAUDE.md`, `claude.md`, `AGENTS.md`, `agents.md`, `agent.md`, `README.md`, or project structure
- capability sources from the files or project signals used

Then it calls MCP `register_agent`.

The registration payload may include:

- `capabilitySummary`: a concise explanation of what the visible agent can help with
- `capabilitySources`: comma-separated source files or project signals used to build that summary

This lets the router UI and other agents see not only that an agent is connected, but also what it is useful for.

## Verify MCP Compatibility

```sh
npm run smoke:mcp
```

The smoke test starts a temporary tmux helper session, registers it through MCP `register_agent`, calls `call_agent`, and verifies that the marker-parsed answer returns.
