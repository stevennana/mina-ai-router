# Security

Mina AI Router is local-first but still touches powerful surfaces: project directories, tmux sessions, terminal input, and MCP tools.

## Current Posture

- Runs locally by default.
- Uses local HTTP endpoints.
- Stores runtime state in local JSON.
- Sends prompts into visible tmux sessions.
- Does not claim sandboxing for the target CLI agents.

## Rules

- Do not log secrets by default.
- Do not publish local state files.
- Keep MCP endpoints local unless the operator intentionally exposes them.
- Require human-visible controls for agent creation, deletion, restart, and terminal input.
- Treat future automation and GitHub integration as opt-in.

## 0.2 Security Notes

Request diagnostics should help debugging without dumping unnecessary sensitive content.
If raw terminal excerpts are stored, future tasks must consider redaction and export boundaries.
