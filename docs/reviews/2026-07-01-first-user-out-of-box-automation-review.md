# First-User Out-of-Box Automation Review - 2026-07-01

## Summary

Reviewer perspective: a first-time user trying to install Mina AI Router, connect Codex or Claude, create an agent, and route real work without already knowing this project.

Result: the current project is much better at surfacing blockers than hiding them, but the out-of-box path still depends on several manual setup commands. The remaining first-user friction is concentrated around MCP client registration, skill installation, and confirming that the local environment is ready.

Recommendation: request changes before calling the first-user onboarding path "automatic".

## Finding 1 - First-run MCP and skill setup is still manual instead of automated

Severity: P1

Evidence:

- `README.md:49` to `README.md:65` asks users to manually run separate Codex or Claude MCP remove/add/get commands after starting the server.
- `docs/USER-START-GUIDE.md:66` to `docs/USER-START-GUIDE.md:87` sends users to two separate setup guides: one for MCP, one for the registration skill.
- `docs/MCP-CLIENT-SETUP.md:15` to `docs/MCP-CLIENT-SETUP.md:58` documents manual Codex/Claude MCP setup and says blocked agents remain in `mcp-configuring` until the user runs the setup command.
- `docs/SKILL-INSTALL-GUIDE.md:11` to `docs/SKILL-INSTALL-GUIDE.md:79` requires users to manually create/link skill directories and restart Codex or Claude.
- `apps/cli/src/index.ts:40` to `apps/cli/src/index.ts:84` has no general `mair setup`, `mair setup codex`, `mair setup claude`, or `mair doctor` command. The only setup command is `setup-codex-pair`, which is a specialized helper flow.
- `apps/cli/src/index.ts:300` to `apps/cli/src/index.ts:405` creates a visible agent and records MCP preflight state, but if MCP is missing it stops at `registration = "waiting for MCP setup"` and returns `nextAction`.
- `packages/core/src/mcp-preflight.ts:19` to `packages/core/src/mcp-preflight.ts:58` builds command text from supplied inputs; it does not run `codex mcp get`, `claude mcp get`, repair stale config, or verify the result.
- `apps/http-server/ui/src/features/Inspector.tsx:73` to `apps/http-server/ui/src/features/Inspector.tsx:76` displays MCP detail and setup command, but provides no project-owned run/verify action.
- `apps/http-server/ui/src/features/ConnectGuide.tsx:3` to `apps/http-server/ui/src/features/ConnectGuide.tsx:15` only shows start commands and a Codex MCP command. It does not cover Claude MCP setup or skill installation automation.
- Live UI check on `http://127.0.0.1:34621/`: the Connect modal showed `mair codex`, `mair claude`, the manual prompt, and `codex mcp add mina-ai-router --url http://127.0.0.1:34621/mcp`. It did not expose an automated setup/doctor action, Claude MCP setup, or registration skill installation.

Why this matters for a first user:

A new user can successfully install and start the server, then still hit a multi-step manual checklist before the first routed request can work. The UI correctly labels the blocked agent as not route-ready, but the next action is still "copy this command, run it in the correct profile/project, install the skill in another location, restart the agent, then try again." That is exactly the kind of out-of-box friction this project should absorb.

Suggested fix:

Add an explicit first-run automation surface and make it the recommended path:

1. Add `mair setup codex` and `mair setup claude`.
   - Discover the live server MCP URL from the running server when possible.
   - Check that the target CLI binary exists.
   - Run or safely repair the MCP config using the generated remove/add/get commands.
   - Verify the configured URL after setup.
   - Install or link the `skills/mina-ai-router-agent` skill into the expected Codex or Claude skill location.
   - Print a compact success/failure report with exact repair steps only for items the command could not complete.

2. Add `mair doctor`.
   - Check Node/npm, built `dist`, `tmux`, Codex/Claude availability, running server status, MCP URL, MCP client config, skill install state, state file path, and existing blocked agents.
   - Return non-zero only when required first-use items are broken.
   - Include machine-readable JSON output or a `--json` flag so the UI can reuse the same checks.

3. Add a Web UI setup action.
   - The Connect modal should offer Codex and Claude setup separately.
   - The inspector for `mcp-configuring` agents should expose `Run setup` or `Verify setup` backed by the same CLI/service logic, or at minimum show a one-click copy for setup and verify commands for both clients.
   - After verification succeeds, refresh the agent and continue self-registration without asking the user to recreate the agent.

4. Update the first-user docs after the command exists.
   - Replace the current "pick guide, run manual MCP commands, then pick skill guide" path with `mair setup codex` or `mair setup claude`.
   - Keep manual commands under an "advanced/manual repair" section.

Acceptance checks:

- From a clean profile, `mair server start --port <free-port>` followed by `mair setup codex` configures Codex MCP to the live non-default MCP URL, installs the MAIR skill, verifies the config, and reports success.
- From a clean profile, `mair setup claude --project /path/to/project` configures Claude MCP, installs or links the project skill, verifies the config, and reports success.
- `mair doctor` reports a clear pass/fail matrix before and after setup.
- Creating a Codex or Claude tmux agent after setup reaches `registration-pending` or `ready` instead of stopping at `mcp-configuring` for missing MCP.
- Existing smoke coverage remains green, and new smoke/unit coverage exercises generated setup commands, verification parsing, and skill-link behavior without requiring real user profiles.

## Finding 2 - The existing setup helper is too specialized and can confuse first users

Severity: P2

Evidence:

- `apps/cli/src/index.ts:556` to `apps/cli/src/index.ts:620` implements `setup-codex-pair` with hard-coded default roots such as `/Users/stevenna/WebstormProjects/minasoftai` and `/Users/stevenna/PycharmProjects/mina-ralph-loop-bootstrap-nextjs`.
- `apps/cli/src/index.ts:1349` to `apps/cli/src/index.ts:1376` lists `mair setup-codex-pair` in the main help output alongside general user commands.
- `apps/http-server/src/index.ts:892` to `apps/http-server/src/index.ts:912` exposes `/api/setup-codex-pair` with the same specialized defaults.

Why this matters for a first user:

The command name looks like an onboarding setup command, but it is actually a narrow Codex-pair workflow with repository-specific defaults. A first user trying to automate setup may choose it and get paths/sessions unrelated to their machine.

Suggested fix:

- Move `setup-codex-pair` out of the main first-user help path or label it as a developer/demo helper.
- Prefer the new general `mair setup codex|claude` command in README, User Start Guide, UI Connect Guide, and `mair help`.
- If `setup-codex-pair` remains public, require explicit `--main-root` and `--helper-root` instead of defaulting to local maintainer paths, or print a warning before creating sessions.

Acceptance checks:

- `mair help` makes the general first-run setup path obvious.
- A first user cannot accidentally create a helper session rooted at maintainer-local paths by running an apparently generic setup command.
- UI setup actions do not call the specialized pair helper for normal onboarding.
