# Real 6-Repository Usage Review - Fourth Follow-up

Date: 2026-07-02
Reviewer: Codex
Scope: Revalidate the latest approval fixes with six real GitHub sample repositories.

## Summary

The latest development pass fixed the previous Codex and MCP approval blockers:

- Automated checks pass:
  - `npm run test`
  - `npm run smoke:http`
  - `npm run smoke:docs`
  - `npm run smoke:cli-controls`
- `setup` and `doctor` passed for all six sample repositories.
- Codex `register_agent` approvals are guided.
- Codex `list_agents` approvals are now guided.
- Claude `register_agent` approvals are guided.
- Claude `list_agents` approvals are now guided.
- The three Codex agents reached route-ready:
  - `gitfolio-codex-v5`
  - `task-dashboard-codex-v5`
  - `gh-game-codex-v5`
- One Claude agent registered successfully and internally reported route-ready:
  - `pets-workshop-claude-v5`

The remaining out-of-box issues are now limited to Claude terminal prompt detection:

- Mina treats harmless final Claude text containing the words "permission prompt" as an active permission prompt.
- Mina still treats read-only registration scans using `2>/dev/null` as unsafe.

Keep this file until the two findings below are fixed and revalidated with real Claude sessions.

## Deterministic Follow-up Coverage

Implemented in exec plans 083-084:

- Generic Claude permission detection now requires a visible interactive approval UI shape instead of matching explanatory text alone.
- Final Claude text containing "permission prompt" followed by the idle Claude footer no longer classifies as `permission-approval`.
- Confirmed Claude agents with only idle terminal text clear stale `permission-required` state on terminal capture.
- Read-only registration scans using `2>/dev/null` classify as `scoped-command-approval` when the remaining command is project-scoped and allow-listed.
- Mutation, package-manager, traversal, and non-`/dev/null` unsafe redirection checks remain manual-only.

This deterministic coverage has passed `npm run test` and `npm run smoke:http`. A fresh live Claude revalidation is still required before deleting this review file.

## Verification Performed

Fresh server:

```bash
MINA_ROUTER_STATE=/tmp/mina-real-6repo-20260702171355/mina-router-state-v5.json \
MINA_SERVER_PID=/tmp/mina-real-6repo-20260702171355/mina-server-v5.json \
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
node dist/apps/cli/src/index.js codex --id gitfolio-codex-v5 --session mina-gitfolio-codex-v5 --root /tmp/mina-real-6repo-20260702171355/gitfolio --no-attach
node dist/apps/cli/src/index.js codex --id task-dashboard-codex-v5 --session mina-task-dashboard-codex-v5 --root /tmp/mina-real-6repo-20260702171355/task-dashboard --no-attach
node dist/apps/cli/src/index.js codex --id gh-game-codex-v5 --session mina-gh-game-codex-v5 --root /tmp/mina-real-6repo-20260702171355/gh-game --no-attach
node dist/apps/cli/src/index.js claude --id pets-workshop-claude-v5 --session mina-pets-workshop-claude-v5 --root /tmp/mina-real-6repo-20260702171355/pets-workshop --no-attach
node dist/apps/cli/src/index.js claude --id agents-in-sdlc-claude-v5 --session mina-agents-in-sdlc-claude-v5 --root /tmp/mina-real-6repo-20260702171355/agents-in-sdlc --no-attach
node dist/apps/cli/src/index.js claude --id node-recipe-app-claude-v5 --session mina-node-recipe-app-claude-v5 --root /tmp/mina-real-6repo-20260702171355/node-recipe-app --no-attach
```

Final observed state after guided approvals:

```json
{
  "agents": [
    {
      "id": "gitfolio-codex-v5",
      "bootstrapStatus": "created",
      "registrationStatus": "confirmed",
      "routeReady": true,
      "status": "available"
    },
    {
      "id": "task-dashboard-codex-v5",
      "bootstrapStatus": "created",
      "registrationStatus": "confirmed",
      "routeReady": true,
      "status": "available"
    },
    {
      "id": "gh-game-codex-v5",
      "bootstrapStatus": "created",
      "registrationStatus": "confirmed",
      "routeReady": true,
      "status": "available"
    },
    {
      "id": "pets-workshop-claude-v5",
      "bootstrapStatus": "permission-required",
      "registrationStatus": "confirmed",
      "permissionPrompt": "permission-approval",
      "routeReady": false,
      "status": "needs-attention"
    },
    {
      "id": "agents-in-sdlc-claude-v5",
      "bootstrapStatus": "permission-required",
      "registrationStatus": "confirmed",
      "permissionPrompt": "permission-approval",
      "routeReady": false,
      "status": "needs-attention"
    },
    {
      "id": "node-recipe-app-claude-v5",
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

### P1 - Claude final narrative text is misclassified as an active permission prompt

Two Claude agents completed registration, but Mina still marks them `permission-required`.

For `agents-in-sdlc-claude-v5`, the terminal is idle at the normal Claude prompt after a successful registration summary:

```text
Registered and confirmed:

- id / name: agents-in-sdlc-claude-v5
- sessionId / fingerprint: mina-agents-in-sdlc-claude-v5
- registrationStatus: confirmed (via mcp)

One flag: bootstrapStatus shows permission-required and status is needs-attention — Mina is waiting on an operator/trust approval before this session can receive routed work. That's a Claude Code
permission prompt, not something I can clear from here; it needs to be approved in the tmux session (tmux attach -t mina-agents-in-sdlc-claude-v5).

❯
? for shortcuts · ← for agents
```

Mina reads that narrative text as a real permission prompt:

```json
{
  "agent": {
    "id": "agents-in-sdlc-claude-v5",
    "bootstrapStatus": "permission-required",
    "registrationStatus": "confirmed"
  },
  "permissionPrompt": {
    "kind": "permission-approval",
    "evidence": "permission prompt, not something I can clear from here; it needs to be approved in the tmux session (tmux attach -t mina-agents-in-sdlc-claude-v5)."
  },
  "pendingRegistration": false,
  "actions": ["manual-permission-approval"]
}
```

For `pets-workshop-claude-v5`, Claude reports the agent is available and route-ready, but Mina still returns a generic prompt based on idle footer text:

```json
{
  "agent": {
    "id": "pets-workshop-claude-v5",
    "bootstrapStatus": "permission-required",
    "registrationStatus": "confirmed"
  },
  "permissionPrompt": {
    "kind": "permission-approval",
    "evidence": "? for shortcuts · ← for agents"
  },
  "pendingRegistration": false,
  "actions": ["manual-permission-approval"]
}
```

This keeps confirmed Claude agents in `needs-attention` even though no actionable approval prompt is visible.

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:210` through `packages/transports/src/tmux/tmux-client.ts:217`
- `packages/transports/src/tmux/tmux-client.ts:339` through `packages/transports/src/tmux/tmux-client.ts:345`
- `apps/http-server/src/index.ts:703` through `apps/http-server/src/index.ts:709`

Recommended fix:

- Do not classify explanatory assistant text as `permission-approval`.
- Require current interactive approval UI shape for generic Claude permission prompts, for example:
  - visible `Do you want to proceed?` plus numbered choices, or
  - visible `Enter to confirm`, or
  - visible Claude trust folder prompt.
- If the latest segment ends at the normal Claude prompt footer (`❯` and `? for shortcuts`) and `registrationStatus === "confirmed"`, clear the stale permission state instead of preserving `permission-required`.
- Add fixtures for:
  - final text containing "permission prompt" followed by idle Claude prompt,
  - idle footer `? for shortcuts · ← for agents`.

### P1 - Read-only Claude registration command with `2>/dev/null` remains manual-only

`node-recipe-app-claude-v5` still stops at a read-only capability scan:

```text
Bash command

cd /tmp/mina-real-6repo-20260702171355/node-recipe-app && ls -la && echo "---CLAUDE.md---" && (cat CLAUDE.md 2>/dev/null || echo "none") && echo "---AGENTS.md---" && (cat AGENTS.md 2>/dev/null
|| echo "none") && echo "---README---" && (cat README.md 2>/dev/null | head -100 || echo "none") && echo "---package.json---" && (cat package.json 2>/dev/null || echo "none")
Run shell command

This command uses shell operators that require approval for safety

Do you want to proceed?
❯ 1. Yes
  2. No
```

Mina still returns generic manual approval:

```json
{
  "agent": {
    "id": "node-recipe-app-claude-v5",
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

Detector replay shows the command is rejected because the unsafe redirection rule matches `2>/dev/null`:

```ts
const unsafeShellCommandPatterns = [
  // ...
  />\s*(?:\/|~|\.)/i,
];
```

This is too broad for the registration flow. Suppressing stderr to `/dev/null` while reading optional docs is common and low-risk; treating it as unsafe forces a manual attach for an otherwise safe out-of-box path.

Affected code:

- `packages/transports/src/tmux/tmux-client.ts:243` through `packages/transports/src/tmux/tmux-client.ts:263`
- `packages/transports/src/tmux/tmux-client.ts:383` through `packages/transports/src/tmux/tmux-client.ts:396`

Recommended fix:

- Allow stderr redirection to `/dev/null` for otherwise read-only registration context commands.
- Continue rejecting writes to project files, absolute files other than `/dev/null`, parent paths, home paths, and mutation/network/package-manager commands.
- Add a fixture for the exact `cat CLAUDE.md 2>/dev/null || echo "none"` command shape.

## Revalidation Checklist

Before deleting this review file, re-run:

```bash
npm run test
npm run smoke:http
npm run smoke:docs
npm run smoke:cli-controls
```

Then repeat the real Claude sessions and confirm:

- Final idle Claude text containing "permission prompt" is not classified as an active permission prompt.
- Confirmed Claude agents become route-ready when no actual approval UI is visible.
- Read-only registration scans using `2>/dev/null` expose `approve-scoped-registration-command`.
- At least one Claude agent reaches `available` without manual tmux attach.
