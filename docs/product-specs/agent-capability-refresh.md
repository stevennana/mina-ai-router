# Agent Capability Refresh

## User Story

As a developer selecting a target agent, I want capability metadata to stay fresh so I can route work to the right session.

## Scope

- CLI command to refresh capability metadata for one agent.
- UI affordance for freshness and manual refresh.
- Fields for freshness timestamp and manual/generated source.
- Prompt flow that asks the target agent to inspect project docs and update its own metadata.

## Out of Scope

- Automatic scheduled refresh.
- Cross-machine profile sync.
- Hosted capability catalog.

## Acceptance

- A user can refresh one agent without recreating it.
- The UI distinguishes missing, stale, generated, and manually edited capability summaries.
