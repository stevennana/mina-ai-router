# Frontend

The browser UI is a React/Vite operations console served by the local HTTP server.

## Primary Screen

The root page at `http://127.0.0.1:3333/` shows:

- command bar with health, MCP URL, and agent creation controls
- live flow map with router core and agent nodes
- zoom, reset, draggable agents, and draggable flow canvas
- floating agent inspector
- floating activity panel
- terminal and request modals

## UX Principles

- The flow map is the primary operational surface.
- Inspector and activity panels should float without changing flow layout.
- Agent selection should filter activity and expose relevant controls.
- Request errors should be diagnosable without opening JSON state files.
- UI-heavy changes need desktop and mobile overflow checks.

## 0.2 Frontend Priorities

- Request detail view with lifecycle, raw answer, parsed answer, parser diagnostics, and actions.
- Activity filtering and status affordances.
- Capability freshness indicators and refresh/edit paths.
- Health states for stale/missing/needs-attention agents.

## UI Verification

UI tasks should include:

- `npm run build`
- focused Playwright or smoke coverage when a task changes UI behavior
- desktop and mobile overflow checks for floating panels
- screenshot or DOM assertions for new request/agent states
