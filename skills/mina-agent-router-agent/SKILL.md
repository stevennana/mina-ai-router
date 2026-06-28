---
name: mina-agent-router-agent
description: Register the current visible Codex or Claude CLI session with Mina Agent Router through MCP. Use when the user says to connect, register, join, attach, or make the current CLI agent available in Mina/MAR, especially from inside a tmux-backed project session.
---

# Mina Agent Router Agent

## Purpose

Register the current visible CLI agent session with Mina Agent Router using the MCP tool `register_agent`.

Use this skill when the user asks for a short instruction such as:

- "register this session with Mina"
- "connect this agent to MAR"
- "join the router"
- "make this Codex/Claude visible in Mina"

## Workflow

1. Collect local context with shell commands when available:

```sh
pwd
tmux display-message -p '#S' 2>/dev/null || true
tmux display-message -p '#{pane_id}' 2>/dev/null || true
```

2. Infer fields:

- `projectRoot`: output of `pwd`
- `sessionId`: tmux session name from `tmux display-message -p '#S'`
- `id`: project directory basename, lowercased and normalized to letters, digits, `_`, and `-`
- `name`: same as `id` unless the user gave a name
- `agentType`: `codex` when running in Codex; `claude` when running in Claude
- `transport`: `tmux`
- `startupCommand`: `codex --no-alt-screen` for Codex, `claude` for Claude

3. Build a capability notice for this session.

Prefer these project files when present:

- `CLAUDE.md` or `claude.md`
- `AGENTS.md` or `agents.md`
- `agent.md`
- `README.md`

If none of those files exist, inspect project metadata and structure, such as `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, source directories, and test directories.

Set:

- `capabilitySummary`: 2-5 short bullets or one short paragraph under 800 characters that explains what this agent can help with.
- `capabilitySources`: comma-separated file paths or project signals used for the summary.

4. Call Mina MCP `register_agent` with the inferred values and capability notice.

5. Call Mina MCP `list_agents` and confirm the registered agent is present with its capability notice.

## Rules

- Do not ask the user to manually provide the full registration payload unless inference fails.
- If not running inside tmux, explain that Mina visible-session routing expects a tmux session and ask the user to start through `mar codex` or `mar claude`.
- If `register_agent` is not available, ask the user to update Mina Agent Router or restart the MCP server.
- Keep the user-facing response short: say the agent id, session id, project root, capability source, and registration status.
