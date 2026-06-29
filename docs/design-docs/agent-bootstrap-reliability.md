# Agent Bootstrap Reliability Design

Date: 2026-06-29

## Design Intent

Agent bootstrap reliability adds a small state machine around agent creation without replacing the existing router, registry, health, or request lifecycle models.

The core distinction is:

- `bootstrapStatus` answers whether the session has become a usable Mina collaborator.
- `health` answers whether an existing agent appears reachable and useful right now.
- request status answers what happened to a routed request.

## State Model

Suggested bootstrap states:

| State | Meaning |
| --- | --- |
| `created` | A record exists, usually from Web UI or CLI create, but no terminal confirmation has occurred. |
| `starting` | A terminal session has been created and startup output is being observed. |
| `permission-required` | Terminal evidence suggests a Codex/Claude trust or permission prompt blocks useful work. |
| `mcp-configuring` | Mina is running, pasting, or waiting for MCP setup instructions. |
| `registration-pending` | MCP should be available and Mina is waiting for the agent to confirm registration. |
| `ready` | Agent confirmed registration and has usable capability metadata. |
| `failed` | Startup or registration failed with an actionable reason. |

This status should be persisted on agent records and surfaced in the flow node, inspector, Web UI create flow, and CLI agent detail output.

## Boundaries

### Registry

The registry owns persistent agent fields:

- `bootstrapStatus`
- `registrationSource`
- `registrationStatus`
- `lastRegistrationAttemptAt`
- `confirmedByAgentAt`
- `sessionFingerprint`
- `capabilityQuality`

Repeated registration should merge into the same logical agent when ids or session fingerprints match.

### Transport

tmux transport owns terminal evidence:

- latest terminal excerpt
- last activity timestamp
- prompt detection hints
- optional interrupt command support

Transport should not decide MCP policy or capability quality. It only reports evidence.

### MCP Client Configurator

An `McpClientConfigurator` boundary should describe client-specific setup:

- detect whether Mina MCP is configured
- return setup command text
- optionally run a supported setup command
- explain unsupported states

Codex and Claude implementations can differ, but both should return a common preflight result.

### Router

The router owns caller identity and request lease behavior:

- infer or accept `sourceAgent`
- mark caller entries as `isSelf` in `list_agents`
- reject self-targeted `call_agent` requests by default
- record `activeRequestId`, `leaseStartedAt`, and `leaseExpiresAt` while a request is routed
- classify timed-out but still-active terminal sessions as needing attention

## Capability Profile Shape

Generated capabilities should move toward this shape:

```json
{
  "projectPurpose": "What this codebase appears to implement",
  "primaryLanguages": ["TypeScript"],
  "keyAreas": ["router", "MCP endpoint", "tmux transport"],
  "canAnswer": ["Questions this agent is likely useful for"],
  "cannotAnswerYet": ["Known limits or uninspected areas"],
  "evidence": ["README.md", "package.json", "src/..."],
  "quality": "strong"
}
```

`thin` quality should be assigned when the summary mostly says that files exist or that a doc was read.

## UI and CLI Expectations

- Web UI create should show bootstrap progress and avoid presenting a blocked agent as ready.
- Flow nodes should preserve the existing health badge while adding a compact bootstrap hint when not ready.
- Inspector should show the actionable next step: grant permission, configure MCP, confirm registration, refresh capabilities, or recover transaction.
- CLI output should use the same labels as the UI.

## Testing Strategy

- Unit tests cover state transitions, idempotent registration, self-call rejection, and capability quality scoring.
- HTTP smoke tests cover Web UI-visible agent creation metadata and request lease state.
- MCP smoke tests cover `isSelf` and self-call rejection behavior.
- tmux smoke tests cover prompt detection and long transaction recovery evidence.
- Docs smoke tests keep the operator-facing story aligned with the active queue.
