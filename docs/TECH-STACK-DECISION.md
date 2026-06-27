# Technical Stack Decision

## Decision

Keep Mina Agent Router as a TypeScript and Node.js project for Phase 1.

Use `tmux` as the first real transport backend.

## Why TypeScript Still Fits

The hard parts of Phase 1 are orchestration and integration:

- MCP server process over stdio
- local CLI commands
- JSON state and request records
- prompt envelope construction
- response marker parsing
- spawning local commands
- calling `tmux`
- returning structured responses to the main agent

These are all strong fits for Node.js and TypeScript.

Using `tmux` reduces the need to write low-level terminal code ourselves. Mina does not need to implement a PTY, terminal emulator, scrollback buffer, daemon, socket server, or process supervisor in Phase 1. `tmux` owns the live terminal session; Mina only sends input and captures output.

## What We Should Avoid

Do not turn the TypeScript project into a terminal emulator.

Avoid building:

- PTY lifecycle management
- terminal rendering
- scrollback storage
- pane/window layout management
- raw keyboard handling
- complex terminal escape parsing

Those belong to `tmux` for Phase 1.

## TypeScript Responsibilities

TypeScript should own:

- agent registry
- request lifecycle
- prompt envelope builder
- marker response parser
- transport interface
- `TmuxTransport`
- MCP tools
- CLI
- persistence
- smoke tests

## When TypeScript Might Stop Being Enough

Reconsider the stack only if Mina needs to own terminal sessions directly.

Examples:

- no external `tmux` dependency allowed
- cross-platform Windows support is required
- high-throughput streaming terminal UI is required
- binary protocol or native PTY control becomes central
- Mina becomes a full terminal application

That is not Phase 1.

## Phase 1 Architecture

```text
Codex / main agent
  -> MCP call_agent
  -> TypeScript AgentRouter
  -> TmuxTransport
  -> tmux send-keys / capture-pane
  -> live helper agent session
```

## Practical Conclusion

TypeScript is appropriate for Phase 1.

The transport switch from `zmux` to `tmux` makes the TypeScript approach stronger, not weaker, because `tmux` removes the need for a custom native backend while preserving live-session behavior.
