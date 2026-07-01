# Getting Started

Mina AI Router lets multiple local Codex and Claude CLI agents collaborate through one local MCP router and browser console.

![Mina AI Router overview](./assets/mina-ai-router-overview.svg)

Choose the guide that matches what you are trying to do.

## For Users

Start here if you want to run Mina AI Router, create agents, open their terminals in the browser, and make agents talk to each other.

[User Start Guide](./USER-START-GUIDE.md)

## For Developers

Start here if you want to build, test, modify, or package this repository.

[Developer Start Guide](./DEVELOPER-START-GUIDE.md)

## Setup Reference Guides

Use these when you need manual repair details or custom client profiles:

- [MCP Client Setup](./MCP-CLIENT-SETUP.md): connect Codex or Claude to the local MAIR MCP server.
- [Skill Install Guide](./SKILL-INSTALL-GUIDE.md): install the MAIR registration skill for Codex or Claude.

## Recommended First Path

1. Install the local `mair` command.
2. Start the MAIR server.
3. Run `mair setup codex --project /path/to/project` and `mair doctor --client codex --project /path/to/project` if you use Codex, or the matching `claude` commands if you use Claude.
4. Use `mair doctor --client all --project /path/to/project` only when both clients are installed and configured.
5. Create two or more agents from the Web UI or with `mair codex` / `mair claude`.
6. Ask one registered agent to use Mina AI Router to call another agent.

The user guide walks through that path with screenshots.
