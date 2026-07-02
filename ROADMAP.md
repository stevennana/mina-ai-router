# Mina AI Router Roadmap

Mina AI Router is not trying to replace agent frameworks such as LangGraph, CrewAI, AutoGen, or the OpenAI Agents SDK.

Those tools are strongest when an application owns the agent workflow in code. Mina AI Router is focused on a different layer:

> A local-first operations console for visible Codex and Claude CLI agents that collaborate through MCP.

The roadmap below keeps that position clear. Each milestone should make local CLI agent collaboration more reliable, observable, and useful without hiding the terminal sessions from the user.

## Product Principles

- Local-first: agent sessions, state, request history, and terminal visibility stay on the user's machine by default.
- Visible by design: every agent should be inspectable through tmux, the browser UI, and CLI commands.
- MCP-native: inter-agent work should move through MCP tools instead of ad hoc copy-paste.
- Human-steerable: users should be able to intervene, approve, restart, attach, or inspect at any point.
- Framework-compatible: Mina should complement existing coding CLIs and agent frameworks rather than forcing a new runtime.
- Small reliable protocols over magic: structured request/response contracts should beat vague autonomous behavior.

## Current Baseline

Shipped in `0.1.x`:

- `mair` CLI for server and agent controls.
- Local HTTP server with UI at `http://127.0.0.1:3333/`.
- Streamable HTTP MCP endpoint at `/mcp`.
- MCP tools: `list_agents`, `register_agent`, `call_agent`, `get_request_status`.
- tmux-backed Codex and Claude agent startup.
- Agent self-registration skill.
- React browser console with live flow, floating inspector, terminal preview, activity panel, zoom, pan, and draggable agent nodes.
- GitHub Actions trusted publishing flow.

## Milestone 0.2: Collaboration Reliability

Goal: make agent-to-agent work dependable enough for daily local development.

Status: implementation wave completed through request diagnostics, capability refresh, health/readiness, self-call avoidance, structured capability profiles, request leases, and manual transaction recovery. The remaining work for this milestone is documentation, smoke hardening, release review, and any fixes found while using the feature branch.

### 0.2.1 Request Protocol Hardening

- Define a documented request envelope for `call_agent`.
- Add required response sections such as `summary`, `evidence`, `files_checked`, `open_questions`, and `next_action`.
- Make response marker parsing stricter and easier to debug.
- Add clear timeout, cancellation, retry, and failed-parse states.
- Store raw prompt, raw terminal excerpt, parsed answer, and parser diagnostics for each request.

Done when:

- A failed request explains whether it timed out, failed to parse, or was rejected.
- A user can retry a failed request from the CLI or UI.
- Smoke tests cover success, timeout, failure, and retry.

### 0.2.2 Agent Capability Refresh

- Add `mair agent refresh-capabilities <id>`.
- Add MCP-assisted capability refresh prompt for Codex and Claude.
- Track `capabilitySummary`, `capabilitySources`, `lastCapabilityRefreshAt`, and detected project metadata.
- Show capability freshness in the UI.
- Let users manually edit or accept agent-generated capability updates.

Done when:

- A user can refresh an agent's capability card without recreating the agent.
- The UI shows whether a capability summary is fresh, missing, or manually edited.

### 0.2.3 Request Activity Upgrade

- Add request detail view with source agent, target agent, lifecycle timestamps, raw answer, parsed answer, and errors.
- Filter activity by agent, status, source, target, and text.
- Add copy request id and copy answer actions.
- Add archive and unarchive controls.
- Keep the floating activity panel independent from the flow layout.

Done when:

- The activity panel is useful as a local work log, not just a table.
- Users can diagnose a bad route without opening the JSON state file.

### 0.2.4 Agent Health and Heartbeat

- Track last seen time and last terminal activity for tmux agents.
- Distinguish `available`, `busy`, `stale`, `missing`, and `needs_attention`.
- Surface trust prompts or blocked terminal states where possible.
- Add `mair health --watch`.

Done when:

- The UI and CLI agree on agent health.
- Stale or missing agents are visually obvious.

### 0.2.5 Agent Bootstrap Reliability

- Add bootstrap states for created, starting, permission-required, MCP configuring, registration pending, ready, and failed agents.
- Add permission/trust readiness handling for Web UI and CLI-created Codex/Claude sessions.
- Add MCP preflight before self-registration prompts.
- Make Web UI-created placeholders and agent self-registration idempotent.
- Add caller identity so agents can identify themselves and avoid self-calls.
- Replace shallow capability text with structured, evidence-backed capability profiles.
- Add request leases and session recovery controls for long transactions that outlive router timeouts.

Done when:

- A newly created agent cannot silently look ready while blocked on permission or MCP setup.
- Agents can identify their own entry in MCP `list_agents` results.
- Long-running timed-out requests can be cancelled, interrupted, or marked recovered from the UI or CLI.

## Milestone 0.3: Team Workspace

Goal: let users organize local agents as reusable working teams.

### 0.3.1 Workspace Profiles

- Add named workspaces with their own agent sets and state paths.
- Support `mair workspace create`, `mair workspace use`, `mair workspace list`.
- Persist default port, state path, and preferred agents per workspace.
- Show current workspace in the UI.

Done when:

- A user can switch between unrelated local projects without mixing agent registrations.

### 0.3.2 Team Presets

- Add team templates such as `frontend-api-docs`, `reviewer-builder`, and `planner-executor`.
- Let users define agent roles, startup commands, project roots, and capability hints.
- Add `mair team start <template>`.
- Add UI support for starting a team from a preset.

Done when:

- A user can start a multi-agent local team with one command or one UI action.

### 0.3.3 Ask Team

- Add a higher-level `ask_team` workflow.
- Fan out a question to selected agents.
- Collect responses into a comparison view.
- Optionally ask a coordinator agent to synthesize the answers.
- Keep every sub-request visible in activity.

Done when:

- A user can ask multiple agents the same question and compare or synthesize the answers.

### 0.3.4 Transcript and Evidence Store

- Persist structured transcripts per routed task.
- Link answers to request ids, agent ids, source files mentioned, and timestamps.
- Add export to markdown.
- Add search over recent requests and answers.

Done when:

- A completed collaboration can be exported as a readable work report.

## Milestone 0.4: Automation Layer

Goal: let Mina run repeatable local collaboration workflows while keeping the user in control.

### 0.4.1 Workflow Templates

- Define simple workflow templates in YAML or JSON.
- Support steps such as `ask_agent`, `ask_team`, `wait_for_status`, `manual_approval`, and `archive`.
- Add CLI runner: `mair workflow run <file>`.
- Show workflow execution in the UI.

Done when:

- A user can encode a repeatable local multi-agent task without writing TypeScript.

### 0.4.2 Watchers

- Add file, directory, or git branch watchers.
- Trigger workflows when selected files change.
- Add rate limits and explicit enable/disable controls.
- Store watcher audit history.

Done when:

- A user can run a local review or docs-refresh workflow when files change.

### 0.4.3 Human Approval Gates

- Add approval checkpoints before destructive actions, long-running fanout, or external commands.
- Support approval from UI and CLI.
- Add audit entries for who approved what and when.

Done when:

- Automations can run without becoming opaque or surprising.

### 0.4.4 GitHub Integration

- Read issue or PR context through configured tools.
- Route review tasks to local agents.
- Export collaboration summaries back to markdown for PR comments.
- Keep GitHub integration optional.

Done when:

- Mina can help review a PR using local visible agents without becoming GitHub-dependent.

## Milestone 0.5: Security, Packaging, and Ecosystem

Goal: make Mina safer and easier to adopt across machines and teams.

### 0.5.1 Local Security Model

- Add allowed project roots.
- Add command permission levels for terminal input and workflow actions.
- Add audit log for agent creation, deletion, terminal input, and routed requests.
- Add redaction rules for secrets in logs and exported transcripts.

Done when:

- Users can explain what Mina is allowed to touch on their machine.

### 0.5.2 Import and Export

- Export router state, workspace profiles, team presets, and selected transcripts.
- Import profiles safely without importing stale tmux sessions.
- Add backup and restore docs.

Done when:

- A user can move Mina configuration between machines intentionally.

### 0.5.3 Extension Points

- Document integration contracts for custom transports and agent types.
- Support non-tmux transports where visibility can still be preserved.
- Add hooks for request lifecycle events.

Done when:

- Developers can extend Mina without editing core router code.

### 0.5.4 Documentation and Examples

- Add a complete example: frontend agent asks API agent, docs agent summarizes result.
- Add screenshots for the new React UI.
- Add troubleshooting recipes for common multi-agent failures.
- Add a decision guide: Mina vs agent frameworks vs single CLI session.

Done when:

- A first-time user can understand, install, run, and test a two-agent collaboration in under 15 minutes.

## Backlog

- Browser UI command palette.
- Keyboard navigation for flow and inspector.
- Request graph visualization.
- Agent pinning and manual layout profiles.
- Local embeddings for request search.
- Terminal prompt detection.
- Optional SQLite state backend.
- Optional web socket updates instead of polling.
- MCP resource endpoints for docs, transcripts, and agent cards.
- Package size review and asset optimization.

## Near-Term Execution Plan

Start with `0.2` and keep each feature shippable:

1. Request detail view and parser diagnostics.
2. Retry, cancel, and archive controls for requests.
3. Capability refresh command and UI state.
4. Agent heartbeat and stale/missing states.
5. Documentation update with a two-agent collaboration walkthrough.

The first implementation target should be request detail and diagnostics because it improves every later collaboration feature.
