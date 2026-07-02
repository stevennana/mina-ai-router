# Agent Bootstrap Reliability

Date: 2026-06-29

## Purpose

Mina should know whether a newly created local CLI agent is actually ready to collaborate.

Milestone 0.2 improved request diagnostics after a routed request exists. This spec covers the earlier failure modes seen on the main branch: agent sessions can appear available while permission prompts, MCP setup, duplicate registration, weak capabilities, self-calls, or orphaned long transactions make collaboration unreliable.

## User story

As a local operator, I want to create a Codex or Claude CLI agent from the Web UI or CLI and immediately understand whether it is ready, blocked, configuring MCP, confirming registration, or still working on an old request.

## Pain Point Gap Map

| Pain point | Current gap | Desired outcome |
| --- | --- | --- |
| Web UI agent creation starts before permission readiness | Agent can show `available` while waiting for trust or directory permission | Agent creation exposes bootstrap state and permission/trust readiness before routing work |
| Client update prompt blocks first run | Codex update prompt can look like a generic enter-to-continue screen | Update prompts use `client-update-required`, do not set trust approval state, and block routing until cleared |
| MCP setup is not automatic per session | Claude/Codex sessions may lack Mina MCP config when self-registration starts | Agent creation runs or guides MCP preflight before asking the agent to register |
| Long transactions outlive router timeout | Router request can time out while target terminal still works | Request leases track orphaned-running sessions and give explicit recovery actions |
| Agent does not recognize itself | Agents can route work to their own session | `list_agents` marks the caller as self and `call_agent` blocks self-calls by default |
| Capability summaries are too generic | Generated capabilities mention files instead of answerable domains | Capability profiling produces structured, evidence-backed, quality-scored summaries |
| Duplicate registration after Web UI creation | UI-created placeholder and agent self-registration feel like two registrations | Registration handshake is idempotent and confirms an existing placeholder |

## Functional Requirements

1. Track bootstrap status separately from request status and terminal health.
2. Detect Codex and Claude permission or trust prompts from terminal capture where practical.
3. Support explicit startup permission profiles, including a local direct workspace read profile.
4. Run or present MCP setup preflight before self-registration prompts.
5. Treat Web UI-created agent records as placeholders until the running agent confirms them.
6. Include caller identity in MCP agent listing and request routing decisions.
7. Reject self-targeted `call_agent` requests unless explicitly allowed.
8. Generate structured capability profiles with evidence and quality labels.
9. Track request leases so timed-out requests can be reconciled with still-active terminal sessions.
10. Expose every bootstrap and recovery state in both Web UI and CLI.
11. Treat client update prompts as a distinct bootstrap blocker.
12. Verify MCP setup with both the named config entry and the client's visible MCP list.

## Non-goals

- Replacing Codex or Claude permission systems.
- Running arbitrary privileged setup commands without a visible command path.
- Building a hosted multi-user orchestrator.
- Hiding terminal sessions from the operator.

## Acceptance Criteria

- A newly created agent cannot silently look ready while blocked on a known permission or MCP setup prompt.
- A Codex update prompt is not classified as directory trust and is surfaced as `client-update-required`.
- Agent creation has an idempotent path from UI placeholder to agent-confirmed registration.
- MCP `list_agents` clearly identifies the caller's own agent entry.
- Self-calls fail with a clear error unless the caller opts in.
- Capability summaries explain what the project can answer, not only which files exist.
- Timed-out long transactions leave enough lease state for the operator to cancel, interrupt, or mark recovered.

## References

- [Main branch usage feedback](../references/main-branch-usage-feedback-2026-06-29.md)
- [Agent health and heartbeat](./agent-health-and-heartbeat.md)
- [Agent capability refresh](./agent-capability-refresh.md)
- [Request diagnostics and controls](./request-diagnostics-and-controls.md)
