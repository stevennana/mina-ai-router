# Safe Codex update skip

```json taskmeta
{
  "id": "safe-codex-update-skip",
  "title": "Safe Codex update skip",
  "order": 65,
  "status": "completed",
  "next_task_on_success": "guided-bootstrap-actions",
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-02-real-cli-webui-multi-agent-followup-review.md",
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/TROUBLESHOOTING.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "packages/transports/src/tmux/tmux-client.ts",
    "apps/http-server/src/index.ts",
    "apps/http-server/ui/src/features/TerminalPanel.tsx",
    "scripts/smoke-http.js"
  ],
  "human_review_triggers": [
    "Update prompt action still sends raw Enter",
    "Docs still tell users Enter will skip the update prompt",
    "The chosen skip sequence is not encoded in smoke coverage"
  ]
}
```

## Objective

Replace unsafe "Send Enter to skip Codex update" guidance with a prompt-specific safe skip action that sends an explicit skip choice.

## Scope

- Change Codex update prompt action text so raw Enter is not described as skip.
- Add a safe API/UI action for update prompts that sends the explicit skip choice and then retries registration only after the prompt clears.
- Extend HTTP smoke with a fixture that fails if the update path sends bare Enter instead of the explicit skip input.
- Keep manual tmux attach as the fallback for prompts Mina cannot safely classify.

## Out of scope

- Running a global Codex update.
- Supporting every possible future Codex update prompt layout without evidence.
- Full guided approval policy for trust and command prompts.

## Exit criteria

1. Update prompt guidance no longer says raw Enter skips the prompt.
2. Web UI exposes a prompt-specific "skip update for now" style action when `permissionPrompt.kind === "client-update"`.
3. The API sends an explicit skip choice for the known Codex update fixture and does not auto-run update.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

Do not promote if the only change is wording. There must be a deterministic API or UI path that avoids bare Enter for the update prompt.

## Progress log

- Seeded from follow-up review P1: raw Enter may select update instead of skip.
- Completed: Codex update guidance no longer describes raw Enter as a skip path. The Web UI/API expose `Skip Codex Update`, which sends the explicit `2` fixture input and retries registration only after the prompt clears.
