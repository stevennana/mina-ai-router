# Generic self-registration retry

```json taskmeta
{
  "id": "generic-self-registration-retry",
  "title": "Generic self-registration retry",
  "order": 70,
  "status": "completed",
  "next_task_on_success": "claude-scoped-registration-approval",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-02-real-6repo-usage-review.md",
    "docs/design-docs/agent-bootstrap-reliability.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "apps/http-server/src/index.ts",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "Retry Self Registration is still Web UI placeholder-only",
    "CLI-created pending agents cannot trigger registration from Web UI",
    "Retry appears while MCP setup is missing or another blocker is active"
  ]
}
```

## Objective

Expose `Retry Self Registration` for any visible tmux agent that still needs self-registration, not only Web UI-created placeholders.

## Scope

- Replace the Web UI-only pending predicate with a generic `needsSelfRegistration(agent)` predicate.
- Keep retry hidden while active MCP, trust, update, or permission blockers are present.
- Allow CLI-created pending agents to retry self-registration from the terminal API/UI once blockers clear.
- Add HTTP smoke coverage for CLI-created pending agent retry.

## Out of scope

- Automatically retrying registration without operator action.
- Retrying registration for non-tmux transports.
- Treating confirmed agents as pending.

## Exit criteria

1. CLI-created `registrationStatus: pending` tmux agents show `Retry Self Registration` when no bootstrap blocker remains.
2. The retry action sends the Mina self-registration prompt and moves the agent to `registration-pending`.
3. The retry action remains hidden for MCP-blocked or actively permission-blocked sessions.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

Do not promote if the fix only changes UI text. The terminal API action path must accept the retry for CLI-created pending agents.

## Progress log

- Seeded from real 6-repo usage review P1: CLI-created blocked agents could clear a prompt but still had no Web UI registration retry action.
- Completed: terminal actions now use a generic pending tmux self-registration predicate, so CLI-created pending agents can retry from Web UI after blockers clear.
