# Update skip clearance gate

```json taskmeta
{
  "id": "update-skip-clearance-gate",
  "title": "Update skip clearance gate",
  "order": 68,
  "status": "completed",
  "next_task_on_success": null,
  "prompt_docs": [
    "AGENTS.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/design-docs/agent-bootstrap-reliability.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "apps/http-server/src/index.ts",
    "scripts/smoke-http.js",
    "docs/product-specs/release-readiness-review-fixes.md"
  ],
  "human_review_triggers": [
    "skip-codex-update still sends self-registration while client-update remains visible",
    "HTTP smoke fixture does not keep the update prompt visible after receiving the skip choice",
    "Agent state leaves the operator without a retry registration path after the prompt clears"
  ]
}
```

## Objective

Prevent Mina from sending a self-registration prompt into a Codex update UI that is still visible after the guided skip action.

## Scope

- Treat `skip-codex-update` as a prompt action, not permission to immediately register.
- After sending the explicit skip choice, recapture the terminal and only send self-registration if the update prompt has cleared.
- If the update prompt is still visible, return a clear transitional response and leave the agent in `client-update-required`.
- Keep `Retry Self Registration` available once subsequent terminal polling no longer detects a bootstrap blocker.
- Extend HTTP smoke with a fixture where `2` is received but the update prompt remains visible long enough to catch premature registration.

## Out of scope

- Supporting every possible future Codex update prompt layout.
- Running a real Codex update or requiring a real Codex account in CI.
- Changing trust/permission approval semantics for non-update prompts.

## Exit criteria

1. `skip-codex-update` never sends self-registration while `detectAgentBootstrapPrompt()` still returns `client-update`.
2. HTTP smoke proves the held update prompt receives `2` but not the Mina self-registration prompt.
3. Once the update prompt clears, retry registration remains available through the existing guided self-registration path.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

Do not promote if the implementation only increases the fixed sleep delay. The regression must be tied to prompt disappearance, not elapsed time.

## Progress log

- Seeded from second follow-up review P1: `skip-codex-update` can currently send self-registration before the Codex update prompt has cleared.
- Completed: `skip-codex-update` now sends only the explicit skip choice while `client-update` is still visible, and HTTP smoke proves registration waits until prompt clearance and a retry action.
