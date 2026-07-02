# CLI blocked agent placeholder

```json taskmeta
{
  "id": "cli-blocked-agent-placeholder",
  "title": "CLI blocked agent placeholder",
  "order": 21,
  "status": "completed",
  "next_task_on_success": "release-version-and-verify-contract",
  "promotion_mode": "deterministic_only",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-06-29-collaboration-reliability-branch-review.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/product-specs/agent-bootstrap-reliability.md",
    "docs/MCP-CLIENT-SETUP.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:cli-controls",
    "npm run smoke:http"
  ],
  "required_files": [
    "apps/cli/src/index.ts",
    "packages/core/src/registry.ts",
    "scripts/core-tests.js",
    "scripts/smoke-cli-controls.js",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "CLI-created blocked sessions are only printed to stdout and not persisted",
    "CLI startup marks blocked sessions as ready",
    "The fix creates duplicate records for the same session fingerprint"
  ],
  "completed_at": "2026-06-29T07:32:52.564Z"
}
```

## Objective

Fix branch review Finding 3: `mair codex` and `mair claude` must persist visible placeholder agent records even when registration is blocked by permission or MCP setup.

## Scope

- Mirror the HTTP create path by registering CLI-started tmux agents before blocker checks can stop self-registration.
- Persist `registrationSource: "cli"`, `registrationStatus: "pending"`, `lastRegistrationAttemptAt`, `sessionFingerprint`, bootstrap state, permission profile fields, and MCP preflight fields.
- Update permission-required and mcp-configuring paths so `mair agents`, `mair agent <id>`, and the HTTP UI can see blocked records.
- Preserve idempotency for repeated CLI starts with the same session fingerprint.
- Add CLI smoke coverage for a blocked or no-register startup path.

## Out of scope

- Automatically approving Codex or Claude permission prompts.
- Automatically editing unsupported MCP client config.
- Reworking Web UI agent creation.

## Exit criteria

1. A CLI-created agent is persisted before self-registration succeeds.
2. Permission-blocked CLI starts show `permission-required` and relevant prompt metadata in later CLI/UI reads.
3. MCP-preflight-blocked CLI starts show `mcp-configuring` and exact next-action commands in later CLI/UI reads.
4. Re-running the startup for the same session does not create a duplicate agent.
5. Required checks pass.

## Required checks

- `npm run test`
- `npm run smoke:cli-controls`
- `npm run smoke:http`

## Evaluator notes

Use deterministic smoke fixtures. If real Codex/Claude binaries are unavailable, use existing no-attach/no-register or fixture paths that exercise the same state transitions without external dependencies.

## Progress log

- 2026-06-29: Seeded from branch review Finding 3.
- 2026-06-29T08:18:00+09:00: CLI-created visible agents are now persisted before registration blockers can stop the flow. `mair codex` / `mair claude` records CLI source, pending registration, session fingerprint, last attempt time, permission profile, MCP preflight fields, and blocker bootstrap state. CLI smoke now asserts no-register/MCP-blocked sessions appear in `mair agents` and `mair agent <id>`. Required checks passed: `npm run test`, `npm run smoke:cli-controls`, `npm run smoke:http`.
- 2026-06-29T07:27:32.786Z: restored as current task after orphan-archive-semantics promotion.
- 2026-06-29T07:32:52.564Z: automatically promoted after deterministic checks and evaluator approval.
