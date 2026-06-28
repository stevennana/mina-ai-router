# Mina Agent Router User Test Guide

This guide walks through the product-style local test flow.

The goal is to confirm that:

- the Mina HTTP server is running
- the UI shows the router-centered diagram
- the router can start with `0 agents`
- each visible Codex session can register itself through Mina MCP
- main Codex can call helper Codex through Mina MCP
- the helper Codex console visibly receives the routed request
- the UI shows request status and result

## Test Projects

This guide uses the current local test pair:

| Role | Project | Agent ID | tmux Session |
| --- | --- | --- | --- |
| Main Codex | `/Users/stevenna/WebstormProjects/minasoftai` | `minasoftai` | `codex-minasoftai` |
| Helper Codex | `/Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs` | `ralph` | `mina-ralph-codex` |

## 0. Preflight

Open a terminal and run:

```sh
cd /Users/stevenna/WebstormProjects/mina-aimesh
npm run verify
```

Expected result:

```text
core tests passed
http smoke passed
tmux smoke passed
mcp smoke passed
multi-agent smoke passed
```

Then check local health:

```sh
node dist/apps/cli/src/index.js health
```

Expected:

- `tmuxAvailable` is `true`
- the command prints JSON
- `ok` is usually `true` when registered tmux sessions exist

## 1. Start Mina Router

In the Mina repo:

```sh
cd /Users/stevenna/WebstormProjects/mina-aimesh
npm run build
node dist/apps/cli/src/index.js server start --port 3333
node dist/apps/cli/src/index.js server status
```

Expected output:

```text
running: true
uiUrl: http://127.0.0.1:3333/
mcpUrl: http://127.0.0.1:3333/mcp
```

## 2. Open the UI

Open:

```text
http://127.0.0.1:3333/
```

Expected UI:

- central `MCP Router` node
- agent nodes around the router
- right-side detail panel
- bottom request list
- health summary near the top

If agents are missing, continue to the next step.

## 3. Connect Codex CLI to Mina MCP

Register the Mina MCP server once:

```sh
codex mcp remove mina-agent-router
codex mcp add mina-agent-router --url http://127.0.0.1:3333/mcp
codex mcp get mina-agent-router
```

Expected:

```text
transport: streamable_http
url: http://127.0.0.1:3333/mcp
```

This MCP configuration is used by Codex CLI sessions, including Codex sessions started inside tmux.

## 4. Start Helper Codex in tmux

Start helper Codex in the helper project:

```sh
cd /Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs
node /Users/stevenna/WebstormProjects/mina-aimesh/dist/apps/cli/src/index.js codex --id ralph --session mina-ralph-codex
```

This command:

- creates or reuses tmux session `mina-ralph-codex`
- starts `codex --no-alt-screen`
- sends a short Mina self-registration prompt into Codex when `ralph` is not registered
- attaches to the tmux session automatically

Expected:

- you see the real helper Codex console
- Codex receives a short registration request automatically
- after approval, Codex calls `register_agent`

Detach without closing the session with `Ctrl-b`, then `d`.

Do not kill the tmux session.

## 5. Register Helper Codex from Inside Helper Codex

If automatic registration did not run, ask the helper Codex console:

```text
Register this session with Mina Agent Router.
```

Expected:

- Codex calls `mina-agent-router.register_agent`
- the UI changes from `0 agents` to showing `ralph`
- `ralph` status is `available`
- the agent detail panel shows a capability summary and capability sources

If Codex asks for tool permission, approve it inside the helper Codex CLI screen.

## 6. Start Main Codex in tmux

Start main Codex in the main project:

```sh
cd /Users/stevenna/WebstormProjects/minasoftai
node /Users/stevenna/WebstormProjects/mina-aimesh/dist/apps/cli/src/index.js codex
```

By default this derives:

- `id`: `minasoftai`
- `sessionId`: `codex-minasoftai`
- `projectRoot`: current directory

## 7. Register Main Codex from Inside Main Codex

If automatic registration did not run, ask the main Codex console:

```text
Register this session with Mina Agent Router.
```

Expected:

- Codex calls `mina-agent-router.register_agent`
- the UI shows both `minasoftai` and `ralph`
- both agent nodes are visible around the central router
- each agent node has a short capability notice based on project docs or project structure

## 8. Test MCP Tool Discovery

In main Codex, ask:

```text
Use Mina Agent Router MCP list_agents and show me the registered agents.
```

Expected:

- main Codex calls `mina-agent-router.list_agents`
- the answer includes agents such as `ralph`
- the UI still shows the registered agents

If Codex asks for tool permission, approve it inside the main Codex CLI screen.

## 9. Test Main-to-Helper Conversation

In main Codex, ask:

```text
Use Mina Agent Router MCP call_agent with target=ralph.
Ask ralph:
"Summarize the purpose of mina-ralph-loop-bootstrap-nextjs and tell me whether any structure or idea is reusable for minasoftai."
```

Expected visible flow:

1. main Codex calls `mina-agent-router.call_agent`
2. Mina UI shows a new request targeting `ralph`
3. helper Codex tmux console receives the routed request automatically
4. helper Codex answers with Mina response markers
5. Mina parses the answer
6. main Codex receives the helper answer
7. UI request status becomes `answered`

You should not need to press Enter in the helper Codex console.

## 10. Inspect the Request in the UI

Go back to:

```text
http://127.0.0.1:3333/
```

Click the latest request in the bottom request list.

Expected:

- the target agent is selected
- the router-to-agent line is highlighted
- the right panel shows:
  - request id
  - source
  - target
  - task
  - answer or error

## 11. Test Operator Controls

Click agent `ralph`.

Expected available controls:

- `Ask via Router`
- `Copy Attach`
- `Restart Session`
- `Delete Agent`

Recommended safe tests:

1. Click `Copy Attach`.
2. Paste somewhere safe and confirm it copied:

```sh
tmux attach -t mina-ralph-codex
```

3. Select a failed or old waiting request.
4. Click `Archive` or `Cancel`.
5. Confirm the request status updates.

Use `Restart Session` carefully. It kills and recreates the tmux session for that agent.

## 12. CLI Inspection

From the Mina repo:

```sh
cd /Users/stevenna/WebstormProjects/mina-aimesh
node dist/apps/cli/src/index.js health
node dist/apps/cli/src/index.js agents
node dist/apps/cli/src/index.js requests --target ralph
```

Expected:

- health JSON prints server-oriented status
- `ralph` is listed
- recent requests targeting `ralph` are visible

## 13. Stop the Test

Stop the Mina HTTP server:

```sh
cd /Users/stevenna/WebstormProjects/mina-aimesh
node dist/apps/cli/src/index.js server stop
```

Optionally leave tmux Codex sessions running for the next test.

If you want to close helper tmux:

```sh
tmux kill-session -t mina-ralph-codex
```

## Troubleshooting

### UI does not load

Check that the server is running:

```sh
curl http://127.0.0.1:3333/api/health
```

### Agent is `missing`

Check tmux:

```sh
tmux ls
```

Recreate the demo from the UI with `Create Two-Codex Demo`, or run:

```sh
node dist/apps/cli/src/index.js setup-codex-pair
```

### Main Codex cannot see Mina tools

Re-register MCP:

```sh
codex mcp remove mina-agent-router
codex mcp add mina-agent-router --url http://127.0.0.1:3333/mcp
codex mcp get mina-agent-router
```

Restart main Codex after changing MCP configuration.

### Request stays `waiting`

Open helper Codex:

```sh
tmux attach -t mina-ralph-codex
```

Check if Codex is:

- waiting for login
- showing an approval prompt
- interrupted
- busy answering another request

If the request is stale, select it in the UI and click `Cancel` or `Archive`.

### Helper Codex receives text but does not answer

Make sure the helper session is actually Codex CLI and not a plain shell:

```sh
tmux capture-pane -t mina-ralph-codex -p -S -80
```

If needed, restart it from the UI with `Restart Session`.

## Pass Criteria

The user test passes when:

- `npm run verify` passes
- UI loads at `http://127.0.0.1:3333/`
- `ralph` appears as an available agent
- main Codex can call `list_agents`
- main Codex can call `call_agent target=ralph`
- helper Codex visibly receives the request
- no manual Enter is required in helper Codex
- UI shows the final request as `answered`
