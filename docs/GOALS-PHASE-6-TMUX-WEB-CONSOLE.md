# Phase 6 Goals: Tmux Web Console

## Goal

Let the user inspect and lightly interact with a registered tmux-backed agent directly from the Mina web UI.

The feature should make visible agent sessions easier to use without turning Mina into a full terminal emulator.

## Scope

In scope:

- HTTP API for tmux console capture
- HTTP API for sending plain text and Enter to a tmux-backed agent
- `Open Console` action in the agent context menu
- modal-based console view
- manual refresh and auto-refresh
- simple input/send workflow
- missing-session and non-tmux error states
- smoke tests for console read/write behavior
- user documentation

Out of scope:

- xterm.js
- WebSocket or SSE streaming
- full TUI rendering
- keyboard shortcut forwarding
- raw control sequence support
- multi-pane management
- multi-user terminal sharing

## Design Principle

Keep the router flow as the main screen.

The console should be a temporary inspection and intervention surface opened from an agent node. It should not become a permanent bottom terminal panel or a second primary UI.

## Development Plan

### Step 1: Tmux Console Core

Tasks:

- add a tmux console helper or extend `TmuxClient`
- support capture by session id and optional target pane
- support configurable line count with a safe maximum
- add plain text send with optional Enter
- add unit or smoke coverage for capture/send quoting

Acceptance criteria:

- code can capture the last lines of a tmux session
- code can send text plus Enter to a tmux session
- missing tmux sessions return useful errors
- existing `npm run verify` passes

### Step 2: HTTP Console API

Tasks:

- add `GET /api/agents/:id/console`
- add `POST /api/agents/:id/console/input`
- reject non-tmux agents with a clear error
- reject unknown agents with a clear error
- expose captured text, line count, timestamp, and truncation flag
- keep API response JSON small and predictable

Acceptance criteria:

- a registered tmux smoke agent can be captured through HTTP
- text sent through HTTP appears in the tmux session
- non-tmux agents return `400`
- unknown agents return `404`
- `npm run smoke:http` covers the endpoints

### Step 3: Console Modal UI

Tasks:

- add `Open Console` to the agent context menu
- add a console modal with captured output
- add refresh button
- add auto-refresh toggle
- add input field, Send, and Enter buttons
- show attach command fallback
- show helpful missing-session and non-tmux states

Acceptance criteria:

- clicking an agent can open the console modal
- captured output is visible without using a terminal app
- sending input updates the target tmux session
- auto-refresh stops when the modal closes
- no console UI is visible on the first screen until requested
- no horizontal overflow at desktop and mobile widths

### Step 4: Operator Flow Documentation

Tasks:

- update `HTTP-UI-MCP.md`
- add console usage notes to troubleshooting if needed
- document when to use web console vs `tmux attach`
- document known limitations

Acceptance criteria:

- docs explain how to open and use the web console
- docs explain that it is not a full terminal emulator
- docs include recovery steps for missing sessions

### Step 5: End-to-End Verification

Tasks:

- add or update smoke tests
- run browser verification for modal behavior
- run full verification

Acceptance criteria:

- `npm run verify` passes
- browser check confirms:
  - `Open Console` appears in the agent context menu
  - console modal opens
  - output area renders captured tmux text
  - input can be submitted
  - modal can close cleanly

## Manual Test Scenario

1. Start MAR:

```sh
mar server start --port 3333
```

2. Start a project agent:

```sh
cd /path/to/project
mar codex
```

3. Open:

```text
http://127.0.0.1:3333/
```

4. Click the agent node.
5. Choose `Open Console`.
6. Confirm current CLI output appears.
7. Type a short message and send it.
8. Confirm the tmux session receives the input.
9. Close the modal.
10. Confirm the diagram remains the primary screen.

## Risks

- Codex approval flows may still be easier in a real terminal.
- Plain text capture may show stale scrollback.
- Polling may miss very fast changes.
- Special characters may require careful escaping.

## Phase Exit Criteria

Phase 6 is complete when:

- the user can inspect a tmux-backed agent from the web UI
- the user can send simple input from the web UI
- the feature is discoverable from the agent context menu
- the first screen remains focused on the agent flow diagram
- tests and documentation are updated
- `npm run verify` passes

