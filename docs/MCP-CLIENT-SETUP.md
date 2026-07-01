# MCP Client Setup

Mina AI Router exposes a local HTTP MCP endpoint:

```text
http://127.0.0.1:3333/mcp
```

Start the router first:

```sh
mair server start --port 3333
```

## Recommended Setup

Use the MAIR setup command from the project you want the agent to work in:

```sh
mair setup codex --project /path/to/project
mair setup claude --project /path/to/project
mair doctor --client all --project /path/to/project
```

`mair setup` discovers the matching running server's MCP URL, configures the selected CLI, links the `mina-ai-router-agent` registration skill, and verifies that the client reports the same MCP URL. `mair doctor` prints a pass/fail matrix for the server, CLI binary, MCP config, skill install, and current blocked agents.

Use the manual commands below only for unusual client profiles or repair work.

## Codex

Manual Codex MCP repair:

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

When a Codex session is created from the Web UI or `mair codex`, Mina runs an MCP preflight for that session profile. If the profile is missing or stale, the agent enters `mcp-configuring` and the inspector shows the setup, verify, and remove commands to run before self-registration continues.

## Claude

Manual Claude Code MCP repair:

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

Claude Code can keep MCP configuration per profile or project/session context. If a newly created Claude agent cannot see Mina MCP, keep it in `mcp-configuring`, run `mair setup claude --project /path/to/project` or the setup command shown by Mina, then verify with `mair doctor --client claude --project /path/to/project` before routing work to that session.

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

The source agent should call `list_agents` with its `callerSessionFingerprint` or `callerAgentId`, choose a target where `isSelf` is not true, send the work with `call_agent`, and check progress with `get_request_status`.

For a stronger first test, ask for both the routed answer and the request id:

```text
Use Mina AI Router to ask api_server:
Which endpoint should the frontend call for user lookup?
Return the routed answer and the Mina request id you used.
```

Then open the browser console and inspect that request in the activity panel. The request detail should show lifecycle status, request lease state, parsed answer or error, parser diagnostics, prompt evidence, raw terminal evidence, and recovery history.

If the target is stale, missing, or needs attention, ask the source agent to call `list_agents` again and select another available target or tell you which session needs repair.

If the request times out but the target terminal is still running, Mina keeps the lease as `orphaned`. Use `Interrupt Terminal` only when you want to send Ctrl-C to that tmux session. Use `Mark Recovered` after you have confirmed the session is idle or repaired. These are separate from `Cancel`, which only cancels an open router request.

## Available MCP Tools

- `list_agents`: list known agents and their statuses
- `register_agent`: register or update the current visible agent
- `call_agent`: send a task to another registered agent. Provide `callerAgentId` or `callerSessionFingerprint` so Mina can reject accidental self-calls. Use `allowSelfCall: true` only for diagnostics.
- `get_request_status`: check a routed request

`list_agents` returns `isSelf` for the caller when identity is supplied. A source agent should avoid targets where `isSelf` is true unless the user explicitly asked for a self-diagnostic.
