# First-User OOB Agent Start Review - 2026-07-01

## Summary

Reviewer perspective: a first-time user follows the current OOB path:

1. install and start Mina
2. run `mair setup codex` or `mair setup claude`
3. run `mair doctor`
4. create the first visible agent with `mair codex`, `mair claude`, or the Web UI

Result: setup and doctor are much better now, but the first visible agent can still stop at `mcp-configuring` immediately after successful setup. This breaks the promise that OOB setup removes the MCP blocker before agent creation.

Recommendation: request changes.

## Finding 1 - `mair codex` does not consume the MCP setup that `mair setup codex` just verified

Severity: P1

Evidence:

- `apps/cli/src/index.ts:324` to `apps/cli/src/index.ts:330` builds visible-agent MCP preflight from CLI flags only:
  - `configured: flags["mcp-configured"] === "true"`
  - `configuredUrl: flags["mcp-configured-url"]`
- The normal OOB command shown in README and the user guide is just `mair codex`, so those flags are not supplied.
- `apps/cli/src/index.ts:346` and `apps/cli/src/index.ts:377` then mark the agent as `mcp-configuring` when `buildMcpPreflight` cannot see a configured flag.
- `scripts/smoke-cli-controls.js:137` to `scripts/smoke-cli-controls.js:155` verifies `mair setup` and `mair doctor`, but it does not then run `mair codex` with the same fake configured client and assert that the self-registration prompt can be sent.

Reproduction:

Using a fake Codex binary that reports the live MCP URL from `codex mcp get`, I ran:

```sh
mair server start --port 34633
mair setup codex --project <project>
mair codex --root <project> --id oob-codex --no-attach --register-delay-ms 0
```

`mair setup codex` succeeded and reported:

```json
{
  "ok": true,
  "mcpUrl": "http://127.0.0.1:34633/mcp",
  "skill": {
    "installed": true
  }
}
```

But the immediately following `mair codex` still returned:

```json
{
  "registration": "waiting for MCP setup",
  "nextAction": "Run: codex mcp add mina-ai-router --url http://127.0.0.1:34633/mcp",
  "mcpPreflight": {
    "status": "missing",
    "canSendSelfRegistrationPrompt": false
  },
  "agent": {
    "bootstrapStatus": "mcp-configuring",
    "mcpPreflightStatus": "missing",
    "registrationStatus": "pending"
  }
}
```

Why this matters for a first user:

The docs now tell users that `mair setup` configures MCP and installs the registration skill before visible CLI sessions start. A first user who follows that path can still be told to run the same MCP setup command again when they start their first agent. That makes OOB setup feel broken and prevents the expected first successful self-registration.

Suggested fix:

- Make visible agent creation inspect the client MCP config before calling `buildMcpPreflight`.
  - For Codex, run or share the equivalent of `codex mcp get mina-ai-router`.
  - For Claude, run or share the equivalent of `claude mcp get mina-ai-router`.
  - Pass the detected URL as `configuredUrl`.
- Reuse the setup/doctor MCP inspection helper instead of maintaining separate behavior.
- Apply the same behavior to the Web UI create-agent endpoint, not only the CLI path.
- Keep explicit flags such as `--mcp-configured` for tests or unusual deterministic paths, but do not require them for the normal OOB flow.

Acceptance checks:

- With a matching running server and fake Codex whose `codex mcp get mina-ai-router` returns the live MCP URL, `mair setup codex --project <project>` followed by `mair codex --root <project> --no-attach` must not return `registration: "waiting for MCP setup"`.
- The agent's MCP preflight should be `configured`, and creation should proceed to `registration-pending` or `ready` depending on the fake agent behavior.
- The same check should exist for Claude.
- The Web UI create-agent smoke should cover an already-configured MCP client and should not require a hidden `mcpConfigured: true` body flag for the normal path.

## Finding 2 - Doctor repair guidance is still a reason, not a repair command, for MCP-blocked agents

Severity: P2

Evidence:

- `apps/cli/src/index.ts:604` to `apps/cli/src/index.ts:606` returns `agent.routeBlockedReason` before checking whether the blocker is `mcp-configuring`, `missing`, or `stale`.
- In the reproduced OOB failure above, `mair doctor` reported a blocked agent with:

```json
{
  "routeBlockedReason": "Agent is waiting for Mina MCP setup before it can self-register or receive routed work.",
  "repairAction": "Agent is waiting for Mina MCP setup before it can self-register or receive routed work."
}
```

Why this matters for a first user:

The top-level doctor check says to resolve the listed `repairAction` values, but the MCP case gives the user a description of the problem instead of the command to run. Since the project already knows the agent type and project root, this should be actionable.

Suggested fix:

- In `doctorRepairAction`, prefer specific bootstrap/preflight repair commands before returning `routeBlockedReason`.
- For MCP blockers, return something like:

```text
Run mair setup codex --project <projectRoot>, then rerun mair doctor --client codex --project <projectRoot>.
```

- Keep `routeBlockedReason` as supporting context, but make `repairAction` a concrete next step.

Acceptance checks:

- A blocked Codex agent with `mcpPreflightStatus: "missing"` has a `repairAction` containing `mair setup codex --project`.
- A blocked Claude agent with `mcpPreflightStatus: "missing"` has a `repairAction` containing `mair setup claude --project`.
- Permission and registration blockers still show their own specific repair actions.
