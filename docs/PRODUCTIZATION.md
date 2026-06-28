# Mina Agent Router Productization Plan

## Purpose

Mina Agent Router has passed the POC stage. The validated core idea is:

> A primary CLI agent can ask another live, project-scoped CLI agent for context through a local MCP router, while the human operator can observe the real agent consoles and the router state.

Productization should preserve that core value. Mina should not become a hidden autonomous swarm or a full terminal emulator. The product should become a reliable local control center for visible, inspectable, interruptible agent collaboration.

## Product Positioning

Mina Agent Router is a local agent coordination layer for developers working across multiple repositories.

It provides:

- a local HTTP MCP server
- a router-centered control UI
- live tmux-backed agent sessions
- visible cross-agent request flow
- project-scoped helper agent calls
- request history and operational recovery tools
- optional web console inspection for tmux-backed visible sessions

It does not aim to replace Codex CLI, Claude Code, Gemini CLI, tmux, or a developer's IDE.

## Primary User

The primary user is a developer working across related projects, for example:

- a main application repository
- a helper library repository
- an API service repository
- a frontend repository
- an infrastructure repository

The user wants the main agent to ask helper agents for project-specific context without manually copying prompts and answers between terminals.

## Product Principles

1. **Visible by default**
   Agent activity should be shown in real terminals and in the UI diagram. Hidden execution can exist later, but it must not replace visible mode.

2. **Local first**
   The first product version should run locally with local state and local MCP configuration.

3. **Operator controlled**
   The user should be able to inspect, interrupt, restart, delete, or re-register agents.

4. **Small protocol surface**
   Mina should keep a narrow contract: register agents, route requests, capture answers, expose state.

5. **Reliable before clever**
   The next product steps should improve state clarity, recovery, and predictable behavior before adding complex planning or autonomous scheduling.

## Current Product Baseline

Already implemented:

- TypeScript monorepo structure
- core router, registry, request store, prompt envelope, response parser
- tmux transport
- Codex-specific tmux input mode
- shell/headless smoke paths
- HTTP MCP endpoint at `/mcp`
- UI at `/`
- router-centered diagram
- agent registration and deletion through UI/API
- request list and request detail view
- request-flow visual state on diagram lines
- setup support for the two-Codex demo
- request retry, cancel, archive, and stale cleanup controls
- per-agent busy guard
- agent attach command copy and tmux restart controls
- HTTP health endpoint
- CLI `health`, `version`, and `verify` commands
- atomic JSON state writes
- verification command: `npm run verify`

Current verification:

```sh
npm run verify
```

Required passing checks:

- core tests
- HTTP smoke
- tmux smoke
- MCP smoke
- multi-agent smoke

## MVP Product Scope

The MVP should make Mina useful as a daily local developer tool for a small set of trusted projects.

### MVP In Scope

- local HTTP MCP server
- router-centered web UI
- tmux-backed visible agent sessions
- Codex helper agents as the first polished path
- manual and UI-based agent registration
- request detail, retry, cancel, archive, and cleanup controls
- robust status display for agent health and request lifecycle
- reliable setup flow for two or more Codex projects
- persistent local state
- troubleshooting and recovery documentation

### MVP Out of Scope

- hosted SaaS
- remote multi-user collaboration
- cloud agent execution
- full terminal emulator
- replacing tmux
- autonomous task planning across many agents
- arbitrary untrusted agent execution
- enterprise auth
- cross-machine routing

## Productization Phases

### Phase P1: Operator Control Center

Goal:

Make the current UI usable as the main operating surface.

Deliverables:

- agent detail panel with clearer health explanations
- request detail panel with answer/error display
- request retry action
- request cancel/archive action for stale `waiting` items
- attach command copy button
- restart tmux session button
- open project root command display
- clearer empty states and error states

Acceptance Criteria:

- A user can understand which agents are available, missing, or stale from the diagram.
- A user can click a request and understand source, router, target, status, task, answer, and error.
- A stale request can be cleaned up from the UI without editing JSON state manually.
- A missing tmux session gives a concrete recovery action.
- `npm run verify` passes.

### Phase P2: Setup and Registration Flow

Goal:

Make first-time setup possible without memorizing CLI commands.

Deliverables:

- setup wizard for local MCP server, Codex MCP registration, and first agent pair
- guided "Register Codex Project" flow
- project root validation
- tmux session name validation
- startup command preview
- success state with attach/test instructions

Acceptance Criteria:

- A new user can register two Codex projects from the UI.
- The UI can create or reuse the helper tmux session.
- The UI shows the exact Codex MCP URL and connection state.
- A built-in test request can prove the route works.
- Failure messages include the next concrete action.

### Phase P3: Request Reliability

Goal:

Reduce failure modes in the tmux/Codex request path.

Deliverables:

- request lifecycle timestamps
- explicit stale timeout policy
- retry with same task
- retry with edited task
- better parser diagnostics
- detection for placeholder-only responses
- detection for helper not ready, login prompt, approval prompt, or interrupted session
- per-agent queue or lock to prevent overlapping prompts into the same TUI

Acceptance Criteria:

- Mina does not send a second request into a busy Codex agent unless explicitly allowed.
- Timeout errors identify the last observed state.
- Retry works from the UI.
- Parser tests cover placeholder, wrapped output, repeated markers, and stale scrollback.
- `npm run verify` passes.

### Phase P4: Persistent State Upgrade

Goal:

Move from simple JSON state toward a more product-safe local store.

Recommended direction:

- SQLite for requests, agents, events, and settings
- JSON export/import for debugging
- migration from existing `data/router-state.json`

Deliverables:

- SQLite schema
- migration command
- repository-local or user-level state mode decision
- event log for request transitions
- state backup and reset command

Acceptance Criteria:

- Existing JSON state can migrate without losing registered agents or request history.
- Request lifecycle transitions are queryable as events.
- The UI can load state quickly with growing request history.
- Reset operations are explicit and non-destructive by default.

### Phase P5: Packaging and Local Distribution

Goal:

Make Mina installable and repeatable on the developer's machine.

Deliverables:

- documented install command
- stable `mar serve`
- stable `mar verify`
- health check command
- version command
- default config path decision
- launch instructions for macOS

Acceptance Criteria:

- A clean local checkout can run the server with documented commands.
- Codex MCP registration can be copied from the UI.
- The server reports version, state path, MCP URL, and health status.
- Smoke tests work after install.

### Phase P6: Multi-Agent Daily Use

Goal:

Support multiple helper agents without the UI becoming noisy.

Deliverables:

- agent grouping by workspace/project
- request filtering by target/status
- request search
- active request highlighting
- agent tags
- collapsible request history
- project presets

Acceptance Criteria:

- The diagram remains readable with 6-8 agents.
- A user can find recent failed/waiting requests quickly.
- Agent registration presets reduce repeated form entry.
- Multiple helpers can be used in one session without state confusion.

## Architecture Decisions to Stabilize

### MCP Transport

Decision:

Use HTTP Streamable MCP as the primary product path.

Rationale:

- avoids Codex stdio startup timeout problems
- allows the UI and MCP endpoint to share one server process
- makes local health checking easier

Stdio MCP can remain as a compatibility path only if it does not slow product work.

### Visible Agent Backend

Decision:

Keep tmux as the first visible-session backend.

Rationale:

- already validates the product goal
- preserves user-observable terminals
- avoids building a terminal multiplexer

Future alternatives can be evaluated only after tmux mode is reliable enough for daily use.

### Codex TUI Input

Decision:

Codex agents need a Codex-specific input strategy.

Rationale:

- paste-buffer works for shell responders
- Codex TUI needs typed input with submit timing
- one transport must support both without breaking smoke tests

### Response Protocol

Decision:

Keep marker-wrapped responses for MVP, but treat them as a protocol with stronger diagnostics.

Rationale:

- simple and already working
- visible in terminal
- easy to debug

Future work may replace marker parsing with a more structured agent protocol only when supported by the target agent surfaces.

## Quality Gates

Every productization phase must pass:

```sh
npm run verify
```

Additional manual gates:

1. Start server with `mar serve --port 3333`.
2. Open `http://127.0.0.1:3333/`.
3. Confirm router diagram renders.
4. Confirm `minasoftai` and `ralph` can be registered as Codex/tmux agents.
5. Send a request to `ralph`.
6. Confirm the request appears in the helper Codex console without manual Enter.
7. Confirm the UI shows request status and final answer.
8. Confirm main Codex can call MCP `list_agents`.
9. Confirm main Codex can call MCP `call_agent`.

## Product Risks

### Codex CLI UI Changes

Risk:

Codex TUI input behavior may change and break tmux input injection.

Mitigation:

- keep Codex-specific transport tests
- isolate Codex input behavior
- make submit delay/key configurable
- show clear recovery actions in UI

### Stale Scrollback

Risk:

Old marker output can be misread as a new answer.

Mitigation:

- parser rejects placeholder answers
- request IDs must be unique
- tests must cover repeated markers and stale examples
- future event offsets should track capture position

### Busy Agent Overlap

Risk:

Two requests sent to the same visible TUI can interleave.

Mitigation:

- per-agent lock
- queue display
- UI warning before concurrent sends
- request cancel/retry controls

### State Corruption

Risk:

Manual JSON edits or interrupted writes can corrupt local state.

Mitigation:

- SQLite migration
- atomic writes until migration
- backup before destructive operations
- explicit reset command

## MVP Release Definition

Mina Agent Router can be called MVP-ready when:

- the HTTP MCP server is the default documented path
- the router UI is the primary control surface
- two Codex projects can be registered, observed, and tested from the UI
- request retry/cancel/archive exists
- stale request cleanup exists
- per-agent busy protection exists
- local state is robust enough for repeated daily sessions
- `npm run verify` passes consistently
- setup and troubleshooting docs are accurate

## Next Recommended Work

Phase P1 is now partially implemented.

The next productization milestone should be:

> Setup and Registration Flow: turn the current controls into a guided wizard with validation, connection checks, and a built-in route test.

This builds directly on the current UI without changing the core architecture.

## Implemented Productization Slice

The first productization implementation after the POC added:

- request retry from the UI
- request cancel from the UI
- request archive from the UI
- stale request archive cleanup
- request status filtering and search
- agent attach command copy
- tmux session restart from the UI
- clearer agent health explanations
- HTTP `/api/health`
- CLI `mar health`
- CLI `mar version`
- CLI `mar verify`
- in-process per-agent busy protection
- atomic JSON state writes
- isolated HTTP smoke state to avoid mutating real local state

Verification:

```sh
npm run verify
```
