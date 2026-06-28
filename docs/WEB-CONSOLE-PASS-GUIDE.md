# Tmux Web Console Pass Guide

## Purpose

This guide defines how to decide whether the tmux web console feature is ready to merge.

It should be used after implementing Phase 6.

## Required Automated Checks

Run:

```sh
npm run verify
```

The command must pass all existing checks:

- core tests
- HTTP smoke
- CLI controls smoke
- tmux smoke
- MCP smoke
- multi-agent smoke

The implementation should also add console-specific smoke coverage.

Minimum new coverage:

- register a temporary tmux agent
- capture its pane through HTTP
- send text through HTTP
- verify the text reaches the tmux session
- reject non-tmux console access
- reject unknown agent console access

## Required Browser Checks

Open:

```text
http://127.0.0.1:3333/
```

Check:

- first screen is still the router-centered flow diagram
- there is no permanent terminal panel
- there is no permanent request history panel
- agent context menu includes `Open Console`
- selecting `Open Console` opens a modal
- modal shows agent id, session id, and captured output
- modal has manual refresh
- modal has auto-refresh control
- modal has input and send controls
- closing the modal stops auto-refresh
- mobile and desktop widths have no horizontal overflow

## Manual Console Test

Create a temporary tmux session:

```sh
tmux new-session -d -s mina-console-test '/bin/sh'
tmux send-keys -t mina-console-test 'echo ready-for-console' Enter
```

Register it:

```sh
mar register console-test \
  --agent shell \
  --transport tmux \
  --session mina-console-test \
  --root /tmp \
  --summary "Temporary shell session for web console verification." \
  --sources "manual test"
```

Open the UI:

```text
http://127.0.0.1:3333/
```

Pass criteria:

- `console-test` appears as an agent node
- `Open Console` shows `ready-for-console`
- sending `echo hello-from-web` plus Enter updates the console output
- deleting the agent removes it from the diagram

Cleanup:

```sh
tmux kill-session -t mina-console-test
```

## Codex Agent Test

Start a real visible Codex agent:

```sh
cd /path/to/project
mar codex
```

Pass criteria:

- web console displays the current Codex CLI screen
- user can send a short prompt from the web console
- Codex receives the prompt
- if Codex asks for approval, the user can see that prompt in the web console
- if approval interaction is awkward, `tmux attach -t <session>` remains a documented fallback

## Failure Guidelines

Do not pass the feature if:

- the UI hides or deemphasizes the main agent flow diagram
- input can be sent to the wrong agent without a clear target label
- missing tmux sessions fail silently
- non-tmux agents expose misleading console controls
- console polling continues after the modal closes
- `npm run verify` fails
- special characters commonly corrupt normal text input

## Release Note Checklist

Before merging:

- update `HTTP-UI-MCP.md`
- update `TROUBLESHOOTING.md` if new failure modes are introduced
- include at least one smoke test for the console API
- confirm the local server still starts with `mar server start --port 3333`

