# Release Readiness Review Fixes

Date: 2026-06-29

## Purpose

The collaboration reliability branch passed the main 0.2 implementation wave, but review passes found release-blocking and release-confusing gaps. This spec defines the follow-up waves required before merge or release.

## Source Review

- [Fresh operator review: Mina AI Router](../reviews/2026-06-29-fresh-operator-review.md)

## User Story

As a local operator, I want recovery, agent creation, and version diagnostics to match what the UI and CLI claim, so I can trust the branch without restarting the server or reading implementation details.

## Findings To Address

| Review finding | Desired outcome |
| --- | --- |
| Recovered timeout requests leave `AgentRouter` busy lock stuck | Recovering an orphaned request clears persisted lease state and the live in-memory lock in the same server process |
| Archiving orphaned requests can preserve orphaned lease state | Archive behavior for orphaned requests is explicit, UI/API/CLI aligned, and does not leave a hidden stuck agent |
| CLI-created visible agents are not persisted when registration is blocked | CLI-started Codex/Claude agents appear in registry, UI, health, and CLI lists even when permission or MCP setup blocks registration |
| Version values are inconsistent | CLI and MCP runtime version surfaces match `package.json.version` |
| Diff whitespace and docs smoke verification drift | Release verification catches docs smoke and branch diff whitespace before merge |
| CLI and HTTP server can diverge and overwrite router state | While a matching HTTP server is running, normal mutating CLI commands proxy to the server-owned live state instead of writing stale file snapshots |
| `mair health` reports the wrong MCP URL after `server start --port` | Health reports the running matching server's MCP URL before falling back to default/env URL construction |

## Functional Requirements

1. Request recovery actions must go through a domain boundary that can clear request state, agent lease fields, and `AgentRouter` live locks together.
2. Archiving an orphaned request must either release the orphaned lease or be unavailable until recovery. For this wave, use release-on-archive because the current UI already offers Archive for orphaned requests.
3. CLI-created visible agents must be persisted immediately as pending or blocked records before permission/MCP checks can stop the self-registration prompt.
4. Runtime version reporting must be single-source or checked against `package.json`.
5. Release verification must include docs smoke and branch whitespace checks.
6. While the HTTP server is running for the same state file, the server owns live router state and compatible CLI mutations must route through it.
7. CLI register, ask, agent-start placeholder, and capability-refresh flows must be visible through `/api/state` without restarting the server.
8. `mair health` must prefer a running server status MCP URL when the pid file points at the same resolved state path.

## Non-goals

- Redesigning the request lease model beyond the reviewed defects.
- Adding autonomous terminal interruption.
- Building a full package release workflow.
- Changing npm/GitHub publishing policy.

## Acceptance Criteria

- Recovering an orphaned timeout request allows a new request to the same agent in the same process.
- Archiving an orphaned request does not leave `activeRequestId`, `leaseStatus: "orphaned"`, or a live busy lock behind.
- `mair codex` / `mair claude` blocked by permission or MCP preflight leave visible registry records with blocker fields.
- `mair version` and MCP `serverInfo.version` match `package.json.version`.
- `npm run verify`, `npm run smoke:docs`, `git diff --check main...HEAD`, runtime version checks, and `npm pack --dry-run` are documented and runnable for release readiness.
- With a running matching HTTP server, CLI `register`, `ask`, visible agent bootstrap, and capability refresh update the server-owned state and cannot be overwritten by a later HTTP mutation.
- With a non-default running server port, `mair health` reports the same MCP URL as `mair server status`.
