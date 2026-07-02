# Reliability

Mina AI Router is a local operator tool. Reliability means the user can understand and recover from agent, routing, transport, and parsing failures.

## Expected Failure Modes

- target agent tmux session is missing
- target agent is waiting for trust approval
- prompt is sent but no parseable response arrives
- response markers are missing or malformed
- request times out
- local state has stale agent registrations
- HTTP server and MCP client use different state files

## 0.2 Reliability Targets

- Request detail exposes raw and parsed evidence.
- Failed parse, timeout, cancellation, and retry are distinct states.
- Agent status distinguishes available, busy, stale, missing, and needs attention.
- Required smoke tests prove routing still works.

## Verification

Default full gate:

```sh
npm run verify
```

Focused tasks may run narrower commands during iteration, but required commands in task metadata are promotion gates.
