# Six-repo bootstrap revalidation docs

```json taskmeta
{
  "id": "six-repo-bootstrap-revalidation-docs",
  "title": "Six-repo bootstrap revalidation docs",
  "order": 79,
  "status": "completed",
  "next_task_on_success": null,
  "prompt_docs": [
    "AGENTS.md",
    "docs/reviews/2026-07-02-real-6repo-usage-review.md"
  ],
  "required_commands": [
    "npm run test",
    "npm run smoke:http",
    "npm run smoke:docs",
    "npm run smoke:cli-controls"
  ],
  "required_files": [
    "docs/reviews/2026-07-02-real-6repo-usage-review.md",
    "docs/exec-plans/active/index.md"
  ]
}
```

## Objective

Update the review and queue documentation so the second real 6-repo follow-up has clear deterministic proof and remaining live revalidation expectations.

## Scope

- Preserve the review evidence and mark deterministic coverage added for 077-078.
- Keep real six-session revalidation as an explicit manual follow-up until it has been repeated.
- Update the active queue to show completion of 077-079 after required commands pass.

## Exit criteria

1. The review document distinguishes deterministic coverage from live six-session revalidation.
2. The exec-plan queue points to completed 077-079 history.
3. Required commands pass.

## Required checks

- `npm run test`
- `npm run smoke:http`
- `npm run smoke:docs`
- `npm run smoke:cli-controls`

## Progress log

- Seeded from the second real 6-repo follow-up revalidation checklist.
- Completed: review and queue documentation distinguish deterministic coverage from the still-required live six-session revalidation.
