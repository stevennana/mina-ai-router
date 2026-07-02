# Codex update prompt bootstrap blocker

```json taskmeta
{
  "id": "codex-update-prompt-bootstrap-blocker",
  "title": "Codex update prompt bootstrap blocker",
  "order": 60,
  "status": "completed",
  "next_task_on_success": "permission-state-advance-after-approval",
  "prompt_docs": [
    "docs/reviews/2026-07-02-real-cli-webui-multi-agent-review.md",
    "docs/design-docs/agent-bootstrap-reliability.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http"
  ]
}
```

## Objective

Represent Codex update prompts as a real first-run blocker instead of treating them as directory trust or ignoring them.

## Exit criteria

1. Codex update prompts are classified as `client-update` terminal evidence.
2. Agents blocked by that evidence persist `client-update-required`, `needs-attention`, and route-blocker detail.
3. Web UI terminal payloads keep `trustPrompt: false` for update prompts.

## Progress log

- Completed: tmux bootstrap prompt detection, core health classification, CLI/Web UI create-agent flows, and HTTP smoke expectations now use `client-update-required`.
