# Capability freshness UI

```json taskmeta
{
  "id": "capability-freshness-ui",
  "title": "Capability freshness UI",
  "order": 5,
  "status": "queued",
  "next_task_on_success": "agent-health-core-api",
  "prompt_docs": [
    "AGENTS.md",
    "docs/FRONTEND.md",
    "docs/product-specs/agent-capability-refresh.md",
    "docs/design-docs/collaboration-reliability.md"
  ],
  "required_commands": [
    "npm run build",
    "npm run smoke:http",
    "npm run smoke:docs"
  ],
  "required_files": [
    "apps/http-server/ui/src/features/Inspector.tsx",
    "apps/http-server/ui/src/features/AgentDetailsForm.tsx"
  ],
  "human_review_triggers": [
    "Freshness UI is visually confusing",
    "Mobile or floating inspector layout breaks",
    "Refresh UI triggers an unsafe or ambiguous action"
  ]
}
```

## Objective

Show capability freshness in the browser console and expose a safe refresh/edit path.

## Scope

- Display missing/stale/fresh/manual states in the inspector.
- Provide a refresh affordance if the API exists from the prior task.
- Preserve manual editing through `Edit Capabilities`.
- Verify desktop and mobile layout does not overflow.

## Out of scope

- New CLI command behavior.
- Scheduled refresh.
- Team-wide capability comparison.

## Exit criteria

1. Users can tell whether an agent capability card is fresh enough to trust.
2. Manual and generated capability summaries are not visually confused.
3. Focused verification proves the relevant UI/API data is exposed and docs links remain valid.
4. UI build, HTTP smoke, and docs smoke pass.

## Required checks

- `npm run build`
- `npm run smoke:http`
- `npm run smoke:docs`

## Evaluator notes

This is a UI task. Require visual sanity in the inspector and activity layout before promotion.

## Progress log

- Queue seeded for milestone 0.2 Ralph setup.
