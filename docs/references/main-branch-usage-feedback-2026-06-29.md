# Main Branch Usage Feedback Review

Date: 2026-06-29

This note compares operator pain points observed while using the main branch with the milestone 0.2 branch state. It is a product planning reference, not an implementation contract.

## Summary

Milestone 0.2 substantially improves observability and recovery after a collaboration request exists:

- request lifecycle diagnostics
- parsed/raw evidence
- retry, cancel, archive, and unarchive controls
- capability freshness metadata
- shared UI/CLI health labels

It does not yet fully solve the agent bootstrap problems that happen before an agent is ready to collaborate:

- permission/trust prompt readiness
- MCP preflight and auto-configuration
- caller identity and self-avoidance
- high-quality capability profiling
- idempotent registration after Web UI creation
- long-running transaction supervision beyond request timeout state

The next development wave should focus on **Agent Bootstrap Reliability** before adding broader team or automation features.

## 1. Web UI Agent Create Starts Before Permission Readiness

### Observed Pain

When a Codex or Claude agent is created from the Web UI, the session can appear `available` even though the CLI is waiting for directory trust or permission approval. In practice the agent is not ready to receive routed work.

The desired behavior is pragmatic: when Mina starts an agent for a work directory, grant broad read permission for that directory so the agent can begin useful work without blocking on a trust prompt.

### 0.2 Improvement

0.2 adds shared health states:

- `available`
- `busy`
- `stale`
- `missing`
- `needs-attention`
- `unknown`

The Web UI and CLI now show the same health model, and the terminal panel can notice some trust-prompt text for Codex terminal previews.

### Remaining Gap

The health model does not yet classify a trust/permission prompt as a first-class status such as `permission-required`.

The Web UI create flow still starts from a generic startup command and then sends a self-registration prompt. It does not have a permission profile or CLI-specific readiness contract.

### Recommended Work

Add a permission-aware bootstrap flow:

- Add `permission-required` or `needs-attention` classification when terminal capture detects trust/permission prompts.
- Add startup profiles for Codex and Claude:
  - safe default
  - direct workspace read
  - custom command
- Persist `bootstrapStatus` on the agent:
  - `created`
  - `starting`
  - `permission-required`
  - `mcp-configuring`
  - `registration-pending`
  - `ready`
  - `failed`
- Show bootstrap status in the create modal, flow node, and inspector.

### Priority

P0 for the next wave. If the user cannot trust whether a newly created agent is ready, later collaboration features feel unreliable.

## 2. MCP Setup Is Not Automatic Per Agent Session

### Observed Pain

Claude Code appears to need MCP setup per directory or session context. Starting an agent without MCP configured means the session cannot self-register or collaborate correctly.

The preferred behavior is: when `mair` or the Web UI starts an agent session, Mina should ensure the MCP server is configured first, or at least inject the exact setup command before asking the agent to register.

### 0.2 Improvement

0.2 documentation explains MCP setup more clearly, and `mair setup-codex-pair` can produce a Codex MCP command for a helper pairing flow.

### Remaining Gap

Agent creation does not run an MCP preflight.

There is no CLI-specific MCP configuration adapter for:

- Codex project/session setup
- Claude Code project/session setup
- already configured vs missing vs stale MCP endpoint

### Recommended Work

Add MCP preflight before agent startup:

- Introduce an `McpClientConfigurator` boundary with Codex and Claude implementations.
- For each agent create path, check whether the current project/session has `mina-ai-router` configured.
- If missing, either:
  - auto-run the supported setup command, or
  - paste the exact setup command into the terminal and mark the agent `mcp-configuring`.
- Add UI feedback for MCP setup state.
- Add smoke coverage for generated MCP setup command shape.

### Priority

P0. Agent self-registration depends on MCP availability.

## 3. Long Transactions Continue After Router Timeout

### Observed Pain

When a routed question takes longer than the timeout, Mina marks the request as timed out, but the target agent may still be working in the terminal. Manual terminal control can also interrupt the request flow.

This can leave the system in a confusing state: the router thinks the transaction is over, the target session may still be busy, and the user may not be able to safely send another request.

### 0.2 Improvement

0.2 improves request lifecycle states and recovery controls:

- timeout vs parse failure vs transport failure
- retry
- cancel
- archive/unarchive
- raw terminal evidence
- busy health state during active router calls

### Remaining Gap

Cancellation is request-state cancellation, not session-level cancellation.

Mina does not yet track a lease between a request and the target terminal session after the router timeout. It also does not detect whether the target terminal is still producing output for the timed-out request.

### Recommended Work

Add request leases and session monitoring:

- Record `activeRequestId`, `leaseStartedAt`, and `leaseExpiresAt` per target agent.
- On timeout, mark request `timeout` but agent `needs-attention` or `orphaned-running` when terminal output still appears active.
- Add an explicit operator action:
  - `Cancel request only`
  - `Send interrupt to terminal`
  - `Mark session recovered`
- Add terminal capture diffing to detect activity after timeout.
- Add a request status such as `orphaned` or an agent health detail explaining that the session may still be working.

### Priority

P1. This is critical for daily use, but it builds on the bootstrap readiness work.

## 4. Agent Does Not Recognize Itself

### Observed Pain

Agents choose targets from `list_agents`, but they can accidentally send work to themselves. The source agent needs to know which registered agent represents the current session.

### 0.2 Improvement

No direct fix in 0.2.

### Remaining Gap

MCP request context does not carry a reliable caller agent id. `list_agents` returns all agents without marking the caller as `self`.

### Recommended Work

Add caller identity:

- During registration, persist a stable session fingerprint.
- In MCP context, infer caller identity from one of:
  - configured agent id in MCP client env
  - session id
  - explicit `sourceAgent`
  - registration token
- Update `list_agents` response:
  - `isSelf: true`
  - `recommendedTarget: false`
  - `selectionReason`
- Update `call_agent`:
  - reject self-target by default
  - allow override only with `allowSelfCall: true`
- Update prompts so agents are told: do not call yourself.

### Priority

P0/P1. It is small compared with bootstrap, but it prevents a very confusing failure mode.

## 5. Capability Summaries Are Too Generic

### Observed Pain

Capabilities often say things like "CLAUDE.md was referenced" or "src directory exists." That does not help select the right agent.

For a C API project such as CCSMP, the capability should explain:

- what the codebase appears to implement
- important modules or protocols
- what questions this agent can answer well
- build/test/runtime signals
- boundaries and unknowns

### 0.2 Improvement

0.2 adds:

- capability refresh command
- manual vs generated capability source
- freshness metadata
- stale/missing/manual/fresh UI states
- manual editing path

### Remaining Gap

The generator prompt still accepts shallow summaries. There is no quality gate rejecting low-information capability text.

### Recommended Work

Add a capability profiler:

- Inspect multiple sources, not only one doc file:
  - README
  - CLAUDE/AGENTS files
  - package metadata
  - build files
  - top-level modules
  - language-specific manifests
- Produce structured output:
  - `projectPurpose`
  - `primaryLanguages`
  - `keyAreas`
  - `canAnswer`
  - `cannotAnswerYet`
  - `evidence`
- Reject weak summaries containing only generic file mentions.
- Add `capabilityQuality`:
  - `strong`
  - `thin`
  - `missing`
- Show `thin` in the UI and recommend refresh or manual edit.

### Priority

P1. Good capabilities are central to choosing targets, but MCP/bootstrap readiness should come first.

## 6. Duplicate Registration After Web UI Creation

### Observed Pain

After creating an agent from the Web UI, the agent session still says it is registering and performs another registration. This can feel like a duplicate action.

### 0.2 Improvement

Registry registration is merge-oriented, so repeated registration tends to update the same agent id rather than creating a totally separate record.

### Remaining Gap

The bootstrap prompt is not idempotent from the user's perspective. Web UI creation creates an initial record and then the running agent may perform self-registration again.

### Recommended Work

Add an idempotent registration handshake:

- Distinguish `ui-created-placeholder` from `agent-confirmed`.
- If Web UI already registered the session, send a prompt that says:
  - confirm your existing registration
  - refresh capability metadata if needed
  - do not create a duplicate id
- Store:
  - `registrationSource`
  - `registrationStatus`
  - `lastRegistrationAttemptAt`
  - `confirmedByAgentAt`
- Warn when the same session id appears under multiple agent ids.

### Priority

P1. This should be part of the bootstrap reliability wave.

## Recommended Next Wave

### Theme

Agent Bootstrap Reliability

### Goal

When a user starts an agent from CLI or Web UI, Mina should know whether that agent is actually ready to collaborate.

### Suggested Task Slices

1. Bootstrap state model
   - Add registration/bootstrap status fields.
   - Keep existing health state compatible.

2. Permission/trust prompt detection
   - Detect Codex/Claude permission or trust prompts from terminal capture.
   - Surface `permission-required` or `needs-attention` with actionable text.

3. MCP preflight for agent creation
   - Generate or run Codex/Claude MCP setup before self-registration.
   - Add Web UI create feedback.

4. Idempotent registration handshake
   - Avoid duplicate registration behavior after Web UI-created placeholder agents.

5. Caller identity and self-avoidance
   - Mark `isSelf` in `list_agents`.
   - Reject self calls unless explicitly allowed.

6. Capability profiler quality gate
   - Replace shallow capability summaries with structured capability profiles.
   - Add `thin`/`strong` quality classification.

7. Long transaction lease monitor
   - Track orphaned-running requests after timeout.
   - Add session recovery actions.

## Open Product Decisions

- Should Mina actually run MCP setup commands automatically, or only paste/show them for user approval?
- Should "grant broad read permission" be a default for local project roots, or a named bootstrap profile?
- Should `permission-required` be a new top-level health status, or a `needs-attention` detail?
- Should `call_agent` hard-block self-calls by default?
- How aggressive should terminal interrupt be when cancelling a long transaction?
