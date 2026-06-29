# Branch Review: Collaboration Reliability

Review date: 2026-06-29

Branch reviewed: `codex/milestone-0.2-collaboration-reliability`

Base branch used for diff: `main`

Reviewer mode: bug/risk oriented code review plus smoke verification

## Summary

This branch is broadly aligned with the milestone 0.2 goal: request diagnostics, capability refresh, health/readiness states, self-call avoidance, request leases, and recovery controls are all represented in code and tests.

However, there are several issues to fix before treating the branch as release-ready. The most important problem is that request recovery can clear persisted lease state while leaving the in-memory `AgentRouter.busyAgents` lock stuck inside the running server process. That means an operator can click "Mark Recovered", see the agent state look released, and still be unable to route new work to that agent until the HTTP server process restarts.

Recommendation: request changes before merge/release.

## Verification Performed

The following commands were run from the repository root:

```sh
npm run verify
npm run smoke:docs
npm pack --dry-run
git diff --check main...HEAD
node dist/apps/cli/src/index.js version
```

Results:

- `npm run verify` passed.
- `npm run smoke:docs` passed.
- `npm pack --dry-run` completed and produced a valid dry-run package listing.
- `git diff --check main...HEAD` failed on `state/backlog.md:22` because of a trailing blank line at EOF.
- `node dist/apps/cli/src/index.js version` returned `0.1.4`, while `package.json` declares `0.1.5`.

GitNexus impact tooling was attempted, but this repository was not indexed in the available GitNexus instance. The review therefore used local diff inspection, test execution, and targeted runtime reproduction.

## Finding 1: Recovered Timeout Requests Leave AgentRouter Busy Lock Stuck

Severity: P1

Status: reproduced locally with a focused script

### Impact

After a routed request times out, the router marks the request lease as `orphaned` and keeps `agent.activeRequestId` attached for operator recovery. The UI/CLI recovery path can later mark the request recovered and clear the persisted agent lease fields.

But the running `AgentRouter` instance also keeps a private in-memory `busyAgents` Set. That Set is only mutated inside `AgentRouter.callAgent()` and is not cleared by HTTP/CLI recovery handlers. In the same server process, the next call to that recovered agent can still fail with:

```text
Agent "a" is busy with another request.
```

This defeats the purpose of the transaction recovery controls: the persisted state says recovered, but routing remains blocked until process restart.

### Relevant Code

- `packages/core/src/router.ts`
  - `busyAgents` is private router memory.
  - `callAgent()` rejects if `busyAgents.has(target.id)`.
  - Timeout path calls `orphanAgentLease()` and intentionally keeps `activeRequestId`.
  - `finally` only deletes `busyAgents` when `current?.activeRequestId !== request.id`.
- `apps/http-server/src/index.ts`
  - `handleRequestAction(..., "recover")` calls `requestStore.markRecovered()` and `clearAgentLeaseForRequest()`, but cannot clear `router.busyAgents`.
- `apps/cli/src/index.ts`
  - Same shape in `runRequestAction(..., "recover")`.

### Reproduction Sketch

This is the focused reproduction used during review after building the branch:

```sh
node --input-type=module <<'NODE'
import { AgentRegistry, AgentRouter, RequestStore } from './dist/packages/core/src/index.js';
import { DefaultTransportRegistry } from './dist/packages/transports/src/index.js';

class TimeoutTransport {
  async send() {}
  async capture() { return ''; }
  async waitForResponse() {
    throw new Error('Timed out waiting. Last capture:\npartial');
  }
  async status() { return { status: 'available' }; }
}

class SuccessTransport {
  async send(_agent, _input, requestId) { this.requestId = requestId; }
  async capture() { return ''; }
  async waitForResponse() {
    return [
      `<<<MINA_AGENT_RESPONSE_START ${this.requestId}>>>`,
      'ok',
      `<<<MINA_AGENT_RESPONSE_END ${this.requestId}>>>`,
    ].join('\n');
  }
  async status() { return { status: 'available' }; }
}

const registry = new AgentRegistry([
  { id: 'a', name: 'a', agentType: 'test', projectRoot: '/tmp', transport: 'test', sessionId: 'a' },
]);
const store = new RequestStore();
const transports = new DefaultTransportRegistry().register('test', new TimeoutTransport());
const router = new AgentRouter({ registry, requestStore: store, transports });

try {
  await router.callAgent({ target: 'a', task: 'timeout', timeoutMs: 1 });
} catch {}

const request = store.list()[0];
console.log('after timeout', request.status, request.leaseStatus, registry.get('a').activeRequestId, registry.get('a').leaseStatus);

store.markRecovered(request.id, 'cli');
registry.register({
  ...registry.get('a'),
  activeRequestId: undefined,
  leaseStatus: 'released',
  leaseReleasedAt: new Date().toISOString(),
});

console.log('after recover', registry.get('a').activeRequestId, registry.get('a').leaseStatus);

transports.register('test', new SuccessTransport());

try {
  await router.callAgent({ target: 'a', task: 'again', timeoutMs: 1000 });
  console.log('retry succeeded unexpectedly');
} catch (error) {
  console.log('retry failed:', error.message);
}
NODE
```

Observed output:

```text
after timeout timeout orphaned mar-... orphaned
after recover undefined released
retry failed: Agent "a" is busy with another request.
```

### Why Existing Tests Missed It

`scripts/smoke-http.js` verifies:

- timeout request becomes `status: "timeout"`;
- request lease becomes `orphaned`;
- agent appears `busy`;
- interrupt records a recovery event;
- recover sets request lease to `released`;
- recovered state has no `activeRequestId`.

It does not verify that a new `callAgent()` can succeed after recovery in the same HTTP server process.

### Suggested Fix

Move recovery-aware lock release into `AgentRouter` instead of only mutating registry/request-store externally. Options:

1. Add a public router method such as `releaseRecoveredRequestLease(requestId, source, message)` that:
   - validates action;
   - updates request recovery fields;
   - clears persisted agent lease;
   - deletes `busyAgents` for that agent.

2. Or add a lower-level method such as `releaseAgentLockForRequest(requestId)` and call it from HTTP/CLI recover/archive/cancel paths.

Prefer option 1 because it keeps request lifecycle, lease release, and in-memory lock release in one domain boundary.

### Test to Add

Add either a core test or HTTP smoke assertion:

1. Create a request that times out and becomes orphaned.
2. Recover it.
3. Immediately send another request to the same agent in the same router/server process.
4. Assert the second request succeeds and is not blocked as busy.

## Finding 2: Archiving Orphaned Requests Can Preserve Orphaned Lease State

Severity: P1/P2

### Impact

The UI exposes Archive for orphaned requests. But archiving an orphaned request does not release the orphaned lease. This can leave the activity log archived while the agent still appears attached to an orphaned request.

Depending on how the UI state is refreshed, this can be confusing or blocking:

- The request is no longer a live recovery item from the operator's perspective.
- The agent can still retain `activeRequestId` / `leaseStatus: "orphaned"`.
- Combined with Finding 1, the in-memory busy lock may remain stuck as well.

### Relevant Code

- `apps/http-server/ui/src/features/RequestDetail.tsx`
  - `validActions()` returns `["interrupt", "recover", "retry", "archive"]` for `leaseStatus === "orphaned"`.
- `packages/core/src/request-store.ts`
  - `archive()` only changes active leases to released:
    - `leaseStatus: current.leaseStatus === "active" ? "released" : current.leaseStatus`
  - For orphaned requests, `leaseStatus` stays `orphaned`.
- `apps/http-server/src/index.ts`
  - Archive handler calls `context.requestStore.archive(requestId)` but does not call `clearAgentLeaseForRequest()`.
- `apps/cli/src/index.ts`
  - Same behavior in CLI archive action.

### Suggested Fix

Define archive semantics for orphaned requests explicitly. Recommended behavior:

- If an orphaned request is archived, release the lease and clear the agent's `activeRequestId`.
- Record a recovery event such as `archive` or reuse a clear message like "Archived orphaned request and released lease."
- Clear the in-memory router busy lock as part of the same router-owned operation.

If the intended product behavior is "archive should not recover", then the UI should not offer Archive for orphaned requests until the request is recovered. But the current UI does offer it, so release-on-archive is the more operator-friendly behavior.

### Test to Add

Add coverage for:

1. Orphaned request -> archive.
2. Request no longer has `leaseStatus: "orphaned"`.
3. Agent no longer has `activeRequestId`.
4. A new request to the same agent can be routed without a busy error.

## Finding 3: CLI-Created Visible Agents Are Not Persisted When Registration Is Blocked

Severity: P2

### Impact

`mair codex` and `mair claude` can start a tmux-backed visible agent. If self-registration is blocked by permission/trust prompt or MCP preflight, the command prints a JSON summary but does not persist a placeholder agent record.

This means the blocked state may be visible only in command output, not in:

- `mair agents`;
- the HTTP UI;
- health/readiness displays;
- later recovery/registration workflows.

That conflicts with the milestone goal that newly created agents should not silently look ready while blocked, and that readiness blockers should be visible to the operator.

### Relevant Code

- `apps/cli/src/index.ts`
  - `startVisibleAgent()` builds an `agent` object and starts tmux.
  - It checks permission prompt and MCP preflight.
  - It does not call `context.registry.register(agent)` for the placeholder/blocker path.
- In contrast, HTTP-created agents do persist a placeholder:
  - `apps/http-server/src/index.ts`
  - `createTmuxAgent()` calls `context.registry.register(agent)` before checking registration prompt outcome.

### Suggested Fix

Mirror the HTTP path in CLI startup:

- Register the CLI-created tmux agent immediately with:
  - `bootstrapStatus: "created"` or `"starting"`;
  - `registrationSource: "cli"`;
  - `registrationStatus: "pending"`;
  - `lastRegistrationAttemptAt`;
  - `sessionFingerprint`;
  - permission and MCP preflight fields.
- If permission prompt is detected, update to `bootstrapStatus: "permission-required"`.
- If MCP preflight is missing/stale, update to `bootstrapStatus: "mcp-configuring"`.
- If registration prompt is sent, update to `bootstrapStatus: "registration-pending"`.

### Test to Add

Extend CLI smoke coverage:

1. Run `mair codex --no-attach --no-register` or a preflight-blocked equivalent with isolated state.
2. Assert `mair agents` includes the placeholder.
3. Assert blocker fields are present and not silently `ready`.

## Finding 4: Version Values Are Inconsistent

Severity: P3

### Impact

The package version is `0.1.5`, but runtime surfaces report older versions:

- `package.json`: `0.1.5`
- `apps/cli/src/index.ts`: `0.1.4`
- `packages/mcp/src/provider.ts`: `0.1.0`
- `apps/mcp-server/src/index.ts`: `0.1.0`

Observed command:

```sh
node dist/apps/cli/src/index.js version
```

Observed output:

```json
{
  "name": "@minasoft/mina-ai-router",
  "version": "0.1.4"
}
```

This is not a functional routing bug, but it creates release confusion and can make MCP/client diagnostics misleading.

### Suggested Fix

Avoid hard-coded duplicated version constants. Options:

1. Read version from `package.json` at build/runtime.
2. Generate a small version module during build.
3. At minimum, update all hard-coded values to `0.1.5` before release.

### Test to Add

Add smoke coverage that asserts:

- `mair version` matches `package.json.version`;
- MCP `serverInfo.version` matches `package.json.version`.

## Finding 5: Diff Whitespace Check Fails

Severity: P3

### Impact

`git diff --check main...HEAD` fails:

```text
state/backlog.md:22: new blank line at EOF.
```

This is small, but this repo's Ralph workflow treats required checks seriously. The completed task log also says `git diff --check` passed, so the current branch should be cleaned up to match that claim.

### Suggested Fix

Remove the extra trailing blank line at EOF in:

- `state/backlog.md`

Then rerun:

```sh
git diff --check main...HEAD
```

## Additional Observations

### Verify Does Not Include Docs Smoke

`npm run verify` passed, but `smoke:docs` is not part of the `verify` script. Documentation smoke passed when run separately.

Consider adding `npm run smoke:docs` to `verify` if docs are part of milestone promotion criteria.

### Package Dry Run Looks Structurally OK

`npm pack --dry-run` completed and showed the expected `dist`, public UI assets, selected docs, and skill files. No package blocker was found beyond the runtime version mismatch.

## Suggested Developer Agent Task

Fix the request recovery state machine first.

Acceptance criteria:

1. Recovering an orphaned timeout request clears persisted lease state and the in-memory router busy lock.
2. Archiving an orphaned request either:
   - releases the lease and clears the agent lock; or
   - is disallowed until recovery, with UI and API behavior aligned.
3. CLI-created visible agents are persisted as pending/blocker records when registration cannot be sent immediately.
4. Runtime version surfaces match `package.json`.
5. `git diff --check main...HEAD` passes.
6. Add regression tests for recover/archive followed by a successful new route in the same process.

Recommended commands after fixes:

```sh
npm run verify
npm run smoke:docs
git diff --check main...HEAD
node dist/apps/cli/src/index.js version
npm pack --dry-run
```
