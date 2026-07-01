# Release Readiness Review Fixes

Date: 2026-06-29

## Purpose

The collaboration reliability branch passed the main 0.2 implementation wave, but review passes found release-blocking and release-confusing gaps. This spec defines the follow-up waves required before merge or release.

## Source Reviews

- The resolved 2026-06-29 branch and fresh-operator review findings are summarized in this product spec and the completed exec plans for tasks 019-031.
- Resolved first-time user documentation review findings are summarized in completed exec plans 032-033 so ephemeral review files can be removed after cleanup.
- Fresh real-user Web UI review findings are summarized in completed exec plan 034.
- Full user functional review findings are summarized in completed exec plan 035.
- First-user accessibility and create-refresh review findings are summarized in completed exec plan 036.
- First-user Codex prompt detection findings are summarized in completed exec plan 037.
- First-user revalidation readiness findings are summarized in completed exec plan 038.
- First-user route readiness findings are summarized in completed exec plan 039.
- First-user health documentation findings are summarized in completed exec plan 040.
- First-user out-of-box setup automation findings are summarized in completed exec plans 041-044.
- First-user OOB revalidation findings are summarized in completed exec plans 045-047.

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
| CLI health and agents misreport busy agents while server is routing | CLI read commands use the matching running server's live status so busy/available state matches the UI and API during active routes |
| `server start` reports success when port bind fails | Server startup reports success only after Mina readiness is confirmed, and bind failures are surfaced as actionable errors |
| Live CLI proxy gives raw JSON parse error for non-Mina pid target | Stale or non-Mina pid-file targets produce actionable diagnostics instead of raw parser output |
| Docs verification still requires a deleted review file | Release docs and `smoke:docs` validate durable summaries and existing Markdown links so review file cleanup does not break docs verification |
| UI shows `Port 3333` on a non-default server port | Command bar connection metadata is derived from the authoritative MCP URL or omitted when unavailable |
| Non-tmux `Open Terminal` affordance is misleading | Inspector and menu terminal actions are transport-aware and do not imply direct terminal control for headless agents |
| CLI visible-agent MCP preflight ignores the running server port | `mair codex` and `mair claude` build MCP setup guidance from the matching live server's MCP URL before falling back to defaults |
| Unarchived answered requests show archive reason as Error | Archive-only reasons are cleared when non-error requests are unarchived while true request errors are preserved |
| Ask dialog `Task` label is not accessible | Form controls use explicit `id` / `htmlFor` associations for reliable accessibility and label-based tests |
| UI-created tmux agent may not appear until manual refresh | The Web UI applies the create-agent API's returned state immediately and keeps the new agent selected |
| Codex update prompt is misclassified as directory trust | Codex trust detection requires trust-specific evidence and does not treat generic enter-to-continue prompts as directory approval |
| MCP-blocked tmux agents are counted as available | Health classification separates transport reachability from route readiness, so MCP-blocked or registration-pending agents need attention instead of inflating the available count |
| Non-ready agents still accept routed work | Core routing, MCP `call_agent`, HTTP `/api/ask`, and Web UI Ask controls honor shared route readiness before creating requests |
| User guide defines `needs-attention` too narrowly | Health docs explain that `needs-attention` covers both failed routed requests and first-run readiness blockers such as permission, MCP setup, and pending self-registration |
| First-run MCP and skill setup is still manual | `mair setup codex`, `mair setup claude`, and `mair doctor` automate and verify client MCP plus registration-skill setup |
| Demo `setup-codex-pair` looks like the general setup path | General docs and help prefer `mair setup`; the pair helper is labeled developer/demo and requires explicit roots |
| `mair doctor` can report success while agents are not route-ready | Blocked agents make doctor fail by default and include repair guidance |
| First-user docs imply both Codex and Claude setup are required | Docs and UI use a choose-one setup flow; `--client all` is only for users who run both clients |
| Getting Started still frames manual setup guides as required | Getting Started points to automated setup first and treats manual MCP/skill docs as repair references |

## Functional Requirements

1. Request recovery actions must go through a domain boundary that can clear request state, agent lease fields, and `AgentRouter` live locks together.
2. Archiving an orphaned request must either release the orphaned lease or be unavailable until recovery. For this wave, use release-on-archive because the current UI already offers Archive for orphaned requests.
3. CLI-created visible agents must be persisted immediately as pending or blocked records before permission/MCP checks can stop the self-registration prompt.
4. Runtime version reporting must be single-source or checked against `package.json`.
5. Release verification must include docs smoke and branch whitespace checks.
6. While the HTTP server is running for the same state file, the server owns live router state and compatible CLI mutations must route through it.
7. CLI register, ask, agent-start placeholder, and capability-refresh flows must be visible through `/api/state` without restarting the server.
8. `mair health` must prefer a running server status MCP URL when the pid file points at the same resolved state path.
9. While a matching HTTP server is running, CLI read commands that expose live status must read from the server instead of reconstructing health from a one-shot local router.
10. `mair health`, `mair agents`, and `mair agent <id>` must agree with `/api/health` and `/api/state` for active busy agents during a server-routed request.
11. `mair server start` must wait for a Mina readiness response before reporting a healthy running server.
12. Startup bind failures must not leave pid files that look like healthy Mina servers.
13. CLI live read/write helpers must diagnose stale or non-Mina pid-file targets without leaking raw JSON parser errors.
14. Docs smoke may validate current review files when they exist, but must also pass when resolved review files have been deleted.
15. Product specs and active task queue docs must not point operators at deleted review files.
16. The Web UI must not show a hard-coded default port when the server is running on another port.
17. Non-tmux agents must not expose enabled terminal controls that suggest tmux-style direct control is available.
18. CLI visible-agent startup must use the matching running server's MCP URL for preflight setup guidance when that server owns the same state file.
19. Unarchiving non-error requests must not leave archive-only reasons in `error`; unarchiving failed/timeout requests must preserve true failure errors.
20. Primary Web UI forms must expose explicit accessible label associations.
21. UI-created agent flows must update the visible React state from the mutation response without requiring a manual refresh.
22. Codex directory-trust detection must not classify generic startup/update prompts as approval prompts based only on `Press enter to continue`.
23. Known bootstrap blockers must prevent `available` readiness even when the underlying tmux transport is reachable: `mcp-configuring`, `permission-required`, `registration-pending`, `registrationStatus: pending`, and `mcpPreflightStatus: missing|stale` report as non-available attention states until resolved.
24. Normal routed work must be rejected before request creation when a target is not route-ready. `list_agents` and UI state must expose `routeReady` and a blocker reason so callers and users can choose a ready target or resolve setup first.
25. First-user docs must define `needs-attention` broadly enough to cover failed routed requests and first-run readiness blockers.
26. First-run setup must configure and verify Codex and Claude MCP profiles against the matching running router URL, then install the registration skill in the expected client/project location.
27. A doctor command must report server, client binary, MCP config, skill install, and blocked-agent readiness as a clear pass/fail matrix.
28. Specialized demo helpers must not use maintainer-local defaults or appear as the primary onboarding path.
29. Doctor must fail by default when any known agent is not route-ready, while offering an explicit environment-only override.
30. First-user setup docs and UI must make Codex and Claude setup a choose-one flow unless the user runs both clients.
31. Getting Started must not call manual MCP or skill installation required for the normal path.

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
- During an active server-routed request, `mair health`, `mair agents`, and `mair agent <id>` report the target agent as busy when `/api/health` and `/api/state` do.
- Starting the server on an occupied port fails clearly and does not report `running: true`.
- A pid file pointing at a live non-Mina HTTP server produces an actionable stale/non-Mina diagnostic for reads and mutations.
- `npm run smoke:docs` validates current review docs when present, allows `docs/reviews/` to be empty, and fails on broken local Markdown links in required release docs.
- The Web UI command bar and Connect Agent guide agree on non-default MCP URLs.
- Headless/non-tmux agents show clear terminal-unavailable UI while tmux agents keep terminal preview and attach-copy actions.
- With a matching non-default server running, `mair codex --no-attach --no-register` reports MCP setup commands for the running server URL.
- Archive/unarchive/retry flows do not make answered requests look errored because of prior archive reasons.
- Ask and capability-edit fields are label-addressable.
- After creating a tmux agent in the Web UI, the new agent appears from the returned state without pressing Refresh.
- Codex update prompts that contain `Press enter to continue` do not surface directory-trust approval guidance or `trustPrompt: true`.
- MCP-blocked Web UI and CLI-created tmux agents remain visible with setup guidance, but `/api/health`, `mair health`, `mair agents`, and `mair agent <id>` do not count or display them as route-ready `available` agents.
- MCP-blocked targets cannot receive normal routed work through core `callAgent`, HTTP `/api/ask`, MCP `call_agent`, or enabled Web UI Ask controls; failed readiness checks return actionable guidance and do not create requests.
- The User Start Guide explains that newly created blocked agents may show `needs-attention` until permission, MCP setup, or self-registration is resolved.
- `mair setup codex`, `mair setup claude`, and `mair doctor` exist, prefer the matching running server MCP URL, and are covered by CLI smoke with fake client binaries.
- The Web UI Connect Agent guide exposes setup and doctor commands for Codex and Claude, and the inspector shows verify/reset guidance for MCP-blocked agents.
- `setup-codex-pair` fails without explicit roots and is labeled as a developer/demo helper instead of a first-user setup path.
- `mair doctor --json` returns `ok: false` and exits non-zero when a known agent has `routeReady: false`, unless `--ignore-blocked-agents` is explicitly provided.
- README, Getting Started, User Start Guide, MCP Client Setup, Skill Install Guide, HTTP UI docs, and Connect Guide default to `mair setup <chosen-client>` plus `mair doctor --client <chosen-client>`.
