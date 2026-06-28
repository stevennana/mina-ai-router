# Mina AI Router

Mina AI Router is a local control plane for visible CLI AI agents.

It lets a developer run project-scoped Codex or Claude sessions in `tmux`, register them as agents, inspect their capabilities, and route questions between agents through a local MCP server.

## What It Does

- Runs a local HTTP UI and MCP endpoint.
- Shows live agents in a router-centered flow diagram.
- Starts Codex or Claude agents in `tmux` from a project directory.
- Includes a repo-local agent registration skill for self-registration.
- Captures and controls each agent terminal from the browser.
- Stores agent metadata, capability notices, and routed request history locally.
- Lets one registered agent ask another registered agent for project-specific context.

## Install the `mair` Command

```sh
npm install -g @minsoft/mina-ai-router
mair version
```

Then start the local router:

```sh
mair server start --port 3333
```

Open:

```text
http://127.0.0.1:3333/
```

## Documentation

- [Getting Started](./docs/GETTING-STARTED.md): choose the right start guide.
- [User Start Guide](./docs/USER-START-GUIDE.md): UI-first usage with screenshots.
- [Developer Start Guide](./docs/DEVELOPER-START-GUIDE.md): build, test, and development workflow.
- [MCP Client Setup](./docs/MCP-CLIENT-SETUP.md): Codex and Claude MCP registration.
- [Skill Install Guide](./docs/SKILL-INSTALL-GUIDE.md): Codex and Claude skill installation.
- [HTTP UI and MCP Server](./docs/HTTP-UI-MCP.md): server, MCP, and command reference.
- [Agent Registration Skill](./skills/mina-ai-router-agent/SKILL.md): instructions used by Codex or Claude to register the current visible CLI session.
- [Troubleshooting](./docs/TROUBLESHOOTING.md): common routing and tmux issues.

## Verification

```sh
npm run verify
```

This runs core tests plus HTTP, CLI control, tmux, MCP, and multi-agent smoke tests.
