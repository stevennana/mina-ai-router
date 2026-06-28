# Developer Start Guide

This guide is for developing Mina AI Router.

## 1. Install Dependencies

```sh
cd mina-ai-router
npm install
```

## 2. Build

```sh
npm run build
```

## 3. Register the Local CLI

Use `npm link` so your shell can run `mair` directly.

```sh
npm link
mair version
```

This links the package bin entries:

- `mair`
- `mair-mcp`
- `mair-http`

## 4. Run the Server During Development

Preferred:

```sh
mair server start --port 3333
mair server status
```

Direct Node fallback:

```sh
node dist/apps/cli/src/index.js server start --port 3333
```

Open:

```text
http://127.0.0.1:3333/
```

## 5. Run Verification

```sh
npm run verify
```

This runs:

- TypeScript build
- core tests
- HTTP UI smoke test
- CLI control smoke test
- tmux smoke test
- MCP smoke test
- multi-agent smoke test

## 6. Useful Development Commands

```sh
npm run build
npm run smoke:http
npm run smoke:mcp
npm run smoke:tmux
mair health
mair verify
```

## 7. Local State

By default, MAIR stores local state in:

```text
data/router-state.json
```

Override it with:

```sh
export MINA_ROUTER_STATE=/path/to/router-state.json
```

## 8. Important Paths

- CLI: `apps/cli/src/index.ts`
- HTTP UI/server: `apps/http-server/src/index.ts`
- Browser UI HTML: `apps/http-server/src/ui.html`
- MCP provider: `packages/mcp/src/provider.ts`
- tmux transport: `packages/transports/src/tmux`
- agent registration skill: `skills/mina-ai-router-agent/SKILL.md`

## 9. Before Committing

Run:

```sh
npm run verify
git status --short
```
