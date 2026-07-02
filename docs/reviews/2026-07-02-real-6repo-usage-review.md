# Real 6-Repository Usage Review - Third Follow-up

Date: 2026-07-02
Reviewer: Codex
Scope: Revalidate the latest bootstrap approval fixes with six real GitHub sample repositories.

## Summary

The latest development pass fixed important blockers:

- Automated checks pass:
  - `npm run test`
  - `npm run smoke:http`
  - `npm run smoke:docs`
  - `npm run smoke:cli-controls`
- `setup` and `doctor` passed for all six sample repositories.
- Codex `register_agent` MCP approval is now detected as `codex-mcp-registration-approval`.
- Codex approval exposes `approve-codex-mcp-registration` and no longer shows generic retry while the concrete approval is visible.
- Claude project-scoped read-only Bash approvals are now detected as `scoped-command-approval` in several real cases.
- Claude `register_agent` MCP approval is still detected.
- Two Codex agents became route-ready in the real test:
  - `gitfolio-codex-v4`
  - `task-dashboard-codex-v4`

However, the full out-of-box six-repository flow is still not complete. Remaining failures are now narrower: follow-up `list_agents` verification approvals and cwd-scoped read-only Claude commands.

Keep this review file until the items below are fixed and revalidated with real Codex and Claude sessions.

## Deterministic Follow-up Coverage

Implemented in exec plans 080-082:

- Codex MCP approvals now cover both `register_agent` and `list_agents` when scoped to the current agent id and session fingerprint.
- Codex `list_agents` approval exposes the guided Codex MCP action and suppresses generic self-registration retry while the concrete prompt is visible.
- Claude MCP approvals now cover both `register_agent` and `list_agents` when scoped to the project root, current agent id, or session fingerprint.
- Claude cwd-scoped read-only capability inspection prompts now classify as `scoped-command-approval` when they contain only allow-listed read operations.
- Unsafe shell operations, package-manager commands, parent traversal, and external redirection remain manual-only.

This deterministic coverage has passed `npm run test` and `npm run smoke:http`. A fresh live six-repository revalidation is still required before deleting this review file.

## Verification Performed

Fresh server:

```bash
MINA_ROUTER_STATE=/tmp/mina-real-6repo-20260702171355/mina-router-state-v4.json \
MINA_SERVER_PID=/tmp/mina-real-6repo-20260702171355/mina-server-v4.json \
node dist/apps/cli/src/index.js server start --host 127.0.0.1 --port 34621
```

Repositories used:

- `/tmp/mina-real-6repo-20260702171355/gitfolio`
- `/tmp/mina-real-6repo-20260702171355/task-dashboard`
- `/tmp/mina-real-6repo-20260702171355/gh-game`
- `/tmp/mina-real-6repo-20260702171355/pets-workshop`
- `/tmp/mina-real-6repo-20260702171355/agents-in-sdlc`
- `/tmp/mina-real-6repo-20260702171355/node-recipe-app`

Fresh six-agent creation:

```bash
node dist/apps/cli/src/index.js codex --id gitfolio-codex-v4 --session mina-gitfolio-codex-v4 --root /tmp/mina-real-6repo-20260702171355/gitfolio --no-attach
node dist/apps/cli/src/index.js codex --id task-dashboard-codex-v4 --session mina-task-dashboard-codex-v4 --root /tmp/mina-real-6repo-20260702171355/task-dashboard --no-attach
node dist/apps/cli/src/index.js codex --id gh-game-codex-v4 --session mina-gh-game-codex-v4 --root /tmp/mina-real-6repo-20260702171355/gh-game --no-attach
node dist/apps/cli/src/index.js claude --id pets-workshop-claude-v4 --session mina-pets-workshop-claude-v4 --root /tmp/mina-real-6repo-20260702171355/pets-workshop --no-attach
node dist/apps/cli/src/index.js claude --id agents-in-sdlc-claude-v4 --session mina-agents-in-sdlc-claude-v4 --root /tmp/mina-real-6repo-20260702171355/agents-in-sdlc --no-attach
node dist/apps/cli/src/index.js claude --id node-recipe-app-claude-v4 --session mina-node-recipe-app-claude-v4 --root /tmp/mina-real-6repo-20260702171355/node-recipe-app --no-attach
```

Guided actions exercised:

```bash
POST /api/agents/gitfolio-codex-v4/terminal/input {"actionId":"skip-codex-update"}
POST /api/agents/task-dashboard-codex-v4/terminal/input {"actionId":"skip-codex-update"}
POST /api/agents/gh-game-codex-v4/terminal/input {"actionId":"skip-codex-update"}
POST /api/agents/pets-workshop-claude-v4/terminal/input {"actionId":"approve-scoped-registration-command"}
POST /api/agents/agents-in-sdlc-claude-v4/terminal/input {"actionId":"approve-scoped-registration-command"}
POST /api/agents/gitfolio-codex-v4/terminal/input {"actionId":"approve-codex-mcp-registration"}
POST /api/agents/task-dashboard-codex-v4/terminal/input {"actionId":"approve-codex-mcp-registration"}
POST /api/agents/pets-workshop-claude-v4/terminal/input {"actionId":"approve-mcp-registration"}
```

Final observed state:

```json
{
  "agents": [
    {
      "id": "gitfolio-codex-v4",
      "bootstrapStatus": "ready",
      "registrationStatus": "confirmed",
      "routeReady": true,
      "status": "available"
    },
    {
      "id": "task-dashboard-codex-v4",
      "bootstrapStatus": "ready",
      "registrationStatus": "confirmed",
      "routeReady": true,
      "status": "available"
    },
    {
      "id": "gh-game-codex-v4",
      "bootstrapStatus": "registration-pending",
      "registrationStatus": "pending",
      "routeReady": false,
      "status": "needs-attention"
    },
    {
      "id": "pets-workshop-claude-v4",
      "bootstrapStatus": "permission-required",
      "registrationStatus": "confirmed",
      "permissionPrompt": "permission-approval",
      "routeReady": false,
      "status": "needs-attention"
    },
    {
      "id": "agents-in-sdlc-claude-v4",
      "bootstrapStatus": "permission-required",
      "registrationStatus": "pending",
      "permissionPrompt": "permission-approval",
      "routeReady": false,
      "status": "needs-attention"
    },
    {
      "id": "node-recipe-app-claude-v4",
      "bootstrapStatus": "permission-required",
      "registrationStatus": "pending",
      "permissionPrompt": "permission-approval",
      "routeReady": false,
      "status": "needs-attention"
    }
  ]
}
```

## Findings

### P1 - Codex `list_agents` MCP approval is not detected, so verification blocks registration

The previous Codex `register_agent` approval is fixed. In the `gh-game-codex-v4` run, Codex reached the follow-up verification step before calling `register_agent`:

```text
Calling mina-ai-router.list_agents({
  "callerAgentId": "gh-game-codex-v4",
  "callerSessionFingerprint": "mina-gh-game-codex-v4",
  "sourceAgent": "gh-game-codex-v4"
})

Field 1/1
Allow the mina-ai-router MCP server to run tool "list_agents"?

› 1. Allow
  2. Allow for this session
  3. Always allow
  4. Cancel
enter to submit | esc to cancel
```

Mina did not detect this prompt. The terminal endpoint returned only generic retry:

```json
{
  "agent": {
    "id": "gh-game-codex-v4",
    "bootstrapStatus": "registration-pending",
    "registrationStatus": "pending"
  },
  "pendingRegistration": true,
  "actions": ["retry-self-registration"]
}
```

This is the same user-facing problem as the prior `register_agent` issue: a concrete safe approval prompt is visible, but the UI offers a retry that can duplicate the registration prompt.

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:160` through `packages/transports/src/tmux/tmux-client.ts:168`
- `packages/transports/src/tmux/tmux-client.ts:260` through `packages/transports/src/tmux/tmux-client.ts:267`
- `apps/http-server/src/index.ts:1255` through `apps/http-server/src/index.ts:1265`

Recommended fix:

- Generalize Codex MCP registration approval detection to allow both `register_agent` and `list_agents` when scoped to the current agent id/session fingerprint.
- Add a prompt kind such as `codex-mcp-list-agents-approval`, or reuse a broader `codex-mcp-registration-approval` if the action label clearly describes the visible tool.
- Expose a guided approval action that sends Enter for option 1 only.
- Hide `retry-self-registration` while this approval is visible.
- Add a real-style fixture with `mina-ai-router.list_agents({ callerAgentId, callerSessionFingerprint, sourceAgent })`.

### P1 - Claude `list_agents` MCP approval remains manual and can keep confirmed agents in needs-attention

`pets-workshop-claude-v4` successfully registered and reached `registrationStatus: "confirmed"`, but Claude then followed the registration instruction to verify with `list_agents`:

```text
Registration succeeded already; now confirming via list_agents as instructed.

Tool use

mina-ai-router - list_agents (MCP)
List registered Mina helper agents.

Do you want to proceed?
❯ 1. Yes
  2. Yes, and don't ask again for mina-ai-router - list_agents commands in /private/tmp/mina-real-6repo-20260702171355/pets-workshop
  3. No

Esc to cancel · Tab to amend
```

Mina reported:

```json
{
  "agent": {
    "id": "pets-workshop-claude-v4",
    "bootstrapStatus": "permission-required",
    "registrationStatus": "confirmed"
  },
  "permissionPrompt": {
    "kind": "permission-approval",
    "evidence": "Do you want to proceed?"
  },
  "pendingRegistration": false,
  "actions": ["manual-permission-approval"]
}
```

The agent is registered, but the extra verification prompt keeps it in `needs-attention` and prevents the out-of-box flow from becoming clean.

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:180` through `packages/transports/src/tmux/tmux-client.ts:187`
- `packages/transports/src/tmux/tmux-client.ts:318` through `packages/transports/src/tmux/tmux-client.ts:323`
- `apps/http-server/src/index.ts:1243` through `apps/http-server/src/index.ts:1253`

Recommended fix:

- Detect Claude `mina-ai-router - list_agents (MCP)` approvals as a scoped verification prompt.
- Scope it to either:
  - current `projectRoot` path in the "don't ask again" option, or
  - current `agent.id` / `sessionFingerprint` when arguments are visible.
- Expose a guided action for option 1.
- If `registrationStatus === "confirmed"` and only a post-registration verification prompt is visible, avoid degrading route readiness unnecessarily. Either guide approval or mark this as non-blocking once the actual registration has succeeded.

### P1 - Cwd-scoped Claude read-only context command still falls back to manual approval

The new Claude scoped command detector works when the command contains the absolute project root. It still misses read-only commands that are scoped by tmux cwd rather than by an explicit `cd /path`.

`node-recipe-app-claude-v4` stopped at:

```text
Bash command

ls -la && echo "---" && for f in CLAUDE.md claude.md AGENTS.md agents.md agent.md README.md; do if [ -f "$f" ]; then echo "=== $f ==="; fi; done
List project files and check for capability docs

Contains simple_expansion

Do you want to proceed?
❯ 1. Yes
  2. No

Esc to cancel · Tab to amend · ctrl+e to explain
```

The tmux session cwd is already `/tmp/mina-real-6repo-20260702171355/node-recipe-app`, but the command text does not include that path. Mina therefore returned:

```json
{
  "agent": {
    "id": "node-recipe-app-claude-v4",
    "bootstrapStatus": "permission-required",
    "registrationStatus": "pending"
  },
  "permissionPrompt": {
    "kind": "permission-approval",
    "evidence": "Do you want to proceed?"
  },
  "pendingRegistration": true,
  "actions": ["manual-permission-approval"]
}
```

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:243` through `packages/transports/src/tmux/tmux-client.ts:258`
- `packages/transports/src/tmux/tmux-client.ts:332` through `packages/transports/src/tmux/tmux-client.ts:346`

Recommended fix:

- Treat read-only context commands without an explicit absolute path as scoped when:
  - `agent.projectRoot` is the tmux session cwd, and
  - the command contains only allow-listed read-only operations, and
  - it does not contain unsafe path traversal, mutation, network, package-manager, or shell redirection to external paths.
- Alternatively, update the self-registration prompt to ask Claude to use explicit `cd <projectRoot>` for every registration context command so existing project-root detection can work reliably.
- Add a fixture for the cwd-scoped `ls -la && echo ... for f in ...` prompt.

## Revalidation Checklist

Before deleting this review file, re-run:

```bash
npm run test
npm run smoke:http
npm run smoke:docs
npm run smoke:cli-controls
```

Then repeat the six real sessions on a fresh state file and confirm:

- All Codex MCP approval prompts for both `register_agent` and `list_agents` expose guided actions.
- Claude MCP approvals for both `register_agent` and `list_agents` expose guided actions or do not block route readiness after confirmed registration.
- Cwd-scoped read-only Claude context commands are guided safely or the registration prompt always produces explicit project-root-scoped commands.
- At least one Codex and one Claude agent become route-ready and can answer a routed `mair ask`.
- Ideally all six sample agents reach either `available` or a clearly justified non-automation-safe manual blocker.
