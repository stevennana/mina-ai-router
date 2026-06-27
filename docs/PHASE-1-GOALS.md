# Phase 1 Development Goals

## Goal

Phase 1 proves that Mina Agent Router can route a request from a primary agent workflow to a live helper agent session through `tmux`, then return the helper agent's marker-wrapped answer to the caller.

The target is a real local session bridge, not a multi-agent orchestration framework.

## Decision

Use `tmux` as the Phase 1 transport backend.

Reasons:

- `tmux` is already installed on the target development machine.
- no Zig/Rust/native compiler toolchain is required for the transport backend.
- `tmux send-keys` can inject prompts into live CLI sessions.
- `tmux capture-pane` can read session output for marker parsing.
- developers can attach to the same session directly to observe, interrupt, and recover.
- the router core can stay transport-agnostic.

`zmux` remains a possible future transport, but it is no longer the Phase 1 target.

## Success Statement

Phase 1 is complete when this works from the CLI and from the MCP server:

```text
main agent / Codex
  -> Mina Agent Router call_agent(target = "payment", task = "...")
  -> tmux send-keys -t payment <prompt envelope>
  -> live payment CLI agent receives the prompt
  -> payment agent responds with Mina response markers
  -> tmux capture-pane -t payment -p
  -> Mina parser extracts the answer
  -> caller receives { requestId, target, answer }
```

## Non-Goals

Phase 1 does not include:

- autonomous multi-agent planning
- web UI
- full terminal emulator features
- permission/security policy
- SaaS/team features
- advanced idle detection
- project indexing
- Mina Wiki integration
- replacing Codex, Claude, Gemini, or other agent CLIs

## Scope

Phase 1 includes:

- `tmux` as the first real live-session transport
- tmux session detection or creation
- prompt delivery through `tmux send-keys`
- output capture through `tmux capture-pane`
- marker-based wait and parse behavior
- CLI `ask` against a real tmux session
- MCP `call_agent` against the same tmux path
- persisted request status for success, failure, and timeout
- smoke documentation for manual verification

## Required Capabilities

### 1. Real Tmux Transport

Implement `TmuxTransport` using the local `tmux` binary.

Required operations:

- check whether `tmux` is available
- create or detect a named session
- send a prompt to a target session or pane
- capture pane output
- wait until response markers appear or timeout

The first implementation may shell out to `tmux` commands:

```sh
tmux has-session -t payment
tmux new-session -d -s payment -c ~/work/payment
tmux send-keys -t payment "<prompt>" Enter
tmux capture-pane -t payment -p -S -2000
```

The router core must continue to depend only on `AgentTransport`.

### 2. Agent Registration for Tmux

The CLI must register a helper agent with enough tmux metadata:

```sh
mar register payment \
  --agent gemini \
  --transport tmux \
  --session payment \
  --root ~/work/payment
```

The persisted agent record should include:

- agent id
- agent type
- project root
- transport type
- tmux session name
- optional tmux pane target
- optional startup command

### 3. Session Bootstrap

The router should support one of these Phase 1 modes:

- connect to an already-running tmux session
- create the tmux session if it does not exist

The first implementation may require the developer to start the actual agent manually inside the tmux session.

Automatic helper agent startup is optional for Phase 1.

### 4. Request/Response Flow

`call_agent` must:

1. create a request record
2. build a prompt envelope
3. send the prompt to the target tmux session
4. poll `capture-pane` until response markers appear or timeout
5. parse the marked answer
6. update request status
7. return the answer

Status lifecycle:

```text
created -> sent -> waiting -> answered
created -> sent -> waiting -> timeout
created -> sent -> failed
```

Failure and timeout states must be persisted.

### 5. MCP Tool Compatibility

The MCP server must expose:

- `list_agents`
- `call_agent`
- `get_request_status`

`call_agent` must work through the same router path as the CLI.

For Phase 1, the existing stdio JSON-RPC implementation is acceptable if it works with Codex CLI. If compatibility is shaky, switch to `@modelcontextprotocol/sdk`.

## Implementation Tasks

1. Add `tmux` as a first-class transport type.
2. Add tmux target metadata to agent types and registration.
3. Implement a small tmux command wrapper.
4. Implement `TmuxTransport.send` with `tmux send-keys`.
5. Implement `TmuxTransport.capture` with `tmux capture-pane`.
6. Implement marker polling in `TmuxTransport.waitForResponse`.
7. Persist failed and timeout request states.
8. Fix CLI `ask` argument parsing so task text is never accidentally stripped.
9. Add tmux smoke test docs.
10. Test with a shell session that echoes marker-wrapped responses.
11. Test with one real helper agent session.
12. Test through MCP from Codex CLI.

## Verification

Add a repeatable smoke test script or documented manual test that proves:

1. tmux is installed
2. payment session exists or can be created
3. router can send text into that session
4. router can capture session output
5. router can extract a marker-wrapped answer
6. CLI `mar ask payment "..."` returns the answer
7. MCP `call_agent` returns the answer

## Acceptance Criteria

Phase 1 can be accepted when all of these are true:

- `npm run build` passes.
- `headless` transport smoke test still passes.
- `tmux` transport can send text to a real tmux session.
- `tmux` transport can capture output from the same session.
- `mar ask payment "..."` returns only the marker body as `answer`.
- request records persist `answered`, `failed`, and `timeout` states correctly.
- MCP `call_agent` works against the same registered `payment` agent.
- tmux-specific logic remains isolated inside `packages/transports`.

## Known Risks

- `tmux capture-pane` output may include wrapped lines or terminal control artifacts.
- Long prompts may need careful paste handling instead of a single `send-keys` string.
- Marker-based parsing depends on the helper agent following instructions.
- Polling `capture-pane` is simple but less efficient than event-driven output streams.
- MCP server state path must be explicit enough that Codex CLI and local CLI read the same registry.
- Multiple panes in one session require an explicit target format such as `session:window.pane`.

## Recommended Phase 1 Definition of Done

Phase 1 should end with a short demo command sequence:

```sh
npm run build
tmux new-session -d -s payment -c ~/work/payment
tmux attach -t payment
mar register payment --agent gemini --transport tmux --session payment --root ~/work/payment
mar ask payment "현재 payment flow를 요약해줘."
```

The final command should return:

```json
{
  "requestId": "mar-...",
  "target": "payment",
  "answer": "..."
}
```

The `answer` field must contain only the text between Mina response markers.
