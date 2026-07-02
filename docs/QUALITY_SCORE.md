# Quality Score

This is a lightweight quality snapshot for Ralph planning.

## Current Grades

- Core routing: B
- Transports: B
- MCP surface: B
- Browser UI: B
- Request diagnostics: C
- Agent health model: C
- Capability freshness: C
- Documentation: B

## Immediate Priorities

1. Make request failures explainable.
2. Add retry/cancel/archive controls backed by tests.
3. Add capability refresh and freshness states.
4. Improve agent heartbeat and status semantics.

## Quality Bar

- Domain changes need core or smoke tests.
- MCP behavior needs smoke coverage.
- UI behavior needs build plus focused browser assertions.
- Ralph promotion requires the commands declared in each task.
