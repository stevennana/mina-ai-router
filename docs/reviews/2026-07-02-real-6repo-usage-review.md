# Real 6-Repository Usage Review - Follow-up

Date: 2026-07-02
Reviewer: Codex
Scope: Verify the latest review fixes with a fresh Mina server and six real GitHub sample repositories.

## Summary

The deterministic unit and smoke coverage passes, but the live six-repository flow is still not out-of-box friendly. The remaining failures are all around guided startup approvals and self-registration recovery:

- Codex passive update banners are still treated as blocking update menus when stale menu text remains in tmux scrollback.
- CLI-created pending agents do not expose self-registration retry because `confirmedByAgentAt` is set even while `registrationStatus` remains `pending`.
- Claude reaches MCP `register_agent` approval prompts that Mina does not detect, leaving the UI with no guided action.
- Claude project trust prompts are still manual-only, even though they are deterministic folder-trust prompts for the selected project root.
- CLI flag parsing silently ignores common `--project=/path` syntax.

Keep this review file until the items below are fixed and revalidated with real Codex and Claude sessions.

## Verification Performed

Fresh server:

```bash
MINA_ROUTER_STATE=/tmp/mina-real-6repo-20260702171355/mina-router-state-v2.json \
MINA_SERVER_PID=/tmp/mina-real-6repo-20260702171355/mina-server-v2.json \
node dist/apps/cli/src/index.js server start --host 127.0.0.1 --port 34621
```

Repositories used:

- `/tmp/mina-real-6repo-20260702171355/gitfolio`
- `/tmp/mina-real-6repo-20260702171355/task-dashboard`
- `/tmp/mina-real-6repo-20260702171355/gh-game`
- `/tmp/mina-real-6repo-20260702171355/pets-workshop`
- `/tmp/mina-real-6repo-20260702171355/agents-in-sdlc`
- `/tmp/mina-real-6repo-20260702171355/node-recipe-app`

Setup and doctor passed for all six:

```bash
node dist/apps/cli/src/index.js setup codex --project /tmp/mina-real-6repo-20260702171355/gitfolio --mcp-url http://127.0.0.1:34621/mcp
node dist/apps/cli/src/index.js doctor --client codex --project /tmp/mina-real-6repo-20260702171355/gitfolio --json

# Repeated for:
# codex: task-dashboard, gh-game
# claude: pets-workshop, agents-in-sdlc, node-recipe-app
```

Automated checks passed:

```bash
npm run test
npm run smoke:http
npm run smoke:docs
npm run smoke:cli-controls
```

Fresh six-agent creation:

```bash
node dist/apps/cli/src/index.js codex --id gitfolio-codex-cli2 --session mina-gitfolio-codex-cli2 --root /tmp/mina-real-6repo-20260702171355/gitfolio --no-attach
node dist/apps/cli/src/index.js codex --id task-dashboard-codex-cli2 --session mina-task-dashboard-codex-cli2 --root /tmp/mina-real-6repo-20260702171355/task-dashboard --no-attach
node dist/apps/cli/src/index.js codex --id gh-game-codex-web2 --session mina-gh-game-codex-web2 --root /tmp/mina-real-6repo-20260702171355/gh-game --no-attach
node dist/apps/cli/src/index.js claude --id pets-workshop-claude-cli2 --session mina-pets-workshop-claude-cli2 --root /tmp/mina-real-6repo-20260702171355/pets-workshop --no-attach
node dist/apps/cli/src/index.js claude --id agents-in-sdlc-claude-web2 --session mina-agents-in-sdlc-claude-web2 --root /tmp/mina-real-6repo-20260702171355/agents-in-sdlc --no-attach
node dist/apps/cli/src/index.js claude --id node-recipe-app-claude-web2 --session mina-node-recipe-app-claude-web2 --root /tmp/mina-real-6repo-20260702171355/node-recipe-app --no-attach
```

Final live health after creation:

```json
{
  "ok": false,
  "agents": {
    "total": 6,
    "available": 0,
    "needsAttention": 6
  }
}
```

The Web UI at `http://127.0.0.1:34621/` showed all six agents as `needs-attention`.

## Findings

### P1 - Passive Codex update banners still block usable prompts when stale menu text remains in scrollback

Real Codex sessions now show a usable normal prompt below the passive update banner:

```text
╭─────────────────────────────────────────────────╮
│ ✨ Update available! 0.142.3 -> 0.142.5         │
│ Run npm install -g @openai/codex to update.     │
╰─────────────────────────────────────────────────╯

╭──────────────────────────────────────────────╮
│ >_ OpenAI Codex (v0.142.3)                   │
│ directory: /private/tmp/…/gitfolio           │
╰──────────────────────────────────────────────╯

› Write tests for @filename
```

Mina still classifies that same terminal as `client-update-required`:

```json
{
  "id": "gitfolio-codex-cli2",
  "bootstrapStatus": "client-update-required",
  "registrationStatus": "pending",
  "permissionPrompt": {
    "kind": "client-update",
    "evidence": "✨ Update available! 0.142.3 -> 0.142.5"
  },
  "actions": ["skip-codex-update", "manual-update-choice"]
}
```

Root cause observed from detector replay:

```text
✨ Update available! 0.142.3 -> 0.142.5
Release notes: https://github.com/openai/codex/releases/latest
› 1. Update now (runs `npm install -g @openai/codex`)
2. Skip
3. Skip until next version
Press enter to continue
...
› Write tests for @filename
```

The new detection requires update choices, but it still scans a recent window where the old active update menu remains above the current normal prompt. Because the detector does not anchor classification to the latest prompt state, stale menu text makes a usable Codex prompt look blocked.

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:143` uses `recentPromptWindow(capture)` and normalizes the whole recent window.
- `packages/transports/src/tmux/tmux-client.ts:196` through `packages/transports/src/tmux/tmux-client.ts:199` classify update state when banner and choices exist anywhere in that normalized window.

Recommended fix:

- Classify Codex update prompts from the latest interactive prompt segment, not from any matching text in the recent tmux window.
- If a normal Codex input prompt appears after the update menu, treat the update menu as stale.
- Add a fixture with active update menu text followed by the passive banner and a normal `›` prompt. Assert it does not return `client-update`.
- Keep a separate fixture where the active update menu is the latest prompt and assert it still returns `client-update`.

### P1 - CLI-created pending agents still cannot recover because `confirmedByAgentAt` suppresses retry

All six live agents were created by CLI with `registrationStatus: "pending"`, but they also had `confirmedByAgentAt` populated immediately:

```json
{
  "id": "node-recipe-app-claude-web2",
  "bootstrapStatus": "registration-pending",
  "registrationStatus": "pending",
  "confirmedByAgentAt": "2026-07-02T08:49:59.669Z",
  "routeReady": false
}
```

For `node-recipe-app-claude-web2`, the terminal endpoint returned no recovery action:

```json
{
  "agent": {
    "bootstrapStatus": "registration-pending",
    "registrationStatus": "pending",
    "confirmed": true
  },
  "pendingRegistration": false,
  "actions": []
}
```

This means the user sees a needs-attention agent but cannot resume self-registration from the Web UI.

The same issue affects action chaining. When `skip-codex-update` was submitted for `gitfolio-codex-cli2`, Mina returned:

```json
{
  "registration": "unchanged",
  "agent": {
    "bootstrapStatus": "client-update-required",
    "registrationStatus": "pending",
    "confirmed": true
  },
  "pendingRegistration": false
}
```

Affected code:

- `apps/http-server/src/index.ts:1180` through `apps/http-server/src/index.ts:1194`
- `apps/http-server/src/index.ts:767` through `apps/http-server/src/index.ts:771`

The new `needsSelfRegistration(agent)` returns false whenever `confirmedByAgentAt` exists, even if `registrationStatus` is still `pending`.

Recommended fix:

- Treat `registrationStatus === "confirmed"` as the durable route-ready signal.
- Do not let `confirmedByAgentAt` alone suppress retry when `registrationStatus` is still `pending`.
- Add HTTP smoke coverage for a CLI-created tmux agent with both `registrationStatus: "pending"` and `confirmedByAgentAt` populated. It should expose `retry-self-registration`.
- Re-run the real six-agent flow and verify at least pending Claude MCP approval sessions show a guided path rather than empty actions.

### P1 - Claude MCP `register_agent` approval prompts are not detected or actionable

After Claude successfully loaded the Mina skill and prepared the actual MCP registration call, the terminal displayed:

```text
Tool use

mina-ai-router - register_agent(
  id: "node-recipe-app-claude-web2",
  agentType: "claude",
  transport: "tmux",
  sessionId: "mina-node-recipe-app-claude-web2",
  projectRoot: "/tmp/mina-real-6repo-20260702171355/node-recipe-app",
  startupCommand: "claude",
  ...
) (MCP)

Do you want to proceed?
❯ 1. Yes
  2. Yes, and don't ask again for mina-ai-router - register_agent commands in /private/tmp/mina-real-6repo-20260702171355/node-recipe-app
  3. No

Esc to cancel · Tab to amend
```

Mina returned no prompt and no action:

```json
{
  "agent": {
    "bootstrapStatus": "registration-pending",
    "registrationStatus": "pending",
    "confirmed": true
  },
  "pendingRegistration": false,
  "actions": []
}
```

For `pets-workshop-claude-cli2`, the new scoped command action moved Claude past a Bash inspection step, but then Claude stopped at the MCP `register_agent` approval. The terminal endpoint changed to:

```json
{
  "agent": {
    "bootstrapStatus": "created",
    "registrationStatus": "pending"
  },
  "pendingRegistration": false,
  "actions": []
}
```

That is worse for the user because the visible terminal is blocked on a real approval, but Mina now reports no `permissionPrompt`.

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:169` through `packages/transports/src/tmux/tmux-client.ts:186`
- `apps/http-server/src/index.ts:707` through `apps/http-server/src/index.ts:720`
- `apps/http-server/src/index.ts:1196` through `apps/http-server/src/index.ts:1262`

Recommended fix:

- Add a Claude prompt kind for Mina MCP registration approval, scoped to:
  - `mina-ai-router - register_agent`
  - the current `agent.id`
  - the current `agent.sessionId`
  - the current `agent.projectRoot`
- Expose a guided action such as `approve-mcp-registration` that sends Enter when option 1 is selected.
- Do not default to option 2 (`don't ask again`) unless there is an explicit product decision to persist that permission.
- Do not mark the prior `permission-required` state as resolved while a `Do you want to proceed?` Mina MCP approval remains visible.
- Add real-style fixtures for both `node-recipe-app` and `pets-workshop` terminal captures.

### P2 - Claude project trust prompt remains manual-only despite being a scoped folder trust prompt

One Claude session stopped at the initial folder trust prompt:

```text
Accessing workspace:

/private/tmp/mina-real-6repo-20260702171355/agents-in-sdlc

Quick safety check: Is this a project you created or one you trust?
Claude Code'll be able to read, edit, and execute files here.

❯ 1. Yes, I trust this folder
  2. No, exit

Enter to confirm · Esc to cancel
```

Mina classified it as a generic manual permission approval:

```json
{
  "id": "agents-in-sdlc-claude-web2",
  "bootstrapStatus": "permission-required",
  "permissionPrompt": "permission-approval",
  "actions": ["manual-permission-approval"]
}
```

The user specifically wants approval-heavy setup flows to become easy and guided where safe. This prompt is deterministic and contains the selected project root, so it is a good candidate for a guided action similar to Codex project trust.

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:179` through `packages/transports/src/tmux/tmux-client.ts:186`
- `apps/http-server/src/index.ts:1227` through `apps/http-server/src/index.ts:1236`

Recommended fix:

- Split Claude folder trust from generic permission approval.
- Only classify as Claude folder trust when the terminal includes the current `agent.projectRoot` or its resolved `/private/tmp/...` equivalent and the visible option is `Yes, I trust this folder`.
- Expose a guided `approve-claude-project-trust` action that sends Enter.
- After approval, automatically continue the same registration recovery loop when `registrationStatus` is still `pending`.

### P3 - `--project=/path` is silently ignored by the CLI parser

During setup validation, this command succeeded but used the repository checkout as `projectRoot`, not the requested sample repository:

```bash
node dist/apps/cli/src/index.js setup codex --project=/tmp/mina-real-6repo-20260702171355/gitfolio --mcp-url=http://127.0.0.1:34621/mcp
```

Observed result:

```json
{
  "ok": true,
  "client": "codex",
  "projectRoot": "/Users/stevenna/WebstormProjects/mina-aimesh"
}
```

The documented form `--project /path` works, so this did not block the six-repo test. However, `--flag=value` is common CLI syntax. Silent fallback to cwd can configure the wrong repository and confuse first-time users.

Affected code:

- `apps/cli/src/index.ts:1767` through `apps/cli/src/index.ts:1788`

Recommended fix:

- Teach `parseFlags()` to split `--key=value`.
- Add a CLI smoke assertion for `setup --dry-run --project=/tmp/example`.
- If unsupported syntax is intentionally rejected, fail loudly instead of silently treating `project` as absent.

## Revalidation Checklist

Before deleting this review file, re-run:

```bash
npm run test
npm run smoke:http
npm run smoke:docs
npm run smoke:cli-controls
```

Then repeat the six real sessions on a fresh state file and confirm:

- Passive Codex banner plus current normal prompt is not `client-update-required`.
- Active Codex update menu is still `client-update-required`.
- `skip-codex-update` never sends `2` into a normal Codex prompt.
- CLI-created pending agents expose `retry-self-registration` until `registrationStatus` is `confirmed`.
- Claude folder trust, scoped command approval, and Mina MCP `register_agent` approval all have safe guided actions when scoped to the selected project.
- At least one Codex and one Claude agent become route-ready and can answer a routed `mair ask`.
