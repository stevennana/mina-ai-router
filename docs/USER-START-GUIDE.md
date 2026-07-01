# User Start Guide

This guide is for someone who wants to use Mina AI Router, not develop it.

Mina AI Router is for running several local Codex or Claude CLI agents and letting them collaborate through one local MCP router.

![Mina AI Router overview](./assets/mina-ai-router-overview.svg)

## What You Will Set Up

You will:

1. Install the `mair` command.
2. Start the local router and Web UI.
3. Connect Codex or Claude to the local MCP server.
4. Install the agent registration skill.
5. Create visible tmux-backed agents.
6. Route tasks between agents and watch the activity from the browser.

## 1. Install the `mair` Command

Use the GitHub checkout:

```sh
git clone https://github.com/stevennana/mina-ai-router.git
cd mina-ai-router
npm install
npm run build
npm link
```

Verify:

```sh
mair version
```

Expected output:

```json
{
  "name": "@minasoft/mina-ai-router",
  "version": "0.1.5"
}
```

## 2. Start the Router

```sh
mair server start --port 3333
mair server status
```

Open:

```text
http://127.0.0.1:3333/
```

The center node is the local MCP router. The surrounding nodes are visible Codex or Claude agents running in local tmux sessions.

![Live agent flow](./assets/mair-live-flow.jpg)

While the router server is running, it owns the live state for that `MINA_ROUTER_STATE` file. Normal CLI reads and writes talk to the matching server when possible, so `mair health`, `mair agents`, `mair agent <id>`, the Web UI, and MCP calls stay aligned during active routes.

## 3. Connect Your AI CLI to MCP

Pick the guide for the CLI you use:

- Codex: [Codex MCP Setup](./MCP-CLIENT-SETUP.md#codex)
- Claude: [Claude MCP Setup](./MCP-CLIENT-SETUP.md#claude)

This gives the AI CLI access to these MAIR MCP tools:

- `list_agents`
- `register_agent`
- `call_agent`
- `get_request_status`

## 4. Install the Registration Skill

Pick the guide for the CLI you use:

- Codex: [Codex Skill Install](./SKILL-INSTALL-GUIDE.md#codex)
- Claude: [Claude Skill Install](./SKILL-INSTALL-GUIDE.md#claude)

The skill lets the agent register itself without asking you to type a long JSON payload.

It automatically infers:

- project root
- tmux session id
- agent id
- agent type
- capability summary
- capability sources

Registration is idempotent. If the Web UI already created the agent placeholder, the skill should confirm and enrich that same agent instead of registering a second copy for the same tmux session.

## 5. Create an Agent From the Web UI

This is the easiest path for most users.

1. Right-click the empty area in `Live Agent Flow`.
2. Click `Create tmux Agent`.
3. Choose `codex` or `claude`.
4. Select a project directory.
5. Click `Create Agent`.

Mina creates or reuses a tmux session and registers the agent in the router. If the same tmux session later self-registers from the agent CLI, Mina updates the existing agent record instead of creating a duplicate.

Watch the readiness state after creation:

- `created`: Mina created or reused the tmux session.
- `permission-required`: Codex or Claude is waiting for trust or permission approval. Open the terminal and approve it.
- `mcp-configuring`: the session does not yet have the Mina MCP server configured. Run the setup command shown in the inspector.
- `registration-pending`: Mina is waiting for the agent to confirm self-registration.
- `ready`: the session is reachable, registered, and safe to route work to.
- `failed`: creation or preflight hit a blocker that needs operator repair.

If Codex or Claude needs trust approval, the Web UI shows the terminal so you can respond. If MCP setup is missing, the inspector shows the exact setup, verify, and remove commands for the CLI profile. A newly created blocked agent may show `needs-attention` until you complete the inspector's permission, MCP setup, or registration action; this is expected and prevents accidental routing.

## 6. Alternative: Create an Agent From a Terminal

From the project you want to expose as an agent:

```sh
cd /path/to/project
mair codex
```

For Claude:

```sh
cd /path/to/project
mair claude
```

Mina derives the agent id and tmux session name from the current directory.

## 7. Self-Register With the Skill

If the agent did not fully self-register, open the agent terminal and send:

```text
Register this CLI session with Mina AI Router.
```

If you created the agent from the Web UI, this step is still useful but not always required:

- the Web UI creates an initial registration immediately
- the skill can update that registration with a better project-aware capability summary

## 8. Inspect or Edit Capabilities

Click an agent node. The floating inspector opens on the right, and the bottom activity panel filters to that agent.

Use `Edit Capabilities` when you want to update what the agent is good at.

You can view and edit:

- capability summary
- capability sources
- structured capability quality
- answerable domains
- evidence sources
- project root
- tmux session
- attach commands

![Agent details and capabilities](./assets/mair-agent-details.jpg)

## 9. Open the Agent Terminal

Click an agent node and choose `Open Terminal` from the context menu or the inspector.

The browser shows the current tmux screen. Type into the input field and press `Enter`, or click `Send`.

Use this when:

- the agent is waiting for trust approval
- the agent is stuck at a prompt
- you want to see what the CLI is doing
- you need to manually type into the session

![Terminal preview](./assets/mair-terminal-preview.jpg)

## 10. Ask One Agent to Use Another

In a registered Codex or Claude session, ask it to use Mina AI Router.

Example:

```text
Use Mina AI Router to ask api_server:
Which REST API should aiagent call first for user lookup?
Summarize method, endpoint, parameters, and source files.
```

Expected flow:

1. The source agent calls `list_agents`.
2. It chooses a target agent where `isSelf` is not true.
3. It calls `call_agent`.
4. MAIR sends the task into the target tmux session.
5. The target agent answers with Mina response markers.
6. MAIR returns the parsed answer to the source agent.

You can watch the routed request in the bottom activity panel. Selecting the target agent filters that panel to only that agent's work.

## 11. Inspect the Routed Request

After the request appears in the activity panel, click the row to open the request detail view.

Use this view to check:

- source and target agent
- current lifecycle status
- request lease state
- parsed answer or error
- parser diagnostics for missing or malformed response markers
- prompt evidence sent to the target
- raw terminal evidence captured from the target agent
- recovery history for operator actions
- retry lineage when a request was retried

The detail view is the fastest way to understand whether a collaboration failed because the target timed out, the terminal transport failed, or the answer did not include Mina response markers.

## 12. Recover From a Bad Request

Use the activity panel actions when a collaboration needs operator help:

- `Retry` sends the same task again and links the new request back to the original.
- `Cancel` stops an open created, sent, or waiting request from being updated by a late terminal response.
- `Interrupt Terminal` sends Ctrl-C to the target tmux session for an orphaned timed-out request.
- `Mark Recovered` releases an orphaned request lease after you confirm the target session is idle or repaired.
- `Archive` hides old terminal noise without deleting the request history.
- `Unarchive` restores a request when you need to inspect it again.

These controls are intentionally local and explicit. Cancel request, interrupt terminal, and mark recovered are separate actions. They do not hide the original request; they preserve enough lineage and recovery history to explain what happened.

## 13. Refresh Capabilities

Each agent has a capability card that helps you decide where to route work.

Capability states mean:

- `Missing`: the agent has not registered a useful capability summary.
- `Fresh`: generated capability metadata was refreshed recently.
- `Stale`: generated capability metadata is old or missing a refresh timestamp.
- `Manual`: you edited the capability card yourself.
- `Strong`: the profile explains what the project does, what the agent can answer, and what evidence supports that claim.
- `Thin`: the profile exists but is too generic to trust for routing decisions.

From the inspector, use `Edit Capabilities` for manual corrections or `Copy Refresh Command` to copy:

```sh
mair agent refresh-capabilities <agent-id>
```

Run the command when an agent's project changed and you want it to inspect local docs again.

## 14. Read Health States

The UI and CLI use the same health states:

- `available`: the session is reachable and can receive routed work.
- `busy`: Mina is already routing a request to that agent.
- `stale`: Mina has not recently confirmed reachability.
- `missing`: the tmux session or transport target is gone.
- `needs-attention`: the agent needs an operator action before normal routing. This can mean the last routed request failed or timed out, or the agent is blocked on first-run readiness such as trust approval, MCP setup, or pending self-registration.
- `unknown`: this transport does not expose a live health check.

Useful CLI checks:

```sh
mair health
mair agents
mair agent <agent-id>
```

Use these before routing important work, especially after restarting terminals or deleting tmux sessions.

If you started the server on a non-default port, `mair health` uses the matching running server record and reports that MCP URL instead of the default `3333` URL. During a server-routed request, the same command should show the target agent as `busy`, matching the browser.

## 15. Stop the Router

```sh
mair server stop
```
