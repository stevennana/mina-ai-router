# Fresh Operator Review: Mina AI Router

Review date: 2026-06-29

Branch reviewed: `codex/milestone-0.2-collaboration-reliability`

Review stance: first-time operator workflow, using the README/User Start Guide path rather than only rechecking previous findings.

## Summary

Recommendation: request changes.

The core build and existing smoke suite pass, but a fresh operator workflow exposed a high-impact state synchronization problem between the long-running HTTP server and one-shot CLI commands.

When `mair server start` is running, the HTTP server loads router state once into memory. Later CLI commands such as `mair register` and `mair ask` load, mutate, and save the same JSON state file in separate processes. The running server does not reload those file changes. The UI/API can therefore show stale data, and a later server-side mutation can overwrite CLI-created agents or requests.

This is especially risky because the docs explicitly encourage using both the CLI and Web UI against the same local router state.

## Verification Performed

Commands and flows run from the repository root:

```sh
npm run verify
npm run smoke:docs
git diff --check main...HEAD
node dist/apps/cli/src/index.js version
npm pack --dry-run
```

Fresh operator flow with isolated state:

```sh
TMPDIR=$(mktemp -d /tmp/mina-fresh-review-XXXXXX)
PORT=34337
export MINA_ROUTER_STATE="$TMPDIR/router-state.json"
export MINA_SERVER_PID="$TMPDIR/mair-server.json"

node dist/apps/cli/src/index.js server start --port "$PORT" --host 127.0.0.1
node dist/apps/cli/src/index.js health
node dist/apps/cli/src/index.js register alpha --agent gemini --transport headless --session alpha --root "$TMPDIR" --summary "Alpha helper" --sources "fresh review"
node dist/apps/cli/src/index.js agents
node dist/apps/cli/src/index.js ask alpha "fresh review question" --timeout-ms 1000
node dist/apps/cli/src/index.js requests
curl -fsS "http://127.0.0.1:$PORT/api/state"
node dist/apps/cli/src/index.js server stop
```

State overwrite flow:

```sh
TMPDIR=$(mktemp -d /tmp/mina-overwrite-review-XXXXXX)
PORT=34339
export MINA_ROUTER_STATE="$TMPDIR/router-state.json"
export MINA_SERVER_PID="$TMPDIR/mair-server.json"

node dist/apps/cli/src/index.js server start --port "$PORT" --host 127.0.0.1
node dist/apps/cli/src/index.js register alpha --agent gemini --transport headless --session alpha --root "$TMPDIR" --summary "Alpha helper" --sources "fresh review"

node -e 'const s=require(process.env.MINA_ROUTER_STATE); console.log(s.agents.map(a=>a.id))'

curl -fsS -X POST "http://127.0.0.1:$PORT/api/register" \
  -H 'content-type: application/json' \
  -d "{\"id\":\"beta\",\"agentType\":\"gemini\",\"transport\":\"headless\",\"sessionId\":\"beta\",\"projectRoot\":\"$TMPDIR\",\"capabilitySummary\":\"Beta helper\",\"capabilitySources\":\"fresh review\"}"

node -e 'const s=require(process.env.MINA_ROUTER_STATE); console.log(s.agents.map(a=>a.id))'
node dist/apps/cli/src/index.js server stop
```

GitNexus impact tooling was attempted in earlier review passes, but this repository is not indexed in the available GitNexus instance. This review uses local runtime reproduction and code inspection.

## Finding 1: CLI and HTTP Server Can Diverge and Overwrite Router State

Severity: P1

### Impact

If the HTTP server is running and a user runs CLI commands against the same `MINA_ROUTER_STATE`, the server does not see the CLI writes. The UI/API can show stale agents and requests. Worse, the next HTTP-side mutation saves the server's stale in-memory registry back to disk and can delete CLI-created entries.

This breaks a core product promise:

- local-first state should be shared between CLI, UI, and MCP;
- `mair agents`, `mair requests`, and the Web UI should agree;
- operator data under `data/` should not be lost by normal mixed CLI/UI usage.

### Reproduction

With the HTTP server running on an isolated state file, CLI registration and ask succeeded:

```text
mair register alpha ...
mair ask alpha ...
mair requests -> one answered request
```

But the HTTP API backed by the running server still returned an empty state:

```json
{
  "agents": 0,
  "requests": 0,
  "mcpUrl": "http://127.0.0.1:34337/mcp",
  "statePath": "/tmp/mina-fresh-review-.../router-state.json"
}
```

A second reproduction confirmed data loss:

```text
FILE_AFTER_CLI=
{
  "agents": ["alpha"],
  "requests": 0
}

FILE_AFTER_HTTP_SAVE=
{
  "agents": ["beta"],
  "requests": 0
}
```

The HTTP `/api/register` call saved the server's stale in-memory state and removed `alpha`.

### Relevant Code

- `apps/http-server/src/index.ts`
  - `const context = createContext();` is created once at process startup.
  - `createContext()` calls `fileState.load()` once.
  - `/api/state` returns `context.router.listAgentStatuses()` and `context.router.listRequests()` from the long-lived in-memory registry/store.
  - HTTP mutations call `context.save()`, which writes the current in-memory snapshot back to the state file.
- `apps/cli/src/index.ts`
  - each CLI invocation creates its own context and loads the state file independently.
  - `registerAgent()` writes directly to the file.
  - `askAgent()` routes locally in the CLI process and writes directly to the file.
- `packages/core/src/file-state.ts`
  - `FileState.load()` and `save()` are simple file operations with no merge/version/reload protection.

### Suggested Fix

Pick one state ownership model and make all surfaces follow it.

Recommended for this product:

1. When a compatible HTTP server is running for the same state file, CLI mutating commands should proxy to the server instead of writing the file directly.
   - Existing request actions already have a server-proxy pattern in `runServerRequestAction()`.
   - Extend that pattern to at least `register`, `ask`, capability refresh, and other mutating commands.
2. Alternatively, make the HTTP server reload and merge file state before every read/write.
   - This is more fragile because concurrent writes still need conflict handling.
3. Add a state revision or updated-at guard to `FileState.save()` so stale writers cannot silently overwrite newer state.

The safest design is "server owns live state while it is running; CLI talks to the server when possible."

### Tests to Add

Add an HTTP/CLI integration smoke test:

1. Start HTTP server with an isolated state file.
2. Run CLI `register alpha` against that state.
3. Assert `/api/state` shows `alpha`.
4. Run HTTP `/api/register` for `beta`.
5. Assert the state file contains both `alpha` and `beta`.

Add a similar test for CLI `ask`:

1. Start server.
2. Register an agent through CLI.
3. Run CLI `ask`.
4. Assert `/api/state` shows the resulting request.

## Finding 2: `mair health` Reports the Wrong MCP URL After `server start --port`

Severity: P2

### Impact

When a user starts the server with an explicit port:

```sh
mair server start --port 34337 --host 127.0.0.1
```

`mair server status` correctly reports:

```text
http://127.0.0.1:34337/mcp
```

But `mair health` reports:

```json
{
  "mcp": {
    "httpUrl": "http://127.0.0.1:3333/mcp"
  }
}
```

This can send a first-time operator to configure Codex/Claude against the wrong MCP URL. The README and user guide tell the user to run `mair server start --port ...`, then inspect/operate the router. If the port is not the default, `health` becomes misleading.

### Relevant Code

- `apps/cli/src/index.ts`
  - `showHealth()` constructs the MCP URL from `MINA_HTTP_HOST` / `MINA_HTTP_PORT`, defaulting to `127.0.0.1:3333`.
  - It does not consult the `serverStatus()` pid file created by `mair server start --port`.
- `startServer()` does persist `host`, `port`, `uiUrl`, and `mcpUrl` in `MINA_SERVER_PID`, but `showHealth()` does not use those persisted values.

### Suggested Fix

Have `showHealth()` prefer the running server status when it points at the same state file:

1. Call `serverStatus()`.
2. If it is running and `status.statePath` resolves to the current `statePath`, use `status.mcpUrl`.
3. Fall back to env/default URL only when there is no matching running server.

### Test to Add

Add CLI smoke coverage:

1. Start server on a non-default port with isolated pid/state files.
2. Run `mair health`.
3. Assert `health.mcp.httpUrl` equals the `mcpUrl` from `mair server status`.

## Non-Blocking Observations

### Existing Verification Is Healthy

The current suite is much stronger than before:

- `npm run verify` now includes `smoke:docs`.
- CLI/MCP runtime versions match `package.json`.
- recovery and orphan archive regressions are covered.

### Package Dry Run Looks Fine

`npm pack --dry-run` completed successfully and included the expected `dist`, UI assets, docs, and skill files.

## Recommendation

Request changes before release.

The P1 state overwrite issue is a normal-usage data loss risk for a local operator tool. It should be fixed before publishing this collaboration reliability branch, because mixed CLI/UI usage is part of the advertised product workflow.
