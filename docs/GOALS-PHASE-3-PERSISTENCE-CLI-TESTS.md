# Phase 3 Goals: Persistence, CLI, and Tests

## Goal

Make the POC reliable enough to iterate on without losing request state or depending on fragile manual checks.

Phase 3 is about operator quality: clear commands, durable state, and repeatable tests.

## Scope

Phase 3 includes:

- reliable persistence for agents and requests
- persisted `failed` and `timeout` statuses
- safer CLI argument parsing
- structured command output
- unit tests for pure core logic
- integration smoke tests for CLI and tmux
- updated docs for everyday use

## Non-Goals

Phase 3 does not include:

- full database migration framework
- web UI
- permission system
- advanced scheduling
- autonomous agent planning

## Implementation Tasks

1. Decide whether JSON state is enough for the POC or move to SQLite.
2. If SQLite is adopted, define the smallest schema for agents and requests.
3. Persist request state on success, failure, and timeout.
4. Replace ad hoc CLI parsing with a small CLI framework or safer parser.
5. Support task text that includes flags, quotes, and multiline content.
6. Add tests for prompt envelope generation.
7. Add tests for marker parsing success and failure.
8. Add tests for request lifecycle transitions.
9. Add CLI smoke tests.
10. Add tmux smoke tests that create and clean up test sessions.

## Acceptance Criteria

Phase 3 passes when:

- `npm run build` succeeds.
- `npm run test` or equivalent unit test command succeeds.
- request records survive process restart.
- failed requests are visible via `mar requests` and `mar request <id>`.
- timeout requests are visible via `mar requests` and `mar request <id>`.
- CLI task parsing preserves user text exactly.
- test tmux sessions are cleaned up by smoke tests.
- docs describe how to reset local POC state safely.

## Verification

Required checks:

```sh
npm run build
npm test
mar register payment --agent gemini --transport headless --session payment --root ./payment
mar ask payment "question with --literal flag text"
mar requests
mar request <request-id>
```

For tmux:

```sh
tmux new-session -d -s mina-router-smoke '/bin/sh'
mar register smoke --agent shell --transport tmux --session mina-router-smoke --root /tmp
mar ask smoke "return marker response"
tmux kill-session -t mina-router-smoke
```

## Known Risks

- SQLite adds dependency and migration overhead.
- CLI parser changes may alter existing smoke commands.
- tmux cleanup must be careful not to kill user sessions.
