# Guided bootstrap approval loop design

```json taskmeta
{
  "id": "guided-bootstrap-approval-loop-design",
  "title": "Guided bootstrap approval loop design",
  "order": 62,
  "status": "completed",
  "next_task_on_success": "real-cli-contract-smoke",
  "prompt_docs": [
    "docs/design-docs/agent-bootstrap-reliability.md",
    "docs/TROUBLESHOOTING.md",
    "docs/USER-START-GUIDE.md"
  ],
  "required_commands": [
    "npm run smoke:docs"
  ]
}
```

## Objective

Make first-run bootstrap blockers understandable to an operator without hiding the local CLI terminal.

## Exit criteria

1. User docs explain `permission-required`, `client-update-required`, `mcp-configuring`, and `registration-pending`.
2. Design docs define update prompts as non-trust bootstrap blockers.
3. Troubleshooting gives the next action for each first-run blocker.

## Progress log

- Completed: user, troubleshooting, and design docs now describe the guided approval loop and the distinct update prompt state.
