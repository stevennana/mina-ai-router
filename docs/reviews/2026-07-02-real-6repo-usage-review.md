# Real 6-Repository Usage Review - Second Follow-up

Date: 2026-07-02
Reviewer: Codex
Scope: Revalidate the latest review fixes with a fresh Mina server and six real GitHub sample repositories.

## Summary

Several previous issues are fixed:

- `--project=/path` now resolves to the requested project root.
- `setup` and `doctor` pass for all six sample repositories.
- Codex active update prompts can be skipped through the guided action.
- Stale Codex update menu text above a normal prompt no longer remains classified as `client-update`.
- CLI-created pending agents now keep `pendingRegistration: true` and expose retry actions.
- Claude folder trust is now detected as `claude-folder-trust` with a guided approval action.

However, the real six-repository flow is still not out-of-box complete. All six agents remained `needs-attention` after the guided actions available today. The remaining blockers are approval prompts that the UI still does not classify or guide safely.

Keep this review file until the items below are fixed and revalidated with real Codex and Claude sessions.

## Deterministic Follow-up Coverage

Implemented in exec plans 077-079:

- Codex `mina-ai-router.register_agent` approval prompts are now classified as `codex-mcp-registration-approval`.
- Codex MCP registration approval exposes `approve-codex-mcp-registration` and suppresses generic `retry-self-registration` while the concrete approval prompt is visible.
- Claude read-only registration context approvals now classify as `scoped-command-approval` for project-scoped file inspection and tmux context probes.
- Unsafe Claude commands such as package-manager mutation remain generic manual `permission-approval`.
- Approving a scoped Claude registration context command resumes the self-registration loop when the agent is still pending.

This deterministic coverage has passed `npm run test` and `npm run smoke:http`. The live six-repository revalidation below is still required before this review can be deleted.

## Verification Performed

Fresh server:

```bash
MINA_ROUTER_STATE=/tmp/mina-real-6repo-20260702171355/mina-router-state-v3.json \
MINA_SERVER_PID=/tmp/mina-real-6repo-20260702171355/mina-server-v3.json \
node dist/apps/cli/src/index.js server start --host 127.0.0.1 --port 34621
```

Repositories used:

- `/tmp/mina-real-6repo-20260702171355/gitfolio`
- `/tmp/mina-real-6repo-20260702171355/task-dashboard`
- `/tmp/mina-real-6repo-20260702171355/gh-game`
- `/tmp/mina-real-6repo-20260702171355/pets-workshop`
- `/tmp/mina-real-6repo-20260702171355/agents-in-sdlc`
- `/tmp/mina-real-6repo-20260702171355/node-recipe-app`

Automated checks passed:

```bash
npm run test
npm run smoke:http
npm run smoke:docs
npm run smoke:cli-controls
```

Setup and doctor passed for all six project/client pairs:

```bash
node dist/apps/cli/src/index.js setup codex --project /tmp/mina-real-6repo-20260702171355/gitfolio --mcp-url http://127.0.0.1:34621/mcp
node dist/apps/cli/src/index.js doctor --client codex --project /tmp/mina-real-6repo-20260702171355/gitfolio --json

# Repeated for:
# codex: task-dashboard, gh-game
# claude: pets-workshop, agents-in-sdlc, node-recipe-app
```

The equals flag form is fixed:

```bash
node dist/apps/cli/src/index.js setup codex --dry-run --project=/tmp/mina-real-6repo-20260702171355/gitfolio --mcp-url=http://127.0.0.1:34621/mcp
```

Observed:

```json
{
  "equalsFlagProjectRoot": "/tmp/mina-real-6repo-20260702171355/gitfolio",
  "ok": true
}
```

Fresh six-agent creation:

```bash
node dist/apps/cli/src/index.js codex --id gitfolio-codex-v3 --session mina-gitfolio-codex-v3 --root /tmp/mina-real-6repo-20260702171355/gitfolio --no-attach
node dist/apps/cli/src/index.js codex --id task-dashboard-codex-v3 --session mina-task-dashboard-codex-v3 --root /tmp/mina-real-6repo-20260702171355/task-dashboard --no-attach
node dist/apps/cli/src/index.js codex --id gh-game-codex-v3 --session mina-gh-game-codex-v3 --root /tmp/mina-real-6repo-20260702171355/gh-game --no-attach
node dist/apps/cli/src/index.js claude --id pets-workshop-claude-v3 --session mina-pets-workshop-claude-v3 --root /tmp/mina-real-6repo-20260702171355/pets-workshop --no-attach
node dist/apps/cli/src/index.js claude --id agents-in-sdlc-claude-v3 --session mina-agents-in-sdlc-claude-v3 --root /tmp/mina-real-6repo-20260702171355/agents-in-sdlc --no-attach
node dist/apps/cli/src/index.js claude --id node-recipe-app-claude-v3 --session mina-node-recipe-app-claude-v3 --root /tmp/mina-real-6repo-20260702171355/node-recipe-app --no-attach
```

Guided actions verified as working:

```bash
POST /api/agents/gitfolio-codex-v3/terminal/input {"actionId":"skip-codex-update"}
POST /api/agents/task-dashboard-codex-v3/terminal/input {"actionId":"skip-codex-update"}
POST /api/agents/gh-game-codex-v3/terminal/input {"actionId":"skip-codex-update"}
POST /api/agents/agents-in-sdlc-claude-v3/terminal/input {"actionId":"approve-claude-project-trust"}
POST /api/agents/node-recipe-app-claude-v3/terminal/input {"actionId":"retry-self-registration"}
```

After those guided actions, final status still showed all six agents as not route-ready:

```json
{
  "agents": [
    { "id": "agents-in-sdlc-claude-v3", "bootstrapStatus": "registration-pending", "registrationStatus": "pending", "routeReady": false, "status": "needs-attention" },
    { "id": "gh-game-codex-v3", "bootstrapStatus": "registration-pending", "registrationStatus": "pending", "routeReady": false, "status": "needs-attention" },
    { "id": "gitfolio-codex-v3", "bootstrapStatus": "registration-pending", "registrationStatus": "pending", "routeReady": false, "status": "needs-attention" },
    { "id": "node-recipe-app-claude-v3", "bootstrapStatus": "registration-pending", "registrationStatus": "pending", "routeReady": false, "status": "needs-attention" },
    { "id": "pets-workshop-claude-v3", "bootstrapStatus": "permission-required", "registrationStatus": "pending", "permissionPrompt": "permission-approval", "routeReady": false, "status": "needs-attention" },
    { "id": "task-dashboard-codex-v3", "bootstrapStatus": "registration-pending", "registrationStatus": "pending", "routeReady": false, "status": "needs-attention" }
  ]
}
```

## Findings

### P1 - Codex MCP `register_agent` approval prompt is not detected or guided

After `skip-codex-update`, Codex correctly moved past the active update menu and started the Mina self-registration flow. Each Codex agent then reached the actual MCP tool approval prompt:

```text
Calling
└ mina-ai-router.register_agent({
  "id": "gitfolio-codex-v3",
  "name": "gitfolio-codex-v3",
  "agentType": "codex",
  "transport": "tmux",
  "sessionId": "mina-gitfolio-codex-v3",
  "sessionFingerprint": "mina-gitfolio-codex-v3",
  "projectRoot": "/tmp/mina-real-6repo-20260702171355/gitfolio",
  "startupCommand": "codex --no-alt-screen",
  ...
})

Field 1/1
Allow the mina-ai-router MCP server to run tool "register_agent"?

› 1. Allow
  2. Allow for this session
  3. Always allow
  4. Cancel
enter to submit | esc to cancel
```

Mina did not detect this as an approval prompt:

```json
{
  "agent": {
    "id": "gitfolio-codex-v3",
    "bootstrapStatus": "registration-pending",
    "registrationStatus": "pending"
  },
  "pendingRegistration": true,
  "actions": [
    {
      "id": "retry-self-registration",
      "policy": "guided",
      "label": "Retry Self Registration"
    }
  ]
}
```

This affected all three Codex agents:

- `gitfolio-codex-v3`
- `task-dashboard-codex-v3`
- `gh-game-codex-v3`

The exposed action is actively misleading here. The terminal is already waiting at a scoped MCP registration approval; showing only `retry-self-registration` can cause the user to send another registration prompt on top of an in-progress approval.

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:142` through `packages/transports/src/tmux/tmux-client.ts:190`
- `apps/http-server/src/index.ts:1199` through `apps/http-server/src/index.ts:1289`

Recommended fix:

- Add a Codex prompt kind for `mina-ai-router.register_agent` approval prompts.
- Scope detection to:
  - `mina-ai-router.register_agent`
  - `Allow the mina-ai-router MCP server to run tool "register_agent"?`
  - the current `agent.id`
  - the current `agent.sessionId`
  - the current `agent.projectRoot`
- Expose a guided action such as `approve-codex-mcp-registration` that sends Enter for option 1 only.
- Hide `retry-self-registration` while a concrete registration approval prompt is visible.
- Add a real-style fixture using the captured Codex approval shape above.

### P1 - Claude read-only registration context Bash approvals remain manual-only

Claude registration still stops before the MCP approval step on read-only context gathering commands. Example from `agents-in-sdlc-claude-v3`:

```text
Bash command

cd /tmp/mina-real-6repo-20260702171355/agents-in-sdlc && ls -la && echo "---" && for f in CLAUDE.md claude.md AGENTS.md agents.md agent.md README.md; do [ -f "$f" ] && echo "FOUND: $f"; done
List project files and check for capability docs

Contains simple_expansion

Do you want to proceed?
❯ 1. Yes
  2. No

Esc to cancel · Tab to amend · ctrl+e to explain
```

Example from `node-recipe-app-claude-v3`:

```text
Bash command

tmux display-message -p '#S' 2>/dev/null || true; tmux display-message -p '#{pane_id}' 2>/dev/null || true; pwd
Check tmux session context and current directory

This command requires approval

Do you want to proceed?
❯ 1. Yes
  2. Yes, and don’t ask again for: tmux display-message *
  3. No
```

Example from `pets-workshop-claude-v3`:

```text
Bash command

cd /tmp/mina-real-6repo-20260702171355/pets-workshop && ls -la && echo "---CLAUDE.md---" && ...
Run shell command

This command uses shell operators that require approval for safety

Do you want to proceed?
❯ 1. Yes
  2. No
```

Mina still surfaces these as generic manual approval:

```json
{
  "id": "pets-workshop-claude-v3",
  "bootstrapStatus": "permission-required",
  "registrationStatus": "pending",
  "permissionPrompt": {
    "kind": "permission-approval",
    "evidence": "Esc to cancel · Tab to amend · ctrl+e to explain"
  },
  "actions": ["manual-permission-approval"]
}
```

This blocks the out-of-box flow because the user has to attach to tmux manually before registration can reach `register_agent`.

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:180` through `packages/transports/src/tmux/tmux-client.ts:209`
- `packages/transports/src/tmux/tmux-client.ts:286` through `packages/transports/src/tmux/tmux-client.ts:318`
- `apps/http-server/src/index.ts:1254` through `apps/http-server/src/index.ts:1264`

Recommended fix:

- Add a Claude prompt kind for scoped read-only registration context commands.
- Treat these as guided only when the command is clearly scoped to the selected project root or is a known read-only context probe required by registration.
- Suggested allow-list shape:
  - `ls`, `pwd`, `cat`, `head`, `find`, `rg --files`
  - `tmux display-message -p` for session/pane discovery
  - shell operators such as `&&`, `|| true`, `echo`, and simple `for` loops only when all filesystem reads stay in `agent.projectRoot`
- Continue rejecting or manual-gating mutation/network/package-manager commands.
- Add fixtures for the current Claude variants:
  - `Contains simple_expansion`
  - `This command requires approval`
  - `This command uses shell operators that require approval for safety`
- After approval, continue the same registration loop until either MCP registration approval is reached or the agent becomes confirmed.

### P2 - Registration-pending agents show retry even when a concrete approval prompt is visible

The `needsSelfRegistration` fix correctly keeps retry available for pending agents, but it is now too broad. When Codex is waiting at `Allow the mina-ai-router MCP server to run tool "register_agent"?`, the terminal endpoint still returns only:

```json
{
  "pendingRegistration": true,
  "actions": ["retry-self-registration"]
}
```

At that point retry is not the right next action. The agent is not idle; it is blocked at a specific approval prompt.

Affected code:

- `apps/http-server/src/index.ts:1277` through `apps/http-server/src/index.ts:1288`

Recommended fix:

- Give prompt-specific actions precedence over generic retry.
- If the detector sees any known registration approval prompt, hide retry and expose only the scoped approval action.
- If the detector sees an unknown permission prompt, hide retry or show it only after the prompt clears.

## Revalidation Checklist

Before deleting this review file, re-run:

```bash
npm run test
npm run smoke:http
npm run smoke:docs
npm run smoke:cli-controls
```

Then repeat the six real sessions on a fresh state file and confirm:

- The three Codex agents expose a guided MCP registration approval action and become `registrationStatus: "confirmed"`.
- The Claude read-only context Bash approvals expose scoped guided actions where safe.
- Claude MCP `register_agent` approval is still detected after the Bash context approvals clear.
- Generic `retry-self-registration` is not shown while a concrete approval prompt is visible.
- At least one Codex and one Claude agent become route-ready and can answer a routed `mair ask`.
