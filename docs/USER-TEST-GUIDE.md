# Mina Agent Router User Test Guide

This guide walks through the product-style local test flow.

The goal is to confirm that:

- the Mina HTTP server is running
- the UI shows the router-centered diagram
- two Codex projects are registered as visible agents
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
node dist/apps/cli/src/index.js serve --port 3333
```

Keep this terminal open.

Expected output:

```text
Mina Agent Router HTTP server
UI:  http://127.0.0.1:3333/
MCP: http://127.0.0.1:3333/mcp
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

## 3. Create or Reuse the Two-Codex Demo

In the UI, click:

```text
Create Two-Codex Demo
```

Expected:

- agent `ralph` appears in the diagram
- `ralph` status becomes `available` if its tmux session exists
- helper tmux session is created or reused

You can also run the equivalent CLI command:

```sh
cd /Users/stevenna/WebstormProjects/mina-aimesh
node dist/apps/cli/src/index.js setup-codex-pair
```

## 4. Confirm Helper Codex Is Visible

Open another terminal:

```sh
tmux attach -t mina-ralph-codex
```

Expected:

- you see Codex CLI
- directory is `/Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs`
- Codex is idle or ready for input

Detach without closing the session:

```text
Ctrl-b
d
```

Do not kill the tmux session.

## 5. Connect Codex CLI to Mina MCP

Run:

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

If the server is not running, Codex may still register the MCP URL, but tool calls will fail until the Mina server starts.

## 6. Start Main Codex

Open another terminal:

```sh
cd /Users/stevenna/WebstormProjects/minasoftai
codex --no-alt-screen
```

This is the main Codex session.

## 7. Test MCP Tool Discovery

In main Codex, ask:

```text
Use Mina Agent Router MCP list_agents and show me the registered agents.
```

Expected:

- main Codex calls `mina-agent-router.list_agents`
- the answer includes agents such as `ralph`
- the UI still shows the registered agents

If Codex asks for tool permission, approve it inside the main Codex CLI screen.

## 8. Test Main-to-Helper Conversation

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

## 9. Inspect the Request in the UI

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

## 10. Test Operator Controls

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

## 11. CLI Inspection

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

## 12. Stop the Test

Stop the Mina HTTP server with `Ctrl-c` in the server terminal.

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
