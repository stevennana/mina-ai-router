# Skill Install Guide

Mina AI Router includes a local skill:

```text
skills/mina-ai-router-agent/SKILL.md
```

The skill lets Codex or Claude register the current visible tmux-backed CLI session with MAIR without requiring the user to write a full registration payload.

## Codex

Install the skill into your Codex skills directory:

```sh
mkdir -p ~/.codex/skills
ln -sfn "$(npm root -g)/@minsoft/mina-ai-router/skills/mina-ai-router-agent" \
  ~/.codex/skills/mina-ai-router-agent
```

Restart Codex or open a new Codex session.

Use it from a MAIR-started session:

```sh
cd /path/to/project
mair codex
```

Then tell Codex:

```text
Register this CLI session with Mina AI Router.
```

Expected behavior:

1. Codex reads the skill.
2. Codex infers `pwd`, tmux session id, agent id, and agent type.
3. Codex reads project docs or metadata for capabilities.
4. Codex calls MCP `register_agent`.
5. Codex calls MCP `list_agents` and confirms registration.

## Claude

Claude Code project skills live under `.claude/skills/*/SKILL.md`.

For a single project, copy or link the MAIR skill into that project:

```sh
cd /path/to/project
mkdir -p .claude/skills
ln -sfn "$(npm root -g)/@minsoft/mina-ai-router/skills/mina-ai-router-agent" \
  .claude/skills/mina-ai-router-agent
```

Restart Claude or open a new Claude session.

Use it from a MAIR-started session:

```sh
cd /path/to/project
mair claude
```

Then tell Claude:

```text
Register this CLI session with Mina AI Router.
```

Expected behavior:

1. Claude invokes the `mina-ai-router-agent` skill.
2. Claude infers `pwd`, tmux session id, agent id, and agent type.
3. Claude reads project docs or metadata for capabilities.
4. Claude calls MCP `register_agent`.
5. Claude calls MCP `list_agents` and confirms registration.

## Web UI Created Agents

If you create an agent from the Web UI, installing the skill is still useful but not mandatory for the first node to appear.

The Web UI already creates an initial registration so the agent is visible immediately. The skill improves that registration by letting the agent inspect its own project and update `capabilitySummary` and `capabilitySources`.

## Verify

Open the MAIR UI:

```text
http://127.0.0.1:3333/
```

Click the agent node and choose `Status & Details`.

The capability summary should describe the target project, and the capability sources should mention files such as `CLAUDE.md`, `AGENTS.md`, `README.md`, or package metadata.
