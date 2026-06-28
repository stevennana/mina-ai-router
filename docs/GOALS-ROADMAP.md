# Development Goals Roadmap

## Purpose

This roadmap turns `POC-PRD.md` into an implementation sequence with explicit pass criteria.

The project should move in small slices. Each phase must produce a runnable system, not only internal code.

## Phase Overview

| Phase | Document | Outcome |
| --- | --- | --- |
| 0 | [GOALS-PHASE-0-FOUNDATION.md](./GOALS-PHASE-0-FOUNDATION.md) | TypeScript skeleton, core abstractions, headless smoke flow |
| 1 | [PHASE-1-GOALS.md](./PHASE-1-GOALS.md) | Real tmux transport end-to-end from CLI and MCP |
| 2 | [GOALS-PHASE-2-MCP-INTEGRATION.md](./GOALS-PHASE-2-MCP-INTEGRATION.md) | Codex-facing MCP server compatibility and installable runtime |
| 3 | [GOALS-PHASE-3-PERSISTENCE-CLI-TESTS.md](./GOALS-PHASE-3-PERSISTENCE-CLI-TESTS.md) | durable request state, safer CLI, repeatable tests |
| 4 | [GOALS-PHASE-4-MULTI-AGENT-OPERATIONS.md](./GOALS-PHASE-4-MULTI-AGENT-OPERATIONS.md) | multiple project-scoped helper agents with usable operator workflows |
| 5 | [GOALS-PHASE-5-POC-COMPLETION.md](./GOALS-PHASE-5-POC-COMPLETION.md) | PRD success scenario demonstrated and POC closed |
| 6 | [GOALS-PHASE-6-TMUX-WEB-CONSOLE.md](./GOALS-PHASE-6-TMUX-WEB-CONSOLE.md) | inspect and lightly interact with tmux-backed agents from the web UI |

## Sequencing Rule

Do not start a later phase by expanding architecture until the current phase has passed its acceptance criteria.

The important trap is building a terminal product. Mina Agent Router should stay a request router that uses external session backends.

## Global Acceptance Criteria

The whole POC is complete when all of these are true:

- a main agent can call `call_agent(target = "payment", task = "...")` through MCP
- Mina sends the prompt to a live payment helper agent session
- the helper agent receives and answers the prompt
- the helper agent wraps the answer in Mina response markers
- Mina captures and parses only the answer body
- the main agent receives the helper answer as a tool result
- the developer can attach to and interrupt the helper session outside Mina
- the router core remains transport-agnostic
- tmux-specific logic remains isolated in the transport package
- docs explain setup, usage, troubleshooting, and known limits

## Global Non-Goals

Do not add these during the POC unless the PRD changes:

- autonomous planning across agents
- hosted or cloud web UI
- terminal emulator
- permission policy engine
- cloud service
- team workspace features
- automatic project indexing
- Mina Wiki integration

## Required Final Demo

The final POC must include a demo sequence equivalent to:

```sh
npm run build
mar register payment --agent gemini --transport tmux --session payment --root ~/work/payment
mar agents
mar ask payment "현재 payment 개발사항을 보고 shopping-service payment UI에 반영할 점을 제안해줘."
```

Then the same request must work through MCP `call_agent` from Codex CLI.

## Documentation Pass Criteria

Each phase document must include:

- goal
- scope
- non-goals
- implementation tasks
- acceptance criteria
- verification commands or manual test steps
- known risks

If a phase changes direction, update its document before implementing the changed direction.
