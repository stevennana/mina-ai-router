# Permission state advance after approval

```json taskmeta
{
  "id": "permission-state-advance-after-approval",
  "title": "Permission state advance after approval",
  "order": 61,
  "status": "completed",
  "next_task_on_success": "guided-bootstrap-approval-loop-design",
  "prompt_docs": [
    "docs/product-specs/release-readiness-review-fixes.md",
    "docs/product-specs/agent-bootstrap-reliability.md"
  ],
  "required_commands": [
    "npm run smoke:http"
  ]
}
```

## Objective

Avoid leaving Web UI-created agents stuck in `permission-required` after the operator clears the terminal prompt.

## Exit criteria

1. Terminal capture clears stale permission state when the prompt no longer appears.
2. Sending Enter from the Web UI retries the self-registration prompt for pending UI-created agents.
3. The agent advances to `registration-pending` instead of looking available or remaining stuck.

## Progress log

- Completed: terminal capture and input paths now advance cleared permission prompts, and HTTP smoke covers the approval-to-registration-pending transition.
