# 2026-07-02 Real CLI/WebUI Multi-Agent Follow-up Review

## Verification Summary

Reviewed the implementation that addressed the previous real CLI/WebUI multi-agent findings.

Commands run:

```sh
npm run test
npm run smoke:cli-controls
npm run smoke:http
npm run smoke:docs
node scripts/smoke-real-cli-contract.js
MINA_REAL_CLI_SMOKE=1 node scripts/smoke-real-cli-contract.js
```

Results:

- `npm run test`: passed
- `npm run smoke:cli-controls`: passed
- `npm run smoke:http`: passed
- `npm run smoke:docs`: passed
- `node scripts/smoke-real-cli-contract.js`: skipped by default as designed
- `MINA_REAL_CLI_SMOKE=1 node scripts/smoke-real-cli-contract.js`: failed for Claude because `claude mcp list` did not show `mina-ai-router`

The implementation improves prompt classification and state transitions, but the first-time real CLI flow is still not complete enough for easy OOB use.

## Findings

### P1 - Claude MCP setup/doctor still does not prove the target project session can see Mina MCP

The original issue was that `mair setup/doctor` could appear successful while a newly launched Claude Code session in the target project could not see Mina MCP tools. The new implementation now checks `claude mcp list`, which is better, but the checks are still executed from the current Mina process cwd rather than the requested `--project` directory.

Code evidence:

- `apps/cli/src/index.ts:709` stores `projectRoot`, but `runRequiredMcpCommand()` does not receive or use it as `cwd`.
- `apps/cli/src/index.ts:941` runs `claude mcp get` and `claude mcp list` without `cwd: projectRoot`.
- `apps/http-server/src/index.ts:1176` runs Web UI preflight `claude mcp get/list` without the target `projectRoot` cwd.

Real check evidence:

```sh
MINA_REAL_CLI_SMOKE=1 node scripts/smoke-real-cli-contract.js
```

Observed:

```text
AssertionError [ERR_ASSERTION]: claude mcp list should show mina-ai-router
actual: Checking MCP server health...

gitnexus: npx -y gitnexus@latest mcp - ✔ Connected
```

Why this matters:

- Claude MCP visibility can vary by project/session context.
- `--project /path/to/project` should verify the exact project context that will later run `mair claude` or the Web UI-created Claude session.
- The current check can still validate the wrong context and leave the real agent unable to call `register_agent`.

Suggested fix:

- Pass `projectRoot` into MCP setup/doctor/preflight command execution and run `claude mcp get/list` with `cwd: projectRoot`.
- Add a fake-client regression where `claude mcp list` returns Mina only when `cwd` equals the requested project root.
- For the Web UI path, run Claude MCP visibility checks from the selected project root, not from the Mina server cwd.

### P1 - Codex update prompt handling says Enter will skip, but Enter may select the unsafe/default update action

The new `client-update-required` state is good, and it prevents sending self-registration into the update prompt. However, the UI/docs/action text now tell the user that pressing `Send Enter` skips the update prompt.

Code/docs evidence:

- `packages/transports/src/tmux/tmux-client.ts:153` says: `press Send Enter in Mina to skip the update prompt`
- `docs/TROUBLESHOOTING.md:29` says: `Press Enter in the Web UI terminal to skip the update prompt`
- `apps/http-server/src/index.ts:745` sends raw Enter for the TerminalPanel `Send Enter` action.
- `apps/http-server/src/index.ts:750` then may automatically send the registration prompt once the update prompt disappears.

Why this matters:

- The real Codex update prompt presents choices like `1. Update now`, `2. Skip`, `3. Skip until next version`.
- Pressing Enter is not a guaranteed safe skip action. It may activate the currently selected/default item, which can be `Update now`.
- During bootstrap, Mina should never trigger a global CLI update when the user expects "skip and continue".

Suggested fix:

- Do not describe raw Enter as "skip" for Codex update prompts.
- Add a dedicated safe action for update prompts that sends the explicit skip choice, for example `2` + Enter or the exact key sequence verified against the current Codex prompt.
- Keep a manual fallback: attach to tmux and choose the update option yourself.
- Add a smoke fixture that verifies the update prompt path sends the explicit skip choice, not only Enter.

### P2 - The requested approval automation is only documented; the UI still exposes a raw manual terminal action

The latest request asked that manual approval processes be made easy and automated where possible. The current implementation adds design/docs and some state advancement, but not an actual guided or auto-safe approval flow.

Code evidence:

- `apps/http-server/ui/src/features/TerminalPanel.tsx:55` still exposes a generic `Send Enter` button.
- `apps/http-server/ui/src/features/TerminalPanel.tsx:78` only converts terminal state to text; it does not render prompt-specific actions.
- `docs/exec-plans/completed/062-guided-bootstrap-approval-loop-design.md:27` marks the task complete with docs-only exit criteria.
- `rg` found no implemented `guided`, `auto-safe`, `Prepare these sessions`, or prompt-specific approval policy in app code.

Why this matters:

- The user still needs to understand raw Claude/Codex prompts and choose the correct terminal input.
- The product still does not provide the single guided setup step requested in the review.
- Mistakes are easy: the same `Send Enter` button is used for trust approval, command approval, and update prompts even though those require different safety semantics.

Suggested fix:

- Add prompt-specific UI actions:
  - `Approve selected project trust`
  - `Approve Mina MCP verification command`
  - `Skip Codex update for now`
  - `Retry self-registration`
- Add a first-run bootstrap loop with a policy enum:
  - `manual`
  - `guided`
  - `auto-safe`
- Only auto-run actions that are scoped and deterministic. Leave broad file-system or command approvals manual.
- Update smoke tests to assert the UI/API exposes prompt-specific action metadata, not just raw terminal text.

### P2 - Real CLI contract smoke is not part of `verify`, and the opt-in failure is easy to miss

The new `smoke:real-cli-contract` script is useful, but it skips by default and `npm run verify` does not run the opt-in mode. That is reasonable for CI, but the current release checklist can still be green while real installed Claude cannot see Mina MCP.

Code evidence:

- `package.json` includes `smoke:real-cli-contract`, but `verify` runs it without `MINA_REAL_CLI_SMOKE=1`, so it only exercises the skip path.
- `scripts/smoke-real-cli-contract.js:11` returns early unless `MINA_REAL_CLI_SMOKE=1`.

Suggested fix:

- Add a documented local release command, for example:

```sh
npm run verify
MINA_REAL_CLI_SMOKE=1 npm run smoke:real-cli-contract
```

- Make the release/readiness docs explicitly state that real CLI contract smoke must pass on a machine with connected Codex/Claude accounts before claiming the real CLI flow is fixed.
- Consider printing a stronger message from `npm run verify` when real CLI smoke is skipped.

