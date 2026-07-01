# First-User OOB Review - 2026-07-01

## Summary

Reviewer perspective: a new user installing Mina AI Router from the README, running first-run setup, checking readiness, then trying to create and route work through agents.

Result: the OOB path is significantly better than before because `mair setup codex`, `mair setup claude`, and `mair doctor` now exist and are covered by smoke tests. However, I still found first-user friction that can make the product report success while the user is not actually ready to route work.

Recommendation: request changes.

## Finding 1 - `mair doctor` returns success even when agents are blocked and not route-ready

Severity: P1

Evidence:

- `apps/cli/src/index.ts` collects `blockedAgents`, including agents with `routeReady === false`, `mcp-configuring`, `permission-required`, or `registration-pending`.
- The reviewed implementation computed `ok` only from environment checks and client checks.
- Because `blockedAgents` was not included in `ok`, doctor could return `ok: true` and exit 0 while it also reported a blocked, non-route-ready agent.

Why this matters for a first user:

The README and user guide position `mair doctor` as the readiness check after setup. If doctor says `ok: true`, a first user will reasonably assume they are ready to route work. But the reported blocked agent cannot receive routed work, so the next collaboration step can still fail or appear confusing.

Suggested fix:

- Include blocked readiness in the doctor result.
- `ok` should be false when `blockedAgents.length > 0`, unless the user passes an explicit option such as `--ignore-blocked-agents`.
- Exit non-zero when blocked agents exist.
- Add a top-level check such as `{ name: "route-ready agents", ok: blockedAgents.length === 0, detail: ... }`.
- Keep the detailed `blockedAgents` array, but also summarize the next action for each blocker.
- Add smoke coverage for the exact case above: matching server plus healthy client setup plus one blocked agent must make doctor fail.

Acceptance checks:

- `mair doctor --json` returns `ok: false` and exits non-zero when any known agent has `routeReady: false`.
- The output makes the blocked agent's repair action visible without requiring users to inspect nested fields.
- After the blocked agent is repaired or removed, `mair doctor --json` returns `ok: true`.

## Finding 2 - First-user docs still encourage running setup for both clients, even when the user only has one

Severity: P2

Evidence:

- README, User Start Guide, MCP Client Setup, HTTP UI guide, and Web UI Connect guide say "Codex or Claude" but showed both setup commands and `mair doctor --client all` in one copyable sequence.

Why this matters for a first user:

Many users will have only Codex or only Claude installed. A user who copies a both-client block can hit an avoidable failure on the missing client, and `mair doctor --client all` can also fail because the unused client is absent or not configured.

Suggested fix:

Change first-run docs to a choose-one pattern:

```sh
# Codex users
mair setup codex --project /path/to/project
mair doctor --client codex --project /path/to/project

# Claude users
mair setup claude --project /path/to/project
mair doctor --client claude --project /path/to/project
```

Keep `--client all` only in an "if you use both clients" note. In the Web UI Connect guide, visually separate Codex and Claude setup instead of showing them as a single checklist.

Acceptance checks:

- README, User Start Guide, MCP Client Setup, HTTP UI guide, and Connect modal all make it clear that users should run the setup for the client they actually use.
- `mair doctor --client all` is documented as a both-client check, not the default first-user readiness check.

## Finding 3 - Getting Started still points users toward manual setup guides instead of the automated OOB path

Severity: P2

Evidence:

- `docs/GETTING-STARTED.md` labels MCP Client Setup and Skill Install Guide as "Required Setup Guides".
- The recommended path says to connect the AI CLI and install the registration skill as separate steps.

Why this matters for a first user:

This page is linked from README as a guide entry. It sends users back toward the older manual mental model, while the rest of the product is trying to make `mair setup` the OOB path.

Suggested fix:

- Update Getting Started so the recommended path uses `mair setup <client>` and `mair doctor --client <client>`.
- Reframe MCP Client Setup and Skill Install Guide as manual repair/reference docs.

Acceptance checks:

- No first-user guide calls manual skill installation "required" for the normal path.
- The automated setup path is consistently the first recommendation across README, Getting Started, User Start Guide, MCP Client Setup, Skill Install Guide, and the Web UI.
